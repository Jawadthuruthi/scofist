import { Schema, model, models, mongoose } from "mongoose";
import "./StudentsFund.js"; // Import to ensure schema is registered
import "./StudentCoupon.js"; // Import to ensure schema is registered
import "./Rental.js"; // Import to ensure schema is registered
import "./LibraryBook.js"; // Import to ensure schema is registered
import Batch from "./Batch";
import Class from "./Class";

// Reusable enums
// Schema updated for verification fields
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
  "Stationary",
  "IT Lab",
  "Spark Admin",
  "Librarian",
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const STUDENT_STATUSES = ["Active", "Dropped Out", "Graduated"];

const userSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      match: [
        /^[A-Z0-9-]+$/,
        "ID must only contain uppercase letters, numbers, and hyphens (-).",
      ],
    },
    name: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    email: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"],
      index: true,
      sparse: true,
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
      trim: true,
      match: [/^(\+?\d{1,3}[-.\s]?)?\d{10,15}$/, "Invalid contact number"],
    },
    alternativeNumber: {
      type: String,
      trim: true,
      match: [/^(\+?\d{1,3}[-.\s]?)?\d{10,15}$/, "Invalid alternative number"],
    },
    address: {
      houseName: { type: String, trim: true },
      place: { type: String, required: true, trim: true },
      postOffice: { type: String, trim: true },
      district: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      pin: {
        type: String,
        trim: true,
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
        required: function () {
          return this.roles.includes("Teacher");
        },
        validate: {
          validator: (v) => v === "Active" || v === "Retired",
          message: "Invalid status value",
        },
      },
    },
    studentSpecificField: {
      admissionClassId: { type: String, trim: true, ref: "Class" },
      admissionDate: Date,
      aadharNo: {
        type: String,
        trim: true,
        validate: {
          validator: (v) => !v || /^\d{12}$/.test(v),
          message: "Invalid 12-digit Aadhar number",
        },
      },
      bloodGroup: {
        type: String,
        trim: true,
        enum: BLOOD_GROUPS,
      },
      guardianName: {
        type: String,
        // required: function () {
        //   return this.roles.includes("Student");
        // },
        trim: true,
        uppercase: true,
      },
      guardianContactNumber: {
        type: String,
        trim: true,
        // required: function () {
        //   return this.roles.includes("Student");
        // },
        match: [
          /^(\+?\d{1,3}[-.\s]?)?\d{10,15}$/,
          "Invalid guardian contact number",
        ],
      },
      guardianAlternativeNumber: {
        type: String,
        trim: true,
        match: [
          /^(\+?\d{1,3}[-.\s]?)?\d{10,15}$/,
          "Invalid guardian alternative number",
        ],
      },
      relationship: {
        type: String,
        // required: function () {
        //   return this.roles.includes("Student");
        // },
        trim: true,
        uppercase: true,
      },
      status: {
        type: String,
        trim: true,
        enum: STUDENT_STATUSES,
        // required: function () {
        //   return this.roles.includes("Student");
        // },
      },
      islamicQualification: { type: String, trim: true },
      academicQualification: { type: String, trim: true },
      isVerified: {
        type: Boolean,
        default: false,
      },
      verifiedAt: Date,
      // Status-dependent fields
      droppedOutDate: {
        type: Date,
        // required: function () {
        //   return this.studentSpecificField?.status === "Dropped Out";
        // },
      },
      droppedOutClass: {
        type: String,
        trim: true,
        // required: function () {
        //   return this.studentSpecificField?.status === "Dropped Out";
        // },
      },
      droppedOutReason: {
        type: String,
        trim: true,
        // required: function () {
        //   return this.studentSpecificField?.status === "Dropped Out";
        // },
      },
      graduatedYear: {
        type: String,
        trim: true,
        validate: {
          validator: function (v) {
            if (this.studentSpecificField?.status !== "Graduated") return true;
            return /^\d{4}$/.test(v);
          },
          message: "Graduation year must be a 4-digit number",
        },
        // required: function () {
        //   return this.studentSpecificField?.status === "Graduated";
        // },
      },
      classId: {
        type: String,
        trim: true,
        ref: "Class",
        // required: function () {
        //   return (
        //     this.roles.includes("Student") &&
        //     this.studentSpecificField?.status === "Active"
        //   );
        // },
      },
      batchId: {
        type: String,
        trim: true,
        ref: "Batch",
        // required: function () {
        //   return this.roles.includes("Student");
        // },
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for common query patterns
userSchema.index({ name: "text" });

// Virtual for student's funds
userSchema.virtual('funds', {
  ref: 'StudentsFund',
  localField: '_id',
  foreignField: 'studentId'
});

// Virtual for student's coupons
userSchema.virtual('coupons', {
  ref: 'StudentCoupon',
  localField: '_id',
  foreignField: 'studentId'
});

// Virtual for student's rentals
userSchema.virtual('rentals', {
  ref: 'Rental',
  localField: '_id',
  foreignField: 'studentId'
});

const User = models.User || model("User", userSchema);
export default User;
