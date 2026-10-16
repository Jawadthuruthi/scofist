"use client";

import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { toast } from "sonner";

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
  }, [achieverToEdit, isOpen]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5MB");
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setFilePreview(objectUrl);
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setFilePreview("");
    setFormData((prev) => ({ ...prev, photoUrl: "", photoPublicId: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Please enter the achiever's name");
      return;
    }
    if (!formData.rank.trim()) {
      toast.error("Please enter the rank (e.g. 1st Rank, 1)");
      return;
    }
    if (!formData.year.trim()) {
      toast.error("Please enter the academic year");
      return;
    }
    if (!formData.course.trim()) {
      toast.error("Please enter the course name");
      return;
    }
    if (!formData.college.trim()) {
      toast.error("Please enter the college or university name");
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
        const uploadData = new FormData();
        uploadData.append("file", selectedFile);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: uploadData,
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload photo to server");
        }

        const uploadJson = await uploadRes.json();
        finalPhoto = {
          url: uploadJson.secure_url,
          publicId: uploadJson.public_id,
        };
      }

      const payload = {
        name: formData.name.trim(),
        rank: formData.rank.trim(),
        year: formData.year.trim(),
        course: formData.course.trim(),
        college: formData.college.trim(),
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
        throw new Error(resJson.message || "Failed to save rank achiever");
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
                  Enter the details and photo of the rank holder
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
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Achiever Photo</span>
              <span className="text-[11px] text-muted-foreground font-normal">
                (JPG, PNG, WebP)
              </span>
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

              <div className="flex-1 space-y-1.5">
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
                  Recommend clear headshot / passport size
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

          {/* Rank & Year (2 Columns) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Award className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Rank *</span>
              </label>
              <Input
                required
                placeholder="e.g. 1st Rank or 1"
                value={formData.rank}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, rank: e.target.value }))
                }
                className="h-9 text-xs"
              />
            </div>

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
              <span>College / University *</span>
            </label>
            <Input
              required
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
  );
}
