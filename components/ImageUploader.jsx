"use client";
import * as React from "react";
import { Image, Loader, Upload, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

// Extract the public ID from a Cloudinary URL
const getPublicIdFromUrl = (url) => {
  if (!url || !url.includes("cloudinary.com")) return null;

  try {
    // Parse URL to extract the public ID
    const urlParts = url.split("/");
    const uploadIndex = urlParts.findIndex((part) => part === "upload");

    if (uploadIndex !== -1 && urlParts.length > uploadIndex + 2) {
      // Extract folder and filename
      const publicIdParts = urlParts.slice(uploadIndex + 1);
      // Remove file extension and transformation parameters
      const publicId = publicIdParts.join("/").split(".")[0].split("?")[0];
      return publicId;
    }
  } catch (error) {
    console.error("Error extracting public ID:", error);
  }

  return null;
};

function parseAspectRatio(aspectRatioStr) {
  const [w, h] = aspectRatioStr.split(":").map(Number);
  return w / h;
}

// File validation configurations
const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const DEFAULT_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif"];

const ImageUploader = ({
  value,
  onChange,
  disabled,
  apiKey,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  aspectRatio = null,
  minWidth = null,
  minHeight = null,
  maxWidth = null,
  maxHeight = null,
}) => {
  const [preview, setPreview] = React.useState(value?.url || "");
  const [loading, setLoading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [publicId, setPublicId] = React.useState(
    value?.publicId || getPublicIdFromUrl(value?.url) || null
  );
  const [selectedFile, setSelectedFile] = React.useState(null);
  const [localPreview, setLocalPreview] = React.useState(null);
  const fileInputRef = React.useRef(null);
  const progressIntervalRef = React.useRef(null);

  // Update publicId when value changes (for edit mode)
  React.useEffect(() => {
    if (value?.url && value?.url !== preview) {
      setPreview(value?.url);
      setPublicId(
        value?.publicId ? valid?.publicId : getPublicIdFromUrl(value?.url)
      );
    }
  }, [value?.url]);

  // Cleanup progress interval on unmount
  React.useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const validateFile = (file) => {
    // Check file size
    if (file.size > maxFileSize) {
      return {
        valid: false,
        error: `File size exceeds ${(maxFileSize / (1024 * 1024)).toFixed(
          1
        )}MB limit`,
      };
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type not supported. Please upload ${allowedTypes
          .map((type) => type.split("/")[1])
          .join(", ")}`,
      };
    }

    return { valid: true };
  };

  const validateImageDimensions = (img) => {
    return new Promise((resolve) => {
      const image = new window.Image();
      image.onload = () => {
        const issues = [];

        if (minWidth && image.width < minWidth) {
          issues.push(`Image width must be at least ${minWidth}px`);
        }

        if (minHeight && image.height < minHeight) {
          issues.push(`Image height must be at least ${minHeight}px`);
        }

        if (maxWidth && image.width > maxWidth) {
          issues.push(`Image width cannot exceed ${maxWidth}px`);
        }

        if (maxHeight && image.height > maxHeight) {
          issues.push(`Image height cannot exceed ${maxHeight}px`);
        }

        if (aspectRatio) {
          const [w, h] = aspectRatio.split(":").map(Number);
          const targetRatio = w / h;
          const currentRatio = image.width / image.height;
          const tolerance = 0.1;

          if (Math.abs(currentRatio - targetRatio) > tolerance) {
            issues.push(`Image aspect ratio should be approximately ${w}:${h}`);
          }
        }

        if (issues.length > 0) {
          resolve({ valid: false, error: issues.join(", ") });
        } else {
          resolve({ valid: true });
        }

        // Clean up object URL
        URL.revokeObjectURL(image.src);
      };

      image.onerror = () => {
        resolve({ valid: false, error: "Failed to load image for validation" });
        // Clean up object URL
        URL.revokeObjectURL(image.src);
      };

      image.src = URL.createObjectURL(img);
    });
  };

  const simulateUploadProgress = () => {
    setUploadProgress(0);
    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = setInterval(() => {
      setUploadProgress((prev) => {
        const increment = Math.random() * 10;
        const newProgress = Math.min(prev + increment, 90); // Cap at 90% until upload completes
        return newProgress;
      });
    }, 300);
  };

  const uploadToCloudinary = async (base64Image) => {
    try {
      setLoading(true);
      simulateUploadProgress();

      const response = await fetch("/api/cloudinary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({ image: base64Image }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload image");
      }

      const data = await response.json();

      // Set progress to 100% when complete
      setUploadProgress(100);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }

      // Reset progress after a short delay
      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);

      return data;
    } catch (error) {
      toast.error(error.message || "Error uploading image");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteFromCloudinary = async (publicId) => {
    try {
      setLoading(true);
      const response = await fetch("/api/cloudinary", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({ publicId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete image");
      }

      return await response.json();
    } catch (error) {
      toast.error(error.message || "Error deleting image");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Validate file type and size first
      const fileValidation = validateFile(file);
      if (!fileValidation.valid) {
        toast.error(fileValidation.error);
        return;
      }

      // Validate image dimensions if specified
      if (aspectRatio || minWidth || minHeight || maxWidth || maxHeight) {
        const dimensionValidation = await validateImageDimensions(file);
        if (!dimensionValidation.valid) {
          toast.error(dimensionValidation.error);
          return;
        }
      }

      // Store the file for later upload
      setSelectedFile(file);

      // Create local preview
      const objectUrl = URL.createObjectURL(file);
      setLocalPreview(objectUrl);

      // Clean up the object URL when we no longer need it
      return () => URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Failed to process image");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select an image first");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          // Upload to Cloudinary
          const result = await uploadToCloudinary(reader.result);

          // Update with Cloudinary URL
          setPreview(result.url);
          setPublicId(result.publicId);
          onChange({ url: result.url, publicId: result.publicId });

          // Clear the selected file and local preview
          setSelectedFile(null);
          setLocalPreview(null);

          toast.success("Image uploaded successfully!");
        } catch (error) {
          console.error("Upload failed:", error);
        }
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      console.error("Error reading file:", error);
      toast.error("Failed to read image file");
    }
  };

  const handleRemoveImage = async () => {
    // If there's only a local preview, just clear it
    if (localPreview && !publicId) {
      setLocalPreview(null);
      setSelectedFile(null);
      return;
    }

    // If there's a cloudinary image to delete
    if (publicId) {
      try {
        await deleteFromCloudinary(publicId);
        setPreview("");
        setPublicId(null);
        onChange({ url: "", publicId: null });
        toast.success("Image removed successfully!");
      } catch (error) {
        console.error("Error removing image:", error);
      }
    } else {
      setPreview("");
      onChange("");
    }
  };

  const handleSelectClick = () => {
    if (!disabled && !loading) {
      fileInputRef.current.click();
    }
  };

  const displayedImage = localPreview || preview;

  // Generate constraint message
  const getConstraintMessage = () => {
    const constraints = [];

    if (maxFileSize) {
      constraints.push(
        `Max size: ${(maxFileSize / (1024 * 1024)).toFixed(1)}MB`
      );
    }

    if (allowedTypes && allowedTypes.length > 0) {
      const types = allowedTypes
        .map((type) => type.split("/")[1].toUpperCase())
        .join(", ");
      constraints.push(`Formats: ${types}`);
    }

    if (minWidth && minHeight) {
      constraints.push(`Min dimensions: ${minWidth}×${minHeight}px`);
    } else if (minWidth) {
      constraints.push(`Min width: ${minWidth}px`);
    } else if (minHeight) {
      constraints.push(`Min height: ${minHeight}px`);
    }

    if (maxWidth && maxHeight) {
      constraints.push(`Max dimensions: ${maxWidth}×${maxHeight}px`);
    } else if (maxWidth) {
      constraints.push(`Max width: ${maxWidth}px`);
    } else if (maxHeight) {
      constraints.push(`Max height: ${maxHeight}px`);
    }

    if (aspectRatio) {
      constraints.push(
        `Aspect ratio: ${aspectRatio === 1 ? "1:1" : aspectRatio}`
      );
    }

    return constraints.join(" • ");
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept={allowedTypes.join(",")}
        className="hidden"
        disabled={disabled || loading}
      />

      <div
        className={`w-full h-48 border-2 border-dashed rounded-md flex flex-col items-center justify-center relative ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        } transition-colors`}
      >
        {loading && (
          <div className="absolute inset-0 backdrop-blur-md bg-white/50 border border-white/30 shadow-lg flex flex-col items-center justify-center z-10">
            <Loader className="animate-spin text-primary mb-4" size={32} />

            {uploadProgress > 0 && (
              <div className="w-2/3 flex flex-col items-center">
                <Progress value={uploadProgress} className="h-2 w-full mb-2" />
                <span className="text-xs text-gray-800 font-medium drop-shadow-sm">
                  {Math.round(uploadProgress)}%
                </span>
              </div>
            )}
          </div>
        )}

        {displayedImage ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={displayedImage}
              alt="Image preview"
              className="max-h-full max-w-full object-contain"
            />

            {!disabled && !loading && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveImage();
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          <div onClick={handleSelectClick} className="text-center p-4">
            <Image className="h-10 w-10 text-gray-400 mb-2 mx-auto" />
            <p className="text-sm text-gray-500">Click to select an image</p>
            <p className="text-xs text-gray-400 mt-1">
              {getConstraintMessage()}
            </p>
          </div>
        )}
      </div>

      {/* Upload and Change Image buttons */}
      <div className="flex gap-2 w-full">
        {selectedFile && !loading && (
          <Button
            type="button"
            className="flex-1"
            onClick={handleUpload}
            disabled={disabled}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Image
          </Button>
        )}

        {displayedImage && !selectedFile && !loading && (
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={handleSelectClick}
            disabled={disabled}
          >
            <Image className="h-4 w-4 mr-2" />
            Change Image
          </Button>
        )}

        {!displayedImage && !selectedFile && (
          <Button
            type="button"
            className="flex-1"
            onClick={handleSelectClick}
            disabled={disabled}
          >
            <Image className="h-4 w-4 mr-2" />
            Select Image
          </Button>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;
