// models/Settings.js
import { Schema, model, models } from "mongoose";

const SettingsSchema = new Schema(
  {
    general: {
      isWorkingDay: {
        type: Boolean,
        default: true,
        required: true,
      },
      occasion: {
        type: String,
        trim: true,
        default: "",
        required: function () {
          return !this.isWorkingDay;
        },
      },
    },
    institution: {
      name: { type: String, required: true, trim: true },
      tagline: { type: String, trim: true },
      address: { type: String, trim: true },
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
    idCard: {
      backgroundImage: {
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
    festival: {
      printHeader: {
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
      registrationDeadline: {
        type: Date,
      },
    },
  },
  { timestamps: true }
);

// Ensure only one settings document exists
SettingsSchema.index({}, { unique: true });

const Settings = models.Settings || model("Settings", SettingsSchema);

export default Settings;
