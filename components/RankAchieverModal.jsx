"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Trophy,
  UploadCloud,
  X,
  Loader2,
  GraduationCap,
  Building2,
  Calendar,
  User,
  Award,
  RotateCw,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useDownloadPopup } from "@/hooks/useDownloadPopup";

// Helper to compress image client-side to ensure fast uploads & prevent payload limits/timeouts
const compressImageForUpload = (file, maxDim = 1200, quality = 0.85) => {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith("image/") || file.size < 100 * 1024) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob && blob.size < file.size) {
                const compressedFile = new File(
                  [blob],
                  file.name.replace(/\.[^.]+$/, ".jpg"),
                  {
                    type: "image/jpeg",
                    lastModified: Date.now(),
                  }
                );
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            quality
          );
        } catch {
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
      img.src = event.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

export default function RankAchieverModal({
  isOpen,
  onClose,
  achieverToEdit = null,
  onSuccess,
  availableCourses = [],
  apiKey = "",
}) {
  const [formData, setFormData] = useState({
    name: "",
    rank: "",
    year: new Date().getFullYear().toString(),
    course: "",
    college: "",
    photoUrl: "",
    photoPublicId: "",
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Image Cropper States (Same as other pages photo upload)
  const [cropImageSrc, setCropImageSrc] = useState("");
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [originalFile, setOriginalFile] = useState(null);
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, w: 200, h: 200 });
  const [dragMode, setDragMode] = useState(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const startBox = useRef({ x: 0, y: 0, w: 200, h: 200 });
  const [renderedDims, setRenderedDims] = useState({ width: 0, height: 0 });
  const cropImgRef = useRef(null);
  const cropPopupRef = useRef(null);
  const { handleDownload: handleCropDownload } = useDownloadPopup(
    cropPopupRef,
    "Crop_Achiever_Photo.jpeg"
  );

  useEffect(() => {
    if (achieverToEdit) {
      setFormData({
        name: achieverToEdit.name || "",
        rank: achieverToEdit.rank || "",
        year: achieverToEdit.year || new Date().getFullYear().toString(),
        course: achieverToEdit.course || "",
        college: achieverToEdit.college || "",
        photoUrl: achieverToEdit.photo?.url || "",
        photoPublicId: achieverToEdit.photo?.publicId || "",
      });
      setFilePreview(achieverToEdit.photo?.url || "");
    } else {
      setFormData({
        name: "",
        rank: "",
        year: new Date().getFullYear().toString(),
        course: "",
        college: "",
        photoUrl: "",
        photoPublicId: "",
      });
      setFilePreview("");
    }
    setSelectedFile(null);
    setIsCropOpen(false);
    setCropImageSrc("");
    setOriginalFile(null);
  }, [achieverToEdit, isOpen]);

  // Cropper interaction handlers
  const handleCropImageLoad = (e) => {
    const img = e.currentTarget;
    const rw = img.width;
    const rh = img.height;
    setRenderedDims({ width: rw, height: rh });

    const w = rw * 0.8;
    const h = rh * 0.8;

    setCropBox({
      x: (rw - w) / 2,
      y: (rh - h) / 2,
      w: w,
      h: h,
    });
  };

  const handleDragStart = (e, mode) => {
    e.preventDefault();
    e.stopPropagation();

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    setDragMode(mode);
    dragStart.current = { x: clientX, y: clientY };
    startBox.current = { ...cropBox };
  };

  const handleDragMove = useCallback(
    (e) => {
      if (!dragMode) return;
      if (e.cancelable) e.preventDefault();

      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);

      const dx = clientX - dragStart.current.x;
      const dy = clientY - dragStart.current.y;

      const { width: rw, height: rh } = renderedDims;

      if (dragMode === "move") {
        const newX = Math.max(0, Math.min(startBox.current.x + dx, rw - startBox.current.w));
        const newY = Math.max(0, Math.min(startBox.current.y + dy, rh - startBox.current.h));
        setCropBox((prev) => ({ ...prev, x: newX, y: newY }));
      } else {
        let newX = startBox.current.x;
        let newY = startBox.current.y;
        let newW = startBox.current.w;
        let newH = startBox.current.h;

        if (dragMode.includes("s")) {
          newH = Math.max(50, startBox.current.h + dy);
        } else if (dragMode.includes("n")) {
          newY = Math.min(startBox.current.y + dy, startBox.current.y + startBox.current.h - 50);
          newH = startBox.current.y + startBox.current.h - newY;
        }

        if (dragMode.includes("e")) {
          newW = Math.max(50, startBox.current.w + dx);
        } else if (dragMode.includes("w")) {
          newX = Math.min(startBox.current.x + dx, startBox.current.x + startBox.current.w - 50);
          newW = startBox.current.x + startBox.current.w - newX;
        }

        if (newX < 0) {
          newW += newX;
          newX = 0;
        }
        if (newY < 0) {
          newH += newY;
          newY = 0;
        }
        if (newX + newW > rw) newW = rw - newX;
        if (newY + newH > rh) newH = rh - newY;

        setCropBox({ x: newX, y: newY, w: newW, h: newH });
      }
    },
    [dragMode, renderedDims]
  );

  const handleDragEnd = useCallback(() => {
    setDragMode(null);
  }, []);

  useEffect(() => {
    if (dragMode) {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
      window.addEventListener("touchmove", handleDragMove, { passive: false });
      window.addEventListener("touchend", handleDragEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleDragMove);
      window.removeEventListener("touchend", handleDragEnd);
    };
  }, [dragMode, handleDragMove, handleDragEnd]);

  const handleRotate = () => {
    if (!cropImageSrc) return;

    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext("2d");

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      const rotatedData = canvas.toDataURL(originalFile?.type || "image/jpeg");
      setCropImageSrc(rotatedData);
    };
    img.src = cropImageSrc;
  };

  const handleCropSave = () => {
    if (!cropImageSrc || !originalFile) return;

    const img = new window.Image();
    img.onload = () => {
      const scaleX = img.width / renderedDims.width;
      const scaleY = img.height / renderedDims.height;

      const sourceX = cropBox.x * scaleX;
      const sourceY = cropBox.y * scaleY;
      const sourceWidth = cropBox.w * scaleX;
      const sourceHeight = cropBox.h * scaleY;

      let targetWidth = sourceWidth;
      let targetHeight = sourceHeight;

      const maxDim = 4000;
      if (targetWidth > maxDim || targetHeight > maxDim) {
        if (targetWidth > targetHeight) {
          targetHeight = maxDim * (targetHeight / targetWidth);
          targetWidth = maxDim;
        } else {
          targetWidth = maxDim * (targetWidth / targetHeight);
          targetHeight = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");

      if (originalFile.type === "image/jpeg" || originalFile.type === "image/jpg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, targetWidth, targetHeight);
      }

      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        targetWidth,
        targetHeight
      );

      canvas.toBlob((blob) => {
        if (blob) {
          const croppedFile = new File([blob], originalFile.name, {
            type: originalFile.type || "image/jpeg",
            lastModified: Date.now(),
          });

          setSelectedFile(croppedFile);
          const objectUrl = URL.createObjectURL(croppedFile);
          setFilePreview(objectUrl);
          setIsCropOpen(false);
          toast.success("Image cropped successfully!");
        }
      }, originalFile.type || "image/jpeg");
    };
    img.src = cropImageSrc;
  };

  const handleSkipCrop = () => {
    if (!originalFile) return;
    setSelectedFile(originalFile);
    const objectUrl = URL.createObjectURL(originalFile);
    setFilePreview(objectUrl);
    setIsCropOpen(false);
    toast.success("Using original exact image!");
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file size must be less than 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setCropImageSrc(reader.result);
      setOriginalFile(file);
      setRenderedDims({ width: 0, height: 0 });
      setIsCropOpen(true);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setFilePreview("");
    setFormData((prev) => ({ ...prev, photoUrl: "", photoPublicId: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadAchieverPhoto = async (fileToUpload) => {
    const file = await compressImageForUpload(fileToUpload);

    // 1. First priority: Direct signed Cloudinary upload (fastest, bypasses server payload/timeout limits)
    try {
      const signHeaders = {
        "Content-Type": "application/json",
        ...(apiKey ? { "api-key": apiKey, "x-api-key": apiKey } : {}),
      };

      const signRes = await fetch("/api/sign-cloudinary", {
        method: "POST",
        headers: signHeaders,
        body: JSON.stringify({ folder: "profiles" }),
      });

      if (signRes.ok) {
        const signData = await signRes.json();
        if (signData.signature && signData.cloudName) {
          const directFormData = new FormData();
          directFormData.append("file", file);
          directFormData.append("api_key", signData.apiKey);
          directFormData.append("timestamp", signData.timestamp);
          directFormData.append("signature", signData.signature);
          directFormData.append("folder", signData.folder || "profiles");

          const directRes = await fetch(
            `https://api.cloudinary.com/v1_1/${signData.cloudName}/auto/upload`,
            {
              method: "POST",
              body: directFormData,
            }
          );

          if (directRes.ok) {
            const directJson = await directRes.json();
            return {
              url: directJson.secure_url,
              publicId: directJson.public_id,
            };
          }
        }
      }
    } catch (directErr) {
      console.warn("Direct signed upload failed, falling back to server upload:", directErr);
    }

    // 2. Fallback: Server-side route handler (/api/upload)
    const uploadData = new FormData();
    uploadData.append("file", file);

    const uploadHeaders = {};
    if (apiKey) {
      uploadHeaders["api-key"] = apiKey;
      uploadHeaders["x-api-key"] = apiKey;
    }

    let uploadRes;
    try {
      uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: uploadHeaders,
        body: uploadData,
      });
    } catch (fetchErr) {
      console.error("Network error during /api/upload:", fetchErr);
      throw new Error("Network error during photo upload. Please check your internet connection.");
    }

    if (!uploadRes.ok) {
      let errorMsg = "Failed to upload photo to server";
      try {
        const errJson = await uploadRes.json();
        errorMsg = errJson.message || errJson.error || errorMsg;
      } catch {
        // Ignored
      }
      throw new Error(errorMsg);
    }

    const uploadJson = await uploadRes.json();
    return {
      url: uploadJson.secure_url,
      publicId: uploadJson.public_id,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Please enter the achiever's name");
      return;
    }
    if (!formData.year.trim()) {
      toast.error("Please enter the year");
      return;
    }
    if (!formData.course.trim()) {
      toast.error("Please enter the course name");
      return;
    }

    try {
      setIsUploading(true);

      let finalPhoto = {
        url: formData.photoUrl,
        publicId: formData.photoPublicId,
      };

      // Upload file if new file selected
      if (selectedFile) {
        finalPhoto = await uploadAchieverPhoto(selectedFile);
      }

      const payload = {
        name: formData.name.trim(),
        year: formData.year.trim(),
        course: formData.course.trim(),
        rank: formData.rank?.trim() || "",
        college: formData.college?.trim() || "",
        photo: finalPhoto,
      };

      const authHeaders = {
        "Content-Type": "application/json",
        ...(apiKey ? { "x-api-key": apiKey } : {}),
      };

      let res;
      if (achieverToEdit) {
        res = await fetch("/api/rank-achievers", {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify({ ...payload, id: achieverToEdit._id }),
        });
      } else {
        res = await fetch("/api/rank-achievers", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(payload),
        });
      }

      const resJson = await res.json();
      if (!res.ok || !resJson.success) {
        throw new Error(resJson.error || resJson.message || "Failed to save rank achiever");
      }

      toast.success(
        achieverToEdit
          ? "Rank achiever updated successfully"
          : "Rank achiever added successfully"
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Error submitting rank achiever:", err);
      toast.error(err.message || "An error occurred while saving");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto p-0 [&>button.absolute]:hidden">
          <DialogHeader className="p-4 sm:p-5 pb-3 sm:pb-4 border-b">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                  <Trophy className="h-5 w-5" />
                </div>
                <div className="min-w-0 text-left">
                  <DialogTitle className="text-base sm:text-lg font-bold leading-tight">
                    {achieverToEdit ? "Edit Rank Achiever" : "Add Rank Achiever"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Details of the rank holder
                  </DialogDescription>
                </div>
              </div>

              <DialogClose
                className="p-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none shrink-0"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </DialogClose>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Photo Upload Section */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                Achiever Photo
              </label>

              <div className="flex items-center gap-4">
                <div className="relative w-20 h-24 rounded-lg overflow-hidden border-2 border-dashed border-border bg-muted/40 shrink-0 flex items-center justify-center">
                  {filePreview ? (
                    <>
                      <Image
                        src={filePreview}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                        title="Remove Photo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <Trophy className="h-8 w-8 text-muted-foreground/40" />
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="rank-photo-input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-xs gap-1.5 h-8"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadCloud className="h-3.5 w-3.5" />
                    <span>{filePreview ? "Change Photo" : "Upload Photo"}</span>
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    JPG, PNG, WebP
                  </p>
                </div>
              </div>
            </div>

            {/* Name Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Full Name *</span>
              </label>
              <Input
                required
                placeholder="e.g. Muhammed Rashid"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="h-9 text-xs"
              />
            </div>

            {/* Year & Rank (Year compulsory, Rank optional after Year) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Year *</span>
                </label>
                <Input
                  required
                  placeholder="e.g. 2024"
                  value={formData.year}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, year: e.target.value }))
                  }
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Award className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Rank</span>
                </label>
                <Input
                  placeholder="e.g. 1st Rank or 1"
                  value={formData.rank}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, rank: e.target.value }))
                  }
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Course Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Course *</span>
              </label>
              <Input
                required
                list="courses-datalist"
                placeholder="e.g. Afzal-ul-Ulama, B.A. Arabic, B.Com"
                value={formData.course}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, course: e.target.value }))
                }
                className="h-9 text-xs"
              />
              {availableCourses.length > 0 && (
                <datalist id="courses-datalist">
                  {availableCourses.map((c, i) => (
                    <option key={i} value={typeof c === "string" ? c : c.name} />
                  ))}
                </datalist>
              )}
            </div>

            {/* College / University Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span>College / University</span>
              </label>
              <Input
                placeholder="e.g. Sa-adiya Arts & Science College / Calicut University"
                value={formData.college}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, college: e.target.value }))
                }
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2 sm:justify-end gap-2 border-t mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isUploading}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isUploading}
                className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>
                    {achieverToEdit ? "Update Achiever" : "Add Achiever"}
                  </span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Premium Image Cropper Modal (Same as other pages photo upload) */}
      <Dialog open={isCropOpen} onOpenChange={setIsCropOpen}>
        <DialogContent
          ref={cropPopupRef}
          data-html2canvas-popup="true"
          className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-2xl max-h-[90dvh] flex flex-col [&>button.absolute]:hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl z-[70]"
        >
          <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-blue-500/10 dark:bg-blue-500/20 sticky top-0 z-20 shrink-0">
            <button
              type="button"
              className="p-2 rounded-lg bg-blue-500/20 dark:bg-blue-500/30 shrink-0 hover:bg-blue-500/30 dark:hover:bg-blue-500/40 transition-colors focus:outline-none cursor-pointer"
              onClick={handleCropDownload}
              title="Download Image"
              data-html2canvas-ignore="true"
            >
              <ImageIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </button>
            <div className="flex-1 text-left space-y-0.5">
              <DialogTitle className="text-xl font-bold m-0 text-foreground">
                Crop Profile Photo
              </DialogTitle>
              <DialogDescription asChild>
                <div className="text-sm text-muted-foreground m-0">
                  Drag inside the box to crop image.
                </div>
              </DialogDescription>
            </div>
            <div className="flex items-center gap-1 sm:gap-2" data-html2canvas-ignore="true">
              <DialogClose asChild>
                <button
                  type="button"
                  className="p-1.5 -mr-1.5 ml-1 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none"
                >
                  <X className="h-5 w-5" />
                </button>
              </DialogClose>
            </div>
          </DialogHeader>

          <div className="p-5 overflow-y-auto flex-1 min-h-0 !shrink">
            <div className="flex flex-col items-center justify-center p-2 bg-zinc-50/50 dark:bg-zinc-950/50 rounded-lg border border-zinc-100 dark:border-zinc-800/80 mb-4 relative overflow-hidden">
              {cropImageSrc ? (
                <div className="relative max-w-full max-h-[350px] overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 select-none">
                  <div
                    className="relative inline-block overflow-hidden"
                    style={{
                      width: renderedDims.width || "auto",
                      height: renderedDims.height || "auto",
                    }}
                  >
                    <img
                      ref={cropImgRef}
                      src={cropImageSrc}
                      alt="Crop source"
                      onLoad={handleCropImageLoad}
                      className="max-w-full max-h-[350px] block select-none pointer-events-none"
                      draggable={false}
                    />

                    {/* Dark overlay mask outside cropbox */}
                    <div
                      className="absolute border border-white/90 cursor-move select-none shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] rounded-lg"
                      style={{
                        left: `${cropBox.x}px`,
                        top: `${cropBox.y}px`,
                        width: `${cropBox.w}px`,
                        height: `${cropBox.h}px`,
                      }}
                      onMouseDown={(e) => handleDragStart(e, "move")}
                      onTouchStart={(e) => handleDragStart(e, "move")}
                    >
                      {/* 3x3 dashed grid guidelines inside cropbox */}
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                        <div className="border-r border-dashed border-white/40 border-b border-white/40" />
                        <div className="border-r border-dashed border-white/40 border-b border-white/40" />
                        <div className="border-dashed border-white/40 border-b border-white/40" />
                        <div className="border-r border-dashed border-white/40 border-b border-white/40" />
                        <div className="border-r border-dashed border-white/40 border-b border-white/40" />
                        <div className="border-dashed border-white/40 border-b border-white/40" />
                        <div className="border-r border-dashed border-white/40" />
                        <div className="border-r border-dashed border-white/40" />
                        <div />
                      </div>

                      {/* 4 Side resizing handles */}
                      {/* Top Side (N) */}
                      <div
                        className="absolute -top-[6px] left-0 right-0 h-[12px] cursor-ns-resize z-10 flex items-center justify-center"
                        onMouseDown={(e) => handleDragStart(e, "n")}
                        onTouchStart={(e) => handleDragStart(e, "n")}
                      >
                        <div className="w-8 h-1 bg-white border border-zinc-400 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.3)] pointer-events-none" />
                      </div>
                      {/* Bottom Side (S) */}
                      <div
                        className="absolute -bottom-[6px] left-0 right-0 h-[12px] cursor-ns-resize z-10 flex items-center justify-center"
                        onMouseDown={(e) => handleDragStart(e, "s")}
                        onTouchStart={(e) => handleDragStart(e, "s")}
                      >
                        <div className="w-8 h-1 bg-white border border-zinc-400 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.3)] pointer-events-none" />
                      </div>
                      {/* Left Side (W) */}
                      <div
                        className="absolute -left-[6px] top-0 bottom-0 w-[12px] cursor-ew-resize z-10 flex items-center justify-center"
                        onMouseDown={(e) => handleDragStart(e, "w")}
                        onTouchStart={(e) => handleDragStart(e, "w")}
                      >
                        <div className="w-1 h-8 bg-white border border-zinc-400 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.3)] pointer-events-none" />
                      </div>
                      {/* Right Side (E) */}
                      <div
                        className="absolute -right-[6px] top-0 bottom-0 w-[12px] cursor-ew-resize z-10 flex items-center justify-center"
                        onMouseDown={(e) => handleDragStart(e, "e")}
                        onTouchStart={(e) => handleDragStart(e, "e")}
                      >
                        <div className="w-1 h-8 bg-white border border-zinc-400 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.3)] pointer-events-none" />
                      </div>

                      {/* Corner handles */}
                      <div
                        className="absolute -top-[6px] -left-[6px] w-[12px] h-[12px] cursor-nwse-resize z-20 bg-white border border-zinc-400 rounded-full shadow-sm"
                        onMouseDown={(e) => handleDragStart(e, "nw")}
                        onTouchStart={(e) => handleDragStart(e, "nw")}
                      />
                      <div
                        className="absolute -top-[6px] -right-[6px] w-[12px] h-[12px] cursor-nesw-resize z-20 bg-white border border-zinc-400 rounded-full shadow-sm"
                        onMouseDown={(e) => handleDragStart(e, "ne")}
                        onTouchStart={(e) => handleDragStart(e, "ne")}
                      />
                      <div
                        className="absolute -bottom-[6px] -left-[6px] w-[12px] h-[12px] cursor-nesw-resize z-20 bg-white border border-zinc-400 rounded-full shadow-sm"
                        onMouseDown={(e) => handleDragStart(e, "sw")}
                        onTouchStart={(e) => handleDragStart(e, "sw")}
                      />
                      <div
                        className="absolute -bottom-[6px] -right-[6px] w-[12px] h-[12px] cursor-nwse-resize z-20 bg-white border border-zinc-400 rounded-full shadow-sm"
                        onMouseDown={(e) => handleDragStart(e, "se")}
                        onTouchStart={(e) => handleDragStart(e, "se")}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="animate-spin text-zinc-400" />
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-row justify-end flex-wrap gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCropOpen(false)}
                className="text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleSkipCrop}
                className="text-zinc-800 hover:bg-zinc-200 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                Skip
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleRotate}
                className="border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center gap-1"
              >
                <RotateCw className="h-4 w-4" />
                Rotate
              </Button>
              <Button
                type="button"
                onClick={handleCropSave}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-500/10"
              >
                Apply
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
