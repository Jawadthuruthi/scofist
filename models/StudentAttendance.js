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

  // Validate required filter parameters
  if (!classId || !batchId || !startDate || !endDate) {
    throw new Error(
      "Required filter parameters missing: classId, batchId, startDate, and endDate are required"
    );
  }

  // Create the aggregation pipeline
  const pipeline = [
    // Unwind the attendance records array
    { $unwind: "$attendanceRecords" },

    // Match records based on filter criteria
    {
      $match: {
        "attendanceRecords.classId": classId,
        "attendanceRecords.batchId": batchId,
        "attendanceRecords.date": {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },

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
    { $limit: limit },

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
          startDate: startDate,
          endDate: endDate,
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
