const { Schema, models, model } = require("mongoose");

// Reusable enums
const ROLES = [
  "College Admin",
  "Org Admin",
  "Teacher",
  "Student",
  "Library Manager",
  "Program Committee",
  "Program Leader",
  "Finance",
  "Literary Leader",
  "Literary Manager",
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const STUDENT_STATUSES = ["Active", "Dropped Out", "Graduated"];

const userSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^[A-Za-z0-9-]+$/.test(v);
        },
        message: "Invalid ID format",
      },
    },
    name: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"],
      index: true,
    },
    roles: {
      type: [
        {
          type: String,
          enum: ROLES,
        },
      ],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "At least one role is required",
      },
    },
    contactNumber: {
      type: String,
      required: true,
      match: [/^(\+?\d{1,3}[-.\s]?)?\d{10,15}$/, "Invalid contact number"],
    },
    alternativeNumber: {
      type: String,
      match: [/^(\+?\d{1,3}[-.\s]?)?\d{10,15}$/, "Invalid alternative number"],
    },
    address: {
      houseName: { type: String, trim: true, uppercase: true },
      place: { type: String, required: true, trim: true, uppercase: true },
      postOffice: { type: String, trim: true, uppercase: true },
      district: { type: String, required: true, trim: true, uppercase: true },
      state: { type: String, required: true, trim: true, uppercase: true },
      pin: {
        type: String,
        validate: {
          validator: (v) => !v || /^\d{6}$/.test(v),
          message: "Invalid 6-digit PIN code",
        },
      },
    },
    dateOfBirth: {
      type: Date,
      required: true,
      validate: {
        validator: (v) => v < new Date(),
        message: "Date of birth cannot be in the future",
      },
    },
    profilePic: {
      type: String,
      validate: {
        validator: (v) => !v || /^(http|https):\/\/[^ "]+$/.test(v),
        message: "Invalid URL format",
      },
    },
    // Role-specific fields
    teacherSpecificField: {
      dateOfJoining: {
        type: Date,
        validate: {
          validator: (v) => v <= new Date(),
          message: "Joining date cannot be in the future",
        },
      },
      status: {
        type: String,
        enum: ["Active", "Retired"],
        default: "Active",
        required: true,
      },
    },
    studentSpecificField: {
      admissionClassId: { type: String, ref: "Class" },
      admissionDate: Date,
      aadharNo: {
        type: String,
        validate: {
          validator: (v) => !v || /^\d{12}$/.test(v),
          message: "Invalid 12-digit Aadhar number",
        },
      },
      bloodGroup: {
        type: String,
        enum: BLOOD_GROUPS,
      },
      guardianName: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
      },
      guardianNumber: {
        type: String,
        required: true,
        validate: {
          validator: (v) => /^\d{10}$/.test(v),
          message: "Invalid guardian contact number",
        },
      },
      relationship: {
        type: String,
        required: true,
        trim: true,
        enum: ["Father", "Mother", "Guardian", "Other"],
      },
      status: {
        type: String,
        enum: STUDENT_STATUSES,
        default: "Active",
      },
      islamicQualification: { type: String, trim: true },
      academicQualification: { type: String, trim: true },
      // Status-dependent fields
      droppedOutDate: {
        type: Date,
        required: function () {
          return this.studentSpecificField?.status === "Dropped Out";
        },
      },
      droppedOutClass: {
        type: String,
        required: function () {
          return this.studentSpecificField?.status === "Dropped Out";
        },
      },
      droppedOutReason: {
        type: String,
        required: function () {
          return this.studentSpecificField?.status === "Dropped Out";
        },
      },
      graduatedYear: {
        type: String,
        validate: {
          validator: function (v) {
            if (this.studentSpecificField?.status !== "Graduated") return true;
            return /^\d{4}$/.test(v);
          },
          message: "Graduation year must be a 4-digit number",
        },
      },
      classId: {
        type: Schema.Types.ObjectId,
        ref: "Class",
        required: function () {
          return this.roles.includes("Student");
        },
      },
      batchId: {
        type: Schema.Types.ObjectId,
        ref: "Batch",
        required: function () {
          return this.roles.includes("Student");
        },
      },
    },
  },
  {
    timestamps: true,
    // Prevent versioning field (__v) and use updatedAt instead
    versionKey: false,
  }
);

// Indexes for common query patterns
userSchema.index({ name: "text" });

// Pre-save hook to trim strings
userSchema.pre("save", function (next) {
  const trimStrings = (obj) => {
    Object.keys(obj).forEach((key) => {
      if (typeof obj[key] === "string") {
        obj[key] = obj[key].trim();
      }
    });
  };

  trimStrings(this);
  trimStrings(this.address);
  trimStrings(this.studentSpecificField);
  next();
});

const User = models.User || model("User", userSchema);
export default User;
