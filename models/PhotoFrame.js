import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const PhotoFrameSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
      default: "Frame",
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    publicId: {
      type: String,
      required: true,
      trim: true,
    },
    uploadedBy: {
      type: String,
      default: "Program Committee",
    },
  },
  { timestamps: true }
);

const PhotoFrame = models.PhotoFrame || model("PhotoFrame", PhotoFrameSchema);

export default PhotoFrame;
