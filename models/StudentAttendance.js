import { model, models, Schema } from "mongoose";
import User from "./User";
import Class from "./Class";
import Subject from "./Subject";
import Batch from "./Batch";

const studentAttendanceSchema = new Schema(
  {
    studentId: {
      type: String,
      required: true,
      ref: "User",
      index: true,
    },
    attendanceRecords: [
      {
        classId: {
          type: String,
          required: true,
          ref: "Class",
        },
        batchId: {
          type: String,
          required: true,
          ref: "Batch",
        },
        subjectId: {
          type: String,
          required: true,
          ref: "Subject",
        },
        periodNumber: {
          type: Number,
          required: true,
        },
        day: {
          type: String,
          required: true,
        },
        date: {
          type: String,
          required: true,
        },
        present: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

studentAttendanceSchema.statics.getAttendanceToppers = async function (
  filterOptions
) {
  const { classId, batchId, startDate, endDate, limit = 10 } = filterOptions;

  // Build match conditions dynamically based on provided filters
  const matchConditions = {};

  // Add filters only if they are provided
  if (classId) {
    matchConditions["attendanceRecords.classId"] = classId;
  }

  if (batchId) {
    matchConditions["attendanceRecords.batchId"] = batchId;
  }

  // Date range condition - only apply if both dates are provided
  if (startDate && endDate) {
    matchConditions["attendanceRecords.date"] = {
      $gte: startDate,
      $lte: endDate,
    };
  } else if (startDate) {
    matchConditions["attendanceRecords.date"] = { $gte: startDate };
  } else if (endDate) {
    matchConditions["attendanceRecords.date"] = { $lte: endDate };
  }

  // Create the aggregation pipeline
  const pipeline = [
    // Unwind the attendance records array
    { $unwind: "$attendanceRecords" },

    // Match records based on filter criteria - only if we have any filters
    ...(Object.keys(matchConditions).length > 0
      ? [{ $match: matchConditions }]
      : []),

    // Group by student and calculate attendance metrics
    {
      $group: {
        _id: "$studentId",
        totalClasses: { $sum: 1 },
        presentCount: {
          $sum: {
            $cond: [{ $eq: ["$attendanceRecords.present", true] }, 1, 0],
          },
        },
        // Store the classId and batchId for the final output
        classId: { $first: "$attendanceRecords.classId" },
        batchId: { $first: "$attendanceRecords.batchId" },
      },
    },

    // Calculate attendance percentage
    {
      $project: {
        studentId: "$_id",
        classId: 1,
        batchId: 1,
        totalClasses: 1,
        presentCount: 1,
        attendancePercentage: {
          $multiply: [{ $divide: ["$presentCount", "$totalClasses"] }, 100],
        },
      },
    },

    // Sort by attendance percentage in descending order
    { $sort: { attendancePercentage: -1 } },

    // Limit the results
    { $limit: parseInt(limit) },

    // Lookup to get student details
    {
      $lookup: {
        from: "users",
        localField: "studentId",
        foreignField: "_id",
        as: "studentDetails",
      },
    },

    // Unwind the studentDetails array
    { $unwind: "$studentDetails" },

    // Project the final output with all requested fields
    {
      $project: {
        _id: 0,
        studentId: 1,
        studentName: "$studentDetails.name",
        classId: 1,
        batchId: 1,
        dateRange: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
        totalClasses: 1,
        presentCount: 1,
        attendancePercentage: { $round: ["$attendancePercentage", 2] },
      },
    },
  ];

  // Execute the aggregation pipeline
  return this.aggregate(pipeline);
};

const StudentAttendance =
  models.StudentAttendance ||
  model("StudentAttendance", studentAttendanceSchema);
export default StudentAttendance;
