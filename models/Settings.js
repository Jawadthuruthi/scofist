// models/Settings.js
import { Schema, model, models } from "mongoose";

const FestivalSchema = new Schema({
  year: { type: String }, // Optional for the legacy 'festival' field, required for elements in 'festivals'
  festivalInfo: {
    name: {
      type: String,
      trim: true,
      default: "esperanza",
    },
    theme: {
      type: String,
      trim: true,
      default: "Recall the legacy, Reignite the light",
    },
    year: {
      type: Number,
      default: new Date().getFullYear(),
    },
    dates: {
      startDate: {
        type: Date,
      },
      endDate: {
        type: Date,
      },
    },
    venue: {
      type: String,
      trim: true,
      default: "Sa-adiya Da-awa College",
    },
  },
  festivalLogo: {
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
  festivalNameImage: {
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
  festivalFullNameImage: {
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
  festivalThemeImage: {
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
  festivalVenueImage: {
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

  participantsCard: {
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
    teamBackgrounds: {
      type: Schema.Types.Mixed,
      default: {}
    },
    layout: {
      chestNumber: {
        x: { type: Number, default: 50 },
        y: { type: Number, default: 40 },
        visible: { type: Boolean, default: true },
        fontSize: { type: Number, default: 24 },
        fontFamily: { type: String, default: "sans-serif" },
        color: { type: String, default: "#000000" },
        fontWeight: { type: String, default: "bold" },
        textAlign: { type: String, default: "center" },
      },
      participantName: {
        x: { type: Number, default: 50 },
        y: { type: Number, default: 50 },
        visible: { type: Boolean, default: true },
        fontSize: { type: Number, default: 18 },
        fontFamily: { type: String, default: "sans-serif" },
        color: { type: String, default: "#000000" },
        fontWeight: { type: String, default: "bold" },
        textAlign: { type: String, default: "center" },
      },
      team: {
        x: { type: Number, default: 50 },
        y: { type: Number, default: 60 },
        visible: { type: Boolean, default: true },
        fontSize: { type: Number, default: 12 },
        fontFamily: { type: String, default: "sans-serif" },
        color: { type: String, default: "#000000" },
        fontWeight: { type: String, default: "600" },
        textAlign: { type: String, default: "center" },
      },
      division: {
        x: { type: Number, default: 50 },
        y: { type: Number, default: 65 },
        visible: { type: Boolean, default: true },
        fontSize: { type: Number, default: 12 },
        fontFamily: { type: String, default: "sans-serif" },
        color: { type: String, default: "#000000" },
        fontWeight: { type: String, default: "600" },
        textAlign: { type: String, default: "center" },
      },
      programQR: {
        x: { type: Number, default: 15 },
        y: { type: Number, default: 85 },
        visible: { type: Boolean, default: true },
        size: { type: Number, default: 45 },
      },
      resultQR: {
        x: { type: Number, default: 85 },
        y: { type: Number, default: 85 },
        visible: { type: Boolean, default: true },
        size: { type: Number, default: 45 },
      },
      barcode: {
        x: { type: Number, default: 50 },
        y: { type: Number, default: 75 },
        visible: { type: Boolean, default: true },
        width: { type: Number, default: 1.2 },
        height: { type: Number, default: 25 },
      },
      festivalName: {
        x: { type: Number, default: 50 },
        y: { type: Number, default: 10 },
        visible: { type: Boolean, default: true },
        fontSize: { type: Number, default: 16 },
        fontFamily: { type: String, default: "sans-serif" },
        color: { type: String, default: "#000000" },
        fontWeight: { type: String, default: "bold" },
        textAlign: { type: String, default: "center" },
      },
    },
  },
  instructions: {
    type: String,
    trim: true,
  },
  isInstructionsVisible: {
    type: Boolean,
    default: true,
  },

  resultPosters: [
    {
      name: { type: String, default: "Poster 1" },
      backgroundImage: {
        url: String,
        publicId: String,
      },
      layout: {
        programInfo: {
          x: { type: Number, default: 50 },
          y: { type: Number, default: 5 },
          visible: { type: Boolean, default: true },
          fontSize: { type: Number, default: 14 },
          responsiveSize: { type: Boolean, default: true },
          minFontSize: { type: Number, default: 18 },
          maxFontSize: { type: Number, default: 32 },
          color: { type: String, default: "ffffff" },
          fontWeight: { type: String, default: "bold" },
          textAlign: { type: String, default: "center" },
          lineHeight: { type: Number, default: 1.1 },
          textShadow: { type: Boolean, default: false },
          autoFit: { type: Boolean, default: true },
        },
        divisionInfo: {
          x: { type: Number, default: 50 },
          y: { type: Number, default: 25 },
          visible: { type: Boolean, default: true },
          fontSize: { type: Number, default: 10 },
          responsiveSize: { type: Boolean, default: true },
          minFontSize: { type: Number, default: 14 },
          maxFontSize: { type: Number, default: 24 },
          color: { type: String, default: "ffffff" },
          fontWeight: { type: String, default: "normal" },
          textAlign: { type: String, default: "center" },
          lineHeight: { type: Number, default: 1.2 },
          textShadow: { type: Boolean, default: false },
          autoFit: { type: Boolean, default: true },
        },
        resultNumber: {
          x: { type: Number, default: 50 },
          y: { type: Number, default: 12 },
          visible: { type: Boolean, default: true },
          fontSize: { type: Number, default: 24 },
          responsiveSize: { type: Boolean, default: true },
          minFontSize: { type: Number, default: 14 },
          maxFontSize: { type: Number, default: 28 },
          color: { type: String, default: "ffffff" },
          fontWeight: { type: String, default: "bold" },
          textAlign: { type: String, default: "left" },
          lineHeight: { type: Number, default: 1.1 },
          letterSpacing: { type: Number, default: 0 },
          textShadow: { type: Boolean, default: false },
          prefix: { type: String, default: "" },
          autoFit: { type: Boolean, default: true },
        },
        firstPlace: {
          x: { type: Number, default: 50 },
          y: { type: Number, default: 35 },
          visible: { type: Boolean, default: true },
          fontSize: { type: Number, default: 12 },
          responsiveSize: { type: Boolean, default: true },
          minFontSize: { type: Number, default: 8 },
          maxFontSize: { type: Number, default: 24 },
          color: { type: String, default: "ffffff" },
          fontWeight: { type: String, default: "normal" },
          textAlign: { type: String, default: "left" },
          lineHeight: { type: Number, default: 1.2 },
          letterSpacing: { type: Number, default: 0 },
          nameSpacing: { type: Number, default: 8 },
          maxNameLength: { type: Number, default: 25 },
          textShadow: { type: Boolean, default: false },
          showRank: { type: Boolean, default: false },
          maxWinners: { type: Number, default: 1 },
          autoFit: { type: Boolean, default: true },
          containerPadding: { type: Number, default: 15 },
          teamNameSpacing: { type: Number, default: 0 },
          showTeamName: { type: Boolean, default: true },
        },
        secondPlace: {
          x: { type: Number, default: 50 },
          y: { type: Number, default: 60 },
          visible: { type: Boolean, default: true },
          fontSize: { type: Number, default: 12 },
          responsiveSize: { type: Boolean, default: true },
          minFontSize: { type: Number, default: 8 },
          maxFontSize: { type: Number, default: 24 },
          color: { type: String, default: "ffffff" },
          fontWeight: { type: String, default: "normal" },
          textAlign: { type: String, default: "left" },
          lineHeight: { type: Number, default: 1.3 },
          letterSpacing: { type: Number, default: 0 },
          nameSpacing: { type: Number, default: 6 },
          maxNameLength: { type: Number, default: 20 },
          textShadow: { type: Boolean, default: false },
          showRank: { type: Boolean, default: false },
          maxWinners: { type: Number, default: 1 },
          autoFit: { type: Boolean, default: true },
          containerPadding: { type: Number, default: 15 },
          teamNameSpacing: { type: Number, default: 0 },
          showTeamName: { type: Boolean, default: true },
        },
        thirdPlace: {
          x: { type: Number, default: 50 },
          y: { type: Number, default: 80 },
          visible: { type: Boolean, default: true },
          fontSize: { type: Number, default: 12 },
          responsiveSize: { type: Boolean, default: true },
          minFontSize: { type: Number, default: 8 },
          maxFontSize: { type: Number, default: 24 },
          color: { type: String, default: "ffffff" },
          fontWeight: { type: String, default: "normal" },
          textAlign: { type: String, default: "left" },
          lineHeight: { type: Number, default: 1.3 },
          letterSpacing: { type: Number, default: 0 },
          nameSpacing: { type: Number, default: 6 },
          maxNameLength: { type: Number, default: 20 },
          textShadow: { type: Boolean, default: false },
          showRank: { type: Boolean, default: false },
          maxWinners: { type: Number, default: 1 },
          autoFit: { type: Boolean, default: true },
          containerPadding: { type: Number, default: 15 },
          teamNameSpacing: { type: Number, default: 0 },
          showTeamName: { type: Boolean, default: true },
        },
      },
    },
  ],
  committeeContacts: {
    contact1: {
      position: { type: String, trim: true, default: "" },
      name: { type: String, trim: true, default: "" },
      phone: { type: String, trim: true, default: "" },
    },
    contact2: {
      position: { type: String, trim: true, default: "" },
      name: { type: String, trim: true, default: "" },
      phone: { type: String, trim: true, default: "" },
    },
    contact3: {
      position: { type: String, trim: true, default: "" },
      name: { type: String, trim: true, default: "" },
      phone: { type: String, trim: true, default: "" },
    },
    contact4: {
      position: { type: String, trim: true, default: "" },
      name: { type: String, trim: true, default: "" },
      phone: { type: String, trim: true, default: "" },
    },
  },
});

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
      },
      // Persistent log of all dates marked as non-working by the college admin
      nonWorkingDays: {
        type: [Date],
        default: [],
      },
      // Log with occasion name per non-working date
      nonWorkingDaysLog: {
        type: [
          {
            date: { type: Date, required: true },
            occasion: { type: String, trim: true, default: "" },
          },
        ],
        default: [],
      },
      // Section-level working day toggles (Senior Da-awa / Junior Da-awa)
      seniorDaawa: {
        isWorkingDay: { type: Boolean, default: true },
        occasion: { type: String, trim: true, default: "" },
      },
      seniorDaawaNonWorkingDays: {
        type: [Date],
        default: [],
      },
      seniorDaawaNonWorkingDaysLog: {
        type: [
          {
            date: { type: Date, required: true },
            occasion: { type: String, trim: true, default: "" },
          },
        ],
        default: [],
      },
      juniorDaawa: {
        isWorkingDay: { type: Boolean, default: true },
        occasion: { type: String, trim: true, default: "" },
      },
      juniorDaawaNonWorkingDays: {
        type: [Date],
        default: [],
      },
      juniorDaawaNonWorkingDaysLog: {
        type: [
          {
            date: { type: Date, required: true },
            occasion: { type: String, trim: true, default: "" },
          },
        ],
        default: [],
      },
      appIcon: {
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
      attendanceCategories: {
        type: [String],
        default: ["Masjid", "Haddad", "Programs", "Spot"],
      },
    },
    institution: {
      name: { type: String, required: true, trim: true },
      fullName: { type: String, trim: true },
      tagline: { type: String, trim: true },
      address: { type: String, trim: true },
      contact: {
        primaryPhone: { type: String, trim: true },
        secondaryPhone: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
        website: { type: String, trim: true },
        whatsappChannel: { type: String, trim: true },
        youtube: { type: String, trim: true },
        instagram: { type: String, trim: true },
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
      institutionPhoto: {
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
      updatesLogo: {
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
    spark: {
      name: { type: String, trim: true },
      fullName: { type: String, trim: true },
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
      committeePosters: [
        {
          year: {
            type: String,
            required: true,
          },
          poster: {
            url: {
              type: String,
              required: true,
            },
            publicId: {
              type: String,
            },
          },
        },
      ],
    },
    org: {
      name: { type: String, trim: true },
      fullName: { type: String, trim: true },
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
      committeePosters: [
        {
          year: {
            type: String,
            required: true,
          },
          poster: {
            url: {
              type: String,
              required: true,
            },
            publicId: {
              type: String,
            },
          },
        },
      ],
    },
    idCard: {
      backgroundImage: {
        url: {
          type: String,
          trim: true,
          validate: {
            validator: (v) => !v || /^(http|https|\/)[^ "]*$/.test(v),
            message: "Invalid URL format",
          },
        },
        publicId: {
          type: String,
        },
      },
      sealImage: {
        url: {
          type: String,
          trim: true,
          validate: {
            validator: (v) => !v || /^(http|https|\/)[^ "]*$/.test(v),
            message: "Invalid URL format",
          },
        },
        publicId: {
          type: String,
        },
      },
    },
    festival: { type: FestivalSchema, default: () => ({}) },
    festivals: { type: [FestivalSchema], default: [] },
    years: {
      type: [String],
      default: ["2025 november"],
    },
    blockedYears: {
      type: [String],
      default: [],
    },
    activeYear: {
      type: String,
      default: "2025 november",
    },
    // Snapshot of published team points per year.
    // Written by the publish action; read by the public /team-points page.
    teamPointsSnapshot: {
      type: [
        {
          year: { type: String },
          publishedAt: { type: Date },
          totalResults: { type: Number, default: 0 },
          teams: [
            {
              _id: { type: String },
              name: { type: String },
              points: { type: Number, default: 0 },
              color: { type: String, default: "#808080" },
            },
          ],
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

// Ensure only one settings document exists
SettingsSchema.index({}, { unique: true });

// Check if model exists but is missing the new fields (Hot Reload fix)
if (models.Settings && (!models.Settings.schema.path("idCard.sealImage") || !models.Settings.schema.path("spark.committeePosters") || !models.Settings.schema.path("festival.festivalNameImage") || !models.Settings.schema.path("institution.contact.whatsappChannel") || !models.Settings.schema.path("general.nonWorkingDays") || !models.Settings.schema.path("general.seniorDaawaNonWorkingDays") || !models.Settings.schema.path("general.seniorDaawaNonWorkingDaysLog") || !models.Settings.schema.path("participantsCard.layout") || !models.Settings.schema.path("general.attendanceCategories") || !models.Settings.schema.path("teamPointsSnapshot"))) {
  console.log("Detecting outdated Settings model. Refreshing...");
  delete models.Settings;
}

const Settings = models.Settings || model("Settings", SettingsSchema);

export default Settings;
