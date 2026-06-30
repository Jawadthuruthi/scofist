"use client";

import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Upload, X } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

export default function TeacherProfileEditModal({ user, open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(user?.profilePic?.url || null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    contactNumber: user?.contactNumber || "",
    alternativeNumber: user?.alternativeNumber || "",
    dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split("T")[0] : "",
    address: {
      houseName: user?.address?.houseName || user?.houseName || "",
      place: user?.address?.place || user?.place || "",
      locationPoint: user?.address?.locationPoint || user?.locationPoint || "",
      postOffice: user?.address?.postOffice || user?.postOffice || "",
      district: user?.address?.district || user?.district || "",
      state: user?.address?.state || user?.state || "",
      pin: user?.address?.pin || user?.pin || "",
    },
    teacherSpecificField: {
      dateOfJoining: user?.teacherSpecificField?.dateOfJoining ? new Date(user.teacherSpecificField.dateOfJoining).toISOString().split("T")[0] : "",
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
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
    setPreviewUrl(user?.profilePic?.url || null);
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
          userId: user._id,
          pendingChanges: transformedData
        })
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            Edit Profile Request
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8 py-4">
          
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
            </div>
          </div>

          <DialogFooter className="pt-6">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
