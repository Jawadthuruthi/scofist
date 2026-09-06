import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const GallerySchema = new Schema(
  {
    title: {
      type: String,
      trim: true,
      default: "",
    },
    caption: {
      type: String,
      trim: true,
      default: "",
    },
    type: {
      type: String,
      enum: ["image", "video"],
      required: true,
      default: "image",
    },
    // For images: Cloudinary URL
    // For videos: Original shared video link (YouTube, Instagram, Facebook, etc.)
    url: {
      type: String,
      required: true,
      trim: true,
    },
    // Cloudinary public ID for images (used for deletion)
    publicId: {
      type: String,
      default: "",
    },
    // Platform for videos
    platform: {
      type: String,
      enum: ["youtube", "instagram", "facebook", "vimeo", "other"],
      default: "other",
    },
    // Embeddable URL (iframe src)
    embedUrl: {
      type: String,
      default: "",
    },
    // Thumbnail image URL (auto-fetched for YouTube or user provided)
    thumbnailUrl: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      trim: true,
      default: "General",
      index: true,
    },
    year: {
      type: String,
      required: true,
      index: true,
      default: "2026",
    },
    order: {
      type: Number,
      default: 0,
    },
    uploadedBy: {
      type: String,
      default: "Program Committee",
    },
  },
  { timestamps: true }
);

// Compound index for year + type + createdAt
GallerySchema.index({ year: 1, type: 1, createdAt: -1 });

const Gallery = models.Gallery || model("Gallery", GallerySchema);

export default Gallery;
