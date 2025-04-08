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
  const {
    classId,
    batchId,
    startDate,
    endDate,
    page = 0,
    limit = 10,
  } = filterOptions;

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

  // Create the aggregation pipeline to calculate attendance percentages
  const calculationPipeline = [
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
          $round: [
            {
              $multiply: [{ $divide: ["$presentCount", "$totalClasses"] }, 100],
            },
            2,
          ],
        },
      },
    },

    // Sort by attendance percentage in descending order
    { $sort: { attendancePercentage: -1 } },
  ];

  // Execute the calculation pipeline to get the highest attendance percentage
  const allStudents = await this.aggregate(calculationPipeline);

  // If no students found, return empty array
  if (allStudents.length === 0) {
    return {
      toppers: [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
        totalPages: 0,
      },
      highestPercentage: null,
    };
  }

  // Get the highest attendance percentage
  const highestPercentage = allStudents[0].attendancePercentage;

  // Filter to get only the students with the highest percentage
  const toppersData = allStudents.filter(
    (student) => student.attendancePercentage === highestPercentage
  );

  // Calculate total for pagination
  const total = toppersData.length;

  // Apply pagination
  const skip = parseInt(page) * parseInt(limit);
  const paginatedToppers = toppersData.slice(skip, skip + parseInt(limit));

  // Look up student details for the paginated results
  const studentIds = paginatedToppers.map((topper) => topper.studentId);

  // Get student details
  const students = await User.find({ _id: { $in: studentIds } }, { name: 1 });

  // Create a map of student IDs to names for quick lookups
  const studentMap = {};
  students.forEach((student) => {
    studentMap[student._id] = student.name;
  });

  // Add student names to the toppers data
  const toppers = paginatedToppers.map((topper) => ({
    studentId: topper.studentId,
    studentName: studentMap[topper.studentId] || "Unknown",
    classId: topper.classId,
    batchId: topper.batchId,
    dateRange: {
      startDate: startDate || null,
      endDate: endDate || null,
    },
    totalClasses: topper.totalClasses,
    presentCount: topper.presentCount,
    attendancePercentage: topper.attendancePercentage,
  }));

  return {
    toppers,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.max(0, Math.ceil(total / parseInt(limit)) - 1),
    },
    highestPercentage,
  };
};

const StudentAttendance =
  models.StudentAttendance ||
  model("StudentAttendance", studentAttendanceSchema);
export default StudentAttendance;
