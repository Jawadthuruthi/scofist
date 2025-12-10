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
          type: Date,
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

studentAttendanceSchema.index({ "attendanceRecords.classId": 1 });
studentAttendanceSchema.index({ "attendanceRecords.batchId": 1 });
studentAttendanceSchema.index({ "attendanceRecords.date": 1 });

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
    groupByClass = true,
  } = filterOptions;

  // Build match conditions dynamically based on provided filters
  const matchConditions = {};

  // Add filters only if they are provided
  if (classId) {
    matchConditions["attendanceRecords.classId"] = classId;
  }

  if (batchId) {
    matchConditions["attendanceRecords.batchId"] = batchId;
  } else {
    // If no specific batch is provided, find active batches
    const activeBatches = await Batch.find({ status: "Active" }, { _id: 1 });
    if (activeBatches.length > 0) {
      matchConditions["attendanceRecords.batchId"] = {
        $in: activeBatches.map((batch) => batch._id),
      };
    }
  }

  if (startDate && endDate) {
    matchConditions["attendanceRecords.date"] = {
      $gte: new Date(`${startDate}T00:00:00.000Z`),
      $lte: new Date(`${endDate}T23:59:59.999Z`),
    };
  } else if (startDate) {
    matchConditions["attendanceRecords.date"] = {
      $gte: new Date(`${startDate}T00:00:00.000Z`),
    };
  } else if (endDate) {
    matchConditions["attendanceRecords.date"] = {
      $lte: new Date(`${endDate}T23:59:59.999Z`),
    };
  }

  // Create the aggregation pipeline to calculate attendance percentages
  let calculationPipeline = [
    // Unwind the attendance records array
    { $unwind: "$attendanceRecords" },

    // Match records based on filter criteria - only if we have any filters
    ...(Object.keys(matchConditions).length > 0
      ? [{ $match: matchConditions }]
      : []),
  ];

  // Group by student and classId if groupByClass is enabled
  if (groupByClass) {
    calculationPipeline.push({
      $group: {
        _id: {
          studentId: "$studentId",
          classId: "$attendanceRecords.classId",
        },
        totalClasses: { $sum: 1 },
        presentCount: {
          $sum: {
            $cond: [{ $eq: ["$attendanceRecords.present", true] }, 1, 0],
          },
        },
        batchId: { $first: "$attendanceRecords.batchId" },
      },
    });
  } else {
    // Group only by student (original behavior)
    calculationPipeline.push({
      $group: {
        _id: "$studentId",
        totalClasses: { $sum: 1 },
        presentCount: {
          $sum: {
            $cond: [{ $eq: ["$attendanceRecords.present", true] }, 1, 0],
          },
        },
        classId: { $first: "$attendanceRecords.classId" },
        batchId: { $first: "$attendanceRecords.batchId" },
      },
    });
  }

  // Calculate attendance percentage
  calculationPipeline.push({
    $project: {
      studentId: groupByClass ? "$_id.studentId" : "$_id",
      classId: groupByClass ? "$_id.classId" : "$classId",
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
  });

  // Sort by attendance percentage in descending order
  calculationPipeline.push({ $sort: { attendancePercentage: -1 } });

  // Execute the calculation pipeline
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

  // Group results by classId
  const resultsByClass = {};

  // Get highest percentage across all classes

  // Group students by classId and filter to get only the top performers in each class
  allStudents.forEach((student) => {
    const classId = student.classId;

    if (!resultsByClass[classId]) {
      resultsByClass[classId] = {
        classId,
        students: [],
        highestPercentage: student.attendancePercentage, // First student in class has highest percentage
      };
    }

    // Only include students with the highest percentage for this class
    if (
      student.attendancePercentage === resultsByClass[classId].highestPercentage
    ) {
      resultsByClass[classId].students.push(student);
    }
  });

  // Convert to array of class results
  let classResults = Object.values(resultsByClass);

  // Get all class IDs from results (before pagination) to sort them by name
  const allClassIds = classResults.map(r => r.classId);
  console.log("Toppers Sorting - allClassIds:", allClassIds);

  const allClasses = await Class.find({ _id: { $in: allClassIds } }, { name: 1 }).lean();
  console.log("Toppers Sorting - Found Classes count:", allClasses.length);

  const allClassMap = {};
  allClasses.forEach(c => allClassMap[String(c._id)] = c.name);

  // Custom sort order
  const classOrder = [
    "PLUS ONE A",
    "PLUS ONE B",
    "PLUS TWO",
    "DEGREE FIRST YEAR",
    "DEGREE SECOND YEAR",
    "DEGREE THIRD YEAR",
    "PG FIRST YEAR",
    "PG SECOND YEAR",
    "8TH STD",
    "9TH STD",
    "10TH STD",
  ].map((name) => name.replace(/\s/g, "").toUpperCase());

  classResults.sort((a, b) => {
    const rawNameA = allClassMap[String(a.classId)] || "";
    const rawNameB = allClassMap[String(b.classId)] || "";

    const nameA = rawNameA.trim().toUpperCase().replace(/\s/g, "");
    const nameB = rawNameB.trim().toUpperCase().replace(/\s/g, "");

    const indexA = classOrder.indexOf(nameA);
    const indexB = classOrder.indexOf(nameB);

    // console.log(`Comparing ${rawNameA} (${indexA}) vs ${rawNameB} (${indexB})`);

    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;

    return nameA.localeCompare(nameB);
  });

  console.log("Toppers Sorting - Sorted Classes:", classResults.map(r => allClassMap[String(r.classId)]));

  // Apply pagination to the sorted class results
  const total = classResults.length;
  const skip = parseInt(page) * parseInt(limit);
  const paginatedClassResults = classResults.slice(
    skip,
    skip + parseInt(limit)
  );

  // Get all student IDs from paginated results
  const studentIds = [];
  paginatedClassResults.forEach((classResult) => {
    classResult.students.forEach((student) => {
      studentIds.push(student.studentId);
    });
  });

  // Get student details
  const students = await User.find({ _id: { $in: studentIds } }, { name: 1 });

  // Create a map of student IDs to names for quick lookups
  const studentMap = {};
  students.forEach((student) => {
    studentMap[student._id] = student.name;
  });

  // Re-use the class map we already built (though it contains all classes, it has what we need)
  const classMap = allClassMap;

  // Format the final result
  const toppers = paginatedClassResults.map((classResult) => {
    const studentDetails = classResult.students.map((student) => ({
      studentId: student.studentId,
      studentName:
        `${student.studentId} ${studentMap[student.studentId]}` || "Unknown",
      totalClasses: student.totalClasses,
      presentCount: student.presentCount,
      attendancePercentage: student.attendancePercentage,
      batchId: student.batchId,
    }));

    return {
      classId: classResult.classId,
      className: classMap[classResult.classId] || "Unknown Class",
      highestPercentage: classResult.highestPercentage,
      dateRange: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      topperCount: studentDetails.length,
      students: studentDetails.sort(
        (a, b) => parseInt(a.studentId) - parseInt(b.studentId)
      ),
    };
  });

  return {
    toppers,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.max(0, Math.ceil(total / parseInt(limit)) - 1),
    },
  };
};

const StudentAttendance =
  models.StudentAttendance ||
  model("StudentAttendance", studentAttendanceSchema);
export default StudentAttendance;
