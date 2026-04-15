import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import StudentAttendance from "@/models/StudentAttendance";
import { NextResponse } from "next/server";

export async function GET(req, res) {
  try {
    await connectToDB();

    // Parse URL to get search params
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "0");
    const limit = parseInt(url.searchParams.get("limit")) || Infinity;

    // Build filter object from query parameters
    const filterParams = {};
    for (const [key, value] of url.searchParams.entries()) {
      // Skip pagination, limit, projection, and control flags
      if (!["page", "limit", "projection", "toppersOnly", "name"].includes(key)) {
        filterParams[key] = value;
      }
    }

    const isToppersOnly = url.searchParams.get("toppersOnly") === "true";
    const nameFilter = url.searchParams.get("name");

    // Get projection param
    const projectionParam = url.searchParams.get("projection");
    let projections = {};

    // Convert projection param to MongoDB projection object
    if (projectionParam) {
      const fields = projectionParam.split(",");
      fields.forEach((field) => {
        projections[field] = 1; // Include each field
      });
    }

    // Build MongoDB query for the student document level
    const documentQuery = {};
    if (filterParams.studentId) {
      documentQuery.studentId = filterParams.studentId;
    } else if (nameFilter) {
      // Search for students by name
      const User = models.User;
      const matchingStudents = await User.find({
        name: { $regex: nameFilter, $options: "i" },
        roles: "Student"
      }, { _id: 1 }).lean();

      if (matchingStudents.length > 0) {
        documentQuery.studentId = { $in: matchingStudents.map(m => m._id.toString()) };
      } else {
        // If name search is active but no students found, force empty result
        documentQuery.studentId = "NULL_USER_ID";
      }
    }

    // Store record-level filters separately - these will be used later for filtering the records array
    const recordFilters = {};
    if (filterParams.classId) {
      recordFilters.classId = filterParams.classId;
    }
    if (filterParams.batchId) {
      recordFilters.batchId = filterParams.batchId;
    }
    if (filterParams.subjectId) {
      recordFilters.subjectId = filterParams.subjectId;
    }

    // Handle date filtering
    let dateFilter = null;
    if (filterParams.date) {
      // Convert string date to Date object for exact date match
      const exactDate = new Date(filterParams.date);
      const startOfDay = new Date(exactDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(exactDate);
      endOfDay.setHours(23, 59, 59, 999);

      dateFilter = {
        start: startOfDay,
        end: endOfDay,
      };
    } else if (filterParams.startDate || filterParams.endDate) {
      dateFilter = {};

      if (filterParams.startDate) {
        const startDate = new Date(filterParams.startDate);
        startDate.setHours(0, 0, 0, 0);
        dateFilter.start = startDate;
      }

      if (filterParams.endDate) {
        const endDate = new Date(filterParams.endDate);
        endDate.setHours(23, 59, 59, 999);
        dateFilter.end = endDate;
      }
    }

    console.log("Filters:", { documentQuery, recordFilters, dateFilter });

    // For better performance, always use aggregation with properly structured pipeline
    const pipeline = [
      // First match at document level (studentId filter)
      { $match: documentQuery },

      // Add the filtered records field using $filter operator
      {
        $addFields: {
          filteredRecords: {
            $filter: {
              input: "$attendanceRecords",
              as: "record",
              cond: {
                $and: [
                  // Filter by class if specified
                  ...(recordFilters.classId
                    ? [
                      {
                        $eq: [{ $toString: "$$record.classId" }, recordFilters.classId],
                      },
                    ]
                    : []),

                  // Filter by batch if specified
                  ...(recordFilters.batchId
                    ? [
                      {
                        $eq: [{ $toString: "$$record.batchId" }, recordFilters.batchId],
                      },
                    ]
                    : []),

                  // Filter by subject if specified
                  ...(recordFilters.subjectId
                    ? [
                      {
                        $eq: [{ $toString: "$$record.subjectId" }, recordFilters.subjectId],
                      },
                    ]
                    : []),

                  // Date filtering - start date if specified
                  ...(dateFilter?.start
                    ? [
                      {
                        $gte: ["$$record.date", dateFilter.start],
                      },
                    ]
                    : []),

                  // Date filtering - end date if specified
                  ...(dateFilter?.end
                    ? [
                      {
                        $lte: ["$$record.date", dateFilter.end],
                      },
                    ]
                    : []),
                ],
              },
            },
          },
        },
      },

      // Now project to only include documents with matching records
      {
        $match: {
          "filteredRecords.0": { $exists: true }, // Ensures at least one record matched
        },
      },

      // Replace the original records with the filtered ones
      {
        $project: {
          studentId: 1,
          attendanceRecords: "$filteredRecords",
        },
      },
    ];

    if (isToppersOnly) {
      // If toppersOnly is true, we need to calculate attendance percentage per class and get the top student
      pipeline.push(
        // Unwind to process per-record
        { $unwind: "$attendanceRecords" },
        // Calculate Present/Absent for each record (assuming 'present' is boolean) 
        // We group by classId and studentId to calculate the percentage
        {
          $group: {
            _id: {
              classId: "$attendanceRecords.classId",
              studentId: "$studentId"
            },
            totalClasses: { $sum: 1 },
            presentClasses: {
              $sum: { $cond: [{ $eq: ["$attendanceRecords.present", true] }, 1, 0] }
            },
            records: { $push: "$attendanceRecords" } // keep the records to return later
          }
        },
        // Calculate percentage
        {
          $addFields: {
            percentage: {
              $multiply: [{ $divide: ["$presentClasses", "$totalClasses"] }, 100]
            }
          }
        },
        // Sort by percentage descending to prepare for getting top per class
        { $sort: { "_id.classId": 1, percentage: -1 } },
        // Group by classId to get the top student
        {
          $group: {
            _id: "$_id.classId", // classId
            topStudentId: { $first: "$_id.studentId" },
            percentage: { $first: "$percentage" },
            records: { $first: "$records" }
          }
        },
        // Re-shape the document to match our original structure
        {
          $project: {
            _id: { $toObjectId: "$topStudentId" },
            studentId: { $toObjectId: "$topStudentId" },
            attendanceRecords: "$records",
            percentage: { $round: ["$percentage", 1] }
          }
        }
      );
    } else {
      // Normal flow: just paginate
      pipeline.push(
        { $skip: limit === Infinity ? 0 : page * limit },
        ...(limit !== Infinity ? [{ $limit: limit }] : [])
      );
    }

    // Execute the aggregation pipeline
    const studentAttendances =
      await StudentAttendance.aggregate(pipeline).exec();

    // Populate references
    const populatedAttendances = await StudentAttendance.populate(
      studentAttendances,
      [
        { path: "studentId", select: "name" },
        { path: "attendanceRecords.classId", select: "name" },
        { path: "attendanceRecords.subjectId", select: "name" },
      ]
    );

    // Format the results
    const formattedStudentAttendances = populatedAttendances.map((record) => ({
      _id: record.studentId?._id || record._id,
      name: record.studentId?.name || "Unknown Student",
      percentage: record.percentage,
      attendanceRecords: (record.attendanceRecords || []).map((attendance) => ({
        ...(attendance || {}),
        className: attendance?.classId?.name,
        subjectName: attendance?.subjectId?.name,
        classId: attendance?.classId?._id,
        subjectId: attendance?.subjectId?._id,
      })),
    }));

    // Get total count more efficiently
    const countPipeline = [
      // First match at document level (studentId filter)
      { $match: documentQuery },

      // Add the filtered records field using $filter
      {
        $addFields: {
          filteredRecords: {
            $filter: {
              input: "$attendanceRecords",
              as: "record",
              cond: {
                $and: [
                  // Same filters as main pipeline
                  ...(recordFilters.classId
                    ? [
                      {
                        $eq: [{ $toString: "$$record.classId" }, recordFilters.classId],
                      },
                    ]
                    : []),

                  ...(recordFilters.batchId
                    ? [
                      {
                        $eq: [{ $toString: "$$record.batchId" }, recordFilters.batchId],
                      },
                    ]
                    : []),

                  ...(recordFilters.subjectId
                    ? [
                      {
                        $eq: [{ $toString: "$$record.subjectId" }, recordFilters.subjectId],
                      },
                    ]
                    : []),

                  ...(dateFilter?.start
                    ? [
                      {
                        $gte: ["$$record.date", dateFilter.start],
                      },
                    ]
                    : []),

                  ...(dateFilter?.end
                    ? [
                      {
                        $lte: ["$$record.date", dateFilter.end],
                      },
                    ]
                    : []),
                ],
              },
            },
          },
        },
      },

      // Only count documents with matching records
      {
        $match: {
          "filteredRecords.0": { $exists: true },
        },
      },

      // Count documents
      { $count: "total" },
    ];

    const countResult = await StudentAttendance.aggregate(countPipeline).exec();
    const total = countResult.length > 0 ? countResult[0].total : 0;

    return NextResponse.json(
      {
        studentAttendances: formattedStudentAttendances,
        pagination: {
          page,
          limit,
          total,
          totalPages:
            limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
        },
        message: "Student attendance records fetched successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Student attendance fetch error:", error);
    return apiResponse.error(error);
  }
}
