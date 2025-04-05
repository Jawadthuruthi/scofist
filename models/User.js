import { Schema, model, models } from "mongoose";
import Batch from "./Batch";
import Class from "./Class";
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
        default: "Active",
        required: true,
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
        required: function () {
          return this.roles.includes("Student");
        },
        trim: true,
        uppercase: true,
      },
      guardianContactNumber: {
        type: String,
        trim: true,
        required: function () {
          return this.roles.includes("Student");
        },
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
        required: function () {
          return this.roles.includes("Student");
        },
        trim: true,
        uppercase: true,
      },
      status: {
        type: String,
        trim: true,
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
        trim: true,
        required: function () {
          return this.studentSpecificField?.status === "Dropped Out";
        },
      },
      droppedOutReason: {
        type: String,
        trim: true,
        required: function () {
          return this.studentSpecificField?.status === "Dropped Out";
        },
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
        required: function () {
          return this.studentSpecificField?.status === "Graduated";
        },
      },
      classId: {
        type: String,
        trim: true,
        ref: "Class",
        required: function () {
          return this.roles.includes("Student");
        },
      },
      batchId: {
        type: String,
        trim: true,
        ref: "Batch",
        required: function () {
          return this.roles.includes("Student");
        },
        islamicCourse: {
          name: {
            type: String,
            trim: true,
          },
          university: {
            type: String,
            trim: true,
          },
          registerNumber: {
            type: String,
            trim: true,
          },
          year: {
            type: String,
            enum: ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"],
          },
          semester: {
            type: String,
            enum: ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"],
          },
        },
        generalCourse: {
          name: {
            type: String,
            trim: true,
          },
          university: {
            type: String,
            trim: true,
          },
          registerNumber: {
            type: String,
            trim: true,
          },
          year: {
            type: String,
            enum: ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"],
          },
          semester: {
            type: String,
            enum: ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"],
          },
        },
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes for common query patterns
userSchema.index({ name: "text" });

// Pre-save hook: Trim strings and update Batch when a student is added or changes batch
userSchema.pre("save", async function (next) {
  try {
    // Update batch if student is new or batchId is modified
    if (this.isModified("batchId")) {
      if (this.isNew) {
        await Batch.findByIdAndUpdate(this.batchId, {
          $addToSet: { students: this?._id },
        });
      } else {
        const oldStudent = await mongoose.model("User").findById(this?._id);
        if (oldStudent.batchId && oldStudent.batchId !== this.batchId) {
          await Batch.findByIdAndUpdate(oldStudent.batchId, {
            $pull: { students: this?._id },
          });
        }
        await Batch.findByIdAndUpdate(this.batchId, {
          $addToSet: { students: this?._id },
        });
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-remove hook: Remove student from batch when deleted
userSchema.pre("remove", async function (next) {
  try {
    if (this.batchId) {
      await Batch.findByIdAndUpdate(this.batchId, {
        $pull: { students: this?._id },
      });
    }
    next();
  } catch (error) {
    next(error);
  }
});

const User = models.User || model("User", userSchema);
export default User;
