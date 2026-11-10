"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Upload, X, User } from "lucide-react";
import { toast } from "sonner";

const formatDate = (dateVal) => {
  if (!dateVal) return "";
  try {
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
  } catch {
    return "";
  }
};

const getInitialPhoto = (user) => {
  return user?.pendingProfileUpdate?.profilePic?.url || user?.profilePic?.url || null;
};

const getInitialFormData = (user) => {
  const p = user?.pendingProfileUpdate || {};
  const t = user?.teacherSpecificField || {};
  const a = user?.address || {};

  return {
    name: p.name || user?.name || "",
    email: p.email || user?.email || "",
    contactNumber: p.contactNumber || user?.contactNumber || user?.phone || "",
    alternativeNumber: p.alternativeNumber || user?.alternativeNumber || "",
    dateOfBirth: formatDate(p.dateOfBirth || user?.dateOfBirth),
    address: {
      houseName: p.address?.houseName || a.houseName || user?.houseName || "",
      place: p.address?.place || a.place || user?.place || "",
      locationPoint: p.address?.locationPoint || a.locationPoint || user?.locationPoint || "",
      postOffice: p.address?.postOffice || a.postOffice || user?.postOffice || "",
      district: p.address?.district || a.district || user?.district || "",
      state: p.address?.state || a.state || user?.state || "",
      pin: p.address?.pin || a.pin || user?.pin || a.pinCode || user?.pinCode || "",
    },
    teacherSpecificField: {
      dateOfJoining: formatDate(p.teacherSpecificField?.dateOfJoining || t.dateOfJoining || user?.dateOfJoining),
    },
  };
};

export default function TeacherProfileEditModal({ user, open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [fetchingUser, setFetchingUser] = useState(false);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(() => getInitialPhoto(user));
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState(() => getInitialFormData(user));

  useEffect(() => {
    if (!open) return;

    setFormData(getInitialFormData(user));
    setPreviewUrl(getInitialPhoto(user));
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    const userId = user?._id || user?.userId || user?.id;
    if (!userId) return;

    let active = true;
    setFetchingUser(true);

    fetch(`/api/users?_id=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        const fullUser =
          data?.users?.[0] ||
          (Array.isArray(data) ? data[0] : (data?.user || data));
        if (fullUser && typeof fullUser === "object") {
          setFormData(getInitialFormData(fullUser));
          const photo = getInitialPhoto(fullUser);
          if (photo) setPreviewUrl(photo);
        }
      })
      .catch((err) => {
        console.error("Error fetching full teacher profile:", err);
      })
      .finally(() => {
        if (active) setFetchingUser(false);
      });

    return () => {
      active = false;
    };
  }, [open, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 2 * 1024 * 1024) {
        toast.error("File size must be less than 2MB");
        return;
      }
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    }
  };

  const removeFile = () => {
    setFile(null);
    setPreviewUrl(getInitialPhoto(user));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const capitalizeData = (data) => {
      if (!data) return data;
      const result = Array.isArray(data) ? [] : {};
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          const value = data[key];
          if (typeof value === "object" && value !== null) {
            result[key] = capitalizeData(value);
          } else if (typeof value === "string" && key !== "email" && key !== "dateOfBirth" && key !== "dateOfJoining") {
            result[key] = value.toUpperCase();
          } else {
            result[key] = value;
          }
        }
      }
      return result;
    };

    let transformedData = capitalizeData(formData);

    try {
      let uploadedProfilePic = undefined;

      if (file) {
        const signResponse = await fetch("/api/sign-cloudinary", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "active-role": "Teacher",
          },
          body: JSON.stringify({ folder: "profiles" }),
        });

        if (!signResponse.ok) {
          throw new Error("Failed to get upload signature");
        }

        const { signature, timestamp, cloudName, apiKey: cloudApiKey, folder } = await signResponse.json();

        const uploadFormData = new FormData();
        uploadFormData.append("file", file);
        uploadFormData.append("api_key", cloudApiKey);
        uploadFormData.append("timestamp", timestamp);
        uploadFormData.append("signature", signature);
        uploadFormData.append("folder", folder);

        const uploadResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
          { method: "POST", body: uploadFormData }
        );

        if (!uploadResponse.ok) {
          throw new Error("Image upload failed");
        }

        const uploadResult = await uploadResponse.json();
        uploadedProfilePic = { url: uploadResult.secure_url, publicId: uploadResult.public_id };
      }

      if (uploadedProfilePic) {
        transformedData.profilePic = uploadedProfilePic;
      }

      const response = await fetch("/api/users/profile-request", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?._id || user?.userId || user?.id,
          pendingChanges: transformedData,
        }),
      });

      if (response.ok) {
        toast.success("Profile update request submitted for approval");
        if (onSuccess) onSuccess();
        onClose();
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to submit request");
      }
    } catch (error) {
      toast.error(error.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-4xl h-[90vh] sm:max-h-[92vh] p-0 overflow-hidden rounded-2xl shadow-2xl flex flex-col [&>button.absolute]:hidden border border-border">
        <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md shrink-0">
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 text-left space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-xl font-bold m-0 text-foreground truncate">
                Edit Profile Request
              </DialogTitle>
              {fetchingUser && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <DialogDescription className="text-sm text-muted-foreground m-0">
              Submit changes for admin approval.
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none shrink-0"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogClose>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Profile Photo Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-1 text-primary text-center">Profile Photo</h3>
            <div className="flex flex-col gap-4 items-center">
              <div className="relative w-32 h-32 border-2 border-dashed rounded-md overflow-hidden flex items-center justify-center bg-muted">
                {previewUrl ? (
                  <>
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" crossOrigin="anonymous" />
                    {file && (
                      <button
                        type="button"
                        onClick={removeFile}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Upload className="w-8 h-8 mx-auto mb-1 opacity-50" />
                    <span className="text-xs">No Photo</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 items-center">
                <div className="flex flex-col items-center gap-3">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Change Photo
                  </Button>
                  <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {file ? file.name : "No file chosen"}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">Maximum file size: 2MB</span>
              </div>
            </div>
          </div>

          {/* Personal Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-1 text-primary">Personal Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input id="dateOfBirth" name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfJoining">Date of Joining</Label>
                <Input id="dateOfJoining" name="teacherSpecificField.dateOfJoining" type="date" value={formData.teacherSpecificField.dateOfJoining} onChange={handleChange} required />
              </div>
            </div>
          </div>

          {/* Contact Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-1 text-primary">Contact Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactNumber">Contact Number</Label>
                <Input id="contactNumber" name="contactNumber" value={formData.contactNumber} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alternativeNumber">Alternative Number</Label>
                <Input id="alternativeNumber" name="alternativeNumber" value={formData.alternativeNumber} onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* Address Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-1 text-primary">Address Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="houseName">House Name</Label>
                <Input id="houseName" name="address.houseName" value={formData.address.houseName} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="place">Place</Label>
                <Input id="place" name="address.place" value={formData.address.place} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="locationPoint">Location Point</Label>
                <Input id="locationPoint" name="address.locationPoint" value={formData.address.locationPoint} onChange={handleChange} placeholder="e.g., Near Mosque" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postOffice">Post Office</Label>
                <Input id="postOffice" name="address.postOffice" value={formData.address.postOffice} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="district">District</Label>
                <Input id="district" name="address.district" value={formData.address.district} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" name="address.state" value={formData.address.state} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pin">PIN Code</Label>
                <Input id="pin" name="address.pin" value={formData.address.pin} onChange={handleChange} maxLength={6} />
              </div>
              {/* Cancel and Submit button opposite of PIN Code on desktop */}
              <div className="flex items-end justify-end gap-3 pt-2 md:pt-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="border border-input hover:bg-muted font-medium"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Submit Request
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
