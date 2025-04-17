// models/Settings.js
import { Schema, model, models } from "mongoose";

const SettingsSchema = new Schema(
  {
    // Institution Identity
    institution: {
      name: { type: String, required: true, trim: true },
      shortName: { type: String, trim: true },
      tagline: { type: String, trim: true },
      establishedYear: { type: Number },
      address: {
        line1: { type: String, trim: true },
        line2: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        pinCode: { type: String, trim: true },
        country: { type: String, trim: true, default: "India" },
      },
      contact: {
        primaryPhone: { type: String, trim: true },
        secondaryPhone: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
        website: { type: String, trim: true },
      },
      logo: {
        url: {
          type: String,
          trim: true,
          validate: {
            validator: (v) => !v || /^(http|https):\/\/[^ "]+$/.test(v),
            message: "Invalid URL format",
          },
        },
        publicId: {
          type: String,
        },
      },
    },
  },
  { timestamps: true }
);

// Ensure only one settings document exists
SettingsSchema.index({}, { unique: true });

const Settings = models.Settings || model("Settings", SettingsSchema);

export default Settings;
