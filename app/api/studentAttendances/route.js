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
      // Skip pagination parameters
      if (key !== "page" && key !== "limit" && key !== "projection") {
        filterParams[key] = value;
      }
    }

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

    // Build MongoDB query
    const query = {};
    if (filterParams.studentId) {
      query.studentId = filterParams.studentId;
    }
    if (filterParams.classId) {
      query["attendanceRecords.classId"] = filterParams.classId;
    }
    if (filterParams.batchId) {
      query["attendanceRecords.batchId"] = filterParams.batchId;
    }
    if (filterParams.subjectId) {
      query["attendanceRecords.subjectId"] = filterParams.subjectId;
    }

    // Handle date filtering with aggregation pipeline if needed
    let dateMatch = {};

    if (filterParams.date) {
      // Convert string date to Date object for exact date match
      const exactDate = new Date(filterParams.date);
      dateMatch = {
        "attendanceRecords.date": {
          $gte: new Date(exactDate.setHours(0, 0, 0, 0)),
          $lte: new Date(exactDate.setHours(23, 59, 59, 999)),
        },
      };
    } else if (filterParams.startDate || filterParams.endDate) {
      dateMatch["attendanceRecords.date"] = {};

      if (filterParams.startDate) {
        const startDate = new Date(filterParams.startDate);
        dateMatch["attendanceRecords.date"].$gte = new Date(
          startDate.setHours(0, 0, 0, 0)
        );
      }

      if (filterParams.endDate) {
        const endDate = new Date(filterParams.endDate);
        dateMatch["attendanceRecords.date"].$lte = new Date(
          endDate.setHours(23, 59, 59, 999)
        );
      }
    }

    console.log("Date filter:", dateMatch);

    // Execute query with pagination
    let studentAttendances;

    // If we need to filter by date, use aggregation
    if (Object.keys(dateMatch).length > 0) {
      studentAttendances = await StudentAttendance.aggregate([
        { $match: query },
        {
          $addFields: {
            // Filter attendance records by date
            filteredRecords: {
              $filter: {
                input: "$attendanceRecords",
                as: "record",
                cond: {
                  $and: [
                    dateMatch["attendanceRecords.date"].$gte
                      ? {
                          $gte: [
                            "$$record.date",
                            dateMatch["attendanceRecords.date"].$gte,
                          ],
                        }
                      : true,
                    dateMatch["attendanceRecords.date"].$lte
                      ? {
                          $lte: [
                            "$$record.date",
                            dateMatch["attendanceRecords.date"].$lte,
                          ],
                        }
                      : true,
                  ],
                },
              },
            },
          },
        },
        {
          $project: {
            studentId: 1,
            attendanceRecords: "$filteredRecords",
            _id: 1,
          },
        },
        { $skip: page * limit },
        { $limit: limit },
      ]).exec();

      // Manually populate references since aggregate doesn't support populate
      const populatedAttendances = await StudentAttendance.populate(
        studentAttendances,
        [
          { path: "studentId", select: "name" },
          { path: "attendanceRecords.classId", select: "name" },
          { path: "attendanceRecords.subjectId", select: "name" },
        ]
      );

      studentAttendances = populatedAttendances;
    } else {
      // No date filtering needed, use regular find
      studentAttendances = await StudentAttendance.find(query, projections)
        .skip(page * limit)
        .limit(limit)
        .populate("studentId", "name")
        .populate("attendanceRecords.classId", "name")
        .populate("attendanceRecords.subjectId", "name")
        .lean(); // Convert to plain JS objects
    }

    // Format the results
    const formattedStudentAttendances = studentAttendances.map((record) => ({
      _id: record.studentId?._id,
      name: record.studentId?.name,
      attendanceRecords: (record.attendanceRecords || []).map((attendance) => ({
        // No need for toObject here since we're using lean() or aggregate
        ...(attendance || {}),
        className: attendance?.classId?.name,
        subjectName: attendance?.subjectId?.name,
        classId: attendance?.classId?._id,
        subjectId: attendance?.subjectId?._id,
      })),
    }));

    // Get total count for pagination info
    const total = await StudentAttendance.countDocuments(query);

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
