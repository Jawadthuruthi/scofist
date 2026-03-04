import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import TeacherAttendance from "@/models/TeacherAttendance";
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
    if (filterParams.teacherId) {
      query.teacherId = filterParams.teacherId;
    }

    // Use aggregation for efficient date filtering
    let pipeline = [];

    // Initial match to filter by teacherId
    pipeline.push({ $match: query });

    // Build record-level filters
    const recordFilters = {};
    if (filterParams.classId) recordFilters.classId = filterParams.classId;
    if (filterParams.batchId) recordFilters.batchId = filterParams.batchId;
    if (filterParams.subjectId) recordFilters.subjectId = filterParams.subjectId;

    // Always apply $addFields / $filter to handle date + record-level filters
    if (
      filterParams.date ||
      filterParams.startDate ||
      filterParams.endDate ||
      recordFilters.classId ||
      recordFilters.batchId ||
      recordFilters.subjectId
    ) {
      let dateConditions = [];

      if (filterParams.date) {
        const exactDate = new Date(filterParams.date);
        const startOfDay = new Date(exactDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(exactDate);
        endOfDay.setHours(23, 59, 59, 999);
        dateConditions.push({ $gte: ["$$record.date", startOfDay] });
        dateConditions.push({ $lte: ["$$record.date", endOfDay] });
      } else {
        if (filterParams.startDate) {
          const startDate = new Date(filterParams.startDate);
          startDate.setHours(0, 0, 0, 0);
          dateConditions.push({ $gte: ["$$record.date", startDate] });
        }
        if (filterParams.endDate) {
          const endDate = new Date(filterParams.endDate);
          endDate.setHours(23, 59, 59, 999);
          dateConditions.push({ $lte: ["$$record.date", endDate] });
        }
      }

      const idConditions = [
        ...(recordFilters.classId
          ? [{ $eq: [{ $toString: "$$record.classId" }, recordFilters.classId] }]
          : []),
        ...(recordFilters.batchId
          ? [{ $eq: [{ $toString: "$$record.batchId" }, recordFilters.batchId] }]
          : []),
        ...(recordFilters.subjectId
          ? [{ $eq: [{ $toString: "$$record.subjectId" }, recordFilters.subjectId] }]
          : []),
      ];

      const allConditions = [...dateConditions, ...idConditions];

      pipeline.push({
        $addFields: {
          attendanceRecords: {
            $filter: {
              input: "$attendanceRecords",
              as: "record",
              cond: allConditions.length > 1 ? { $and: allConditions } : allConditions[0] || true,
            },
          },
        },
      });
    }

    // Only include docs with matching attendance records
    pipeline.push({
      $match: {
        "attendanceRecords.0": { $exists: true }, // At least one record after filtering
      },
    });

    // Pagination
    pipeline.push({ $skip: page * limit });
    if (limit !== Infinity) {
      pipeline.push({ $limit: limit });
    }

    // Execute the aggregation pipeline
    let teacherAttendances = await TeacherAttendance.aggregate(pipeline).exec();

    // Manually populate references since aggregation doesn't support populate
    teacherAttendances = await TeacherAttendance.populate(teacherAttendances, [
      { path: "teacherId", select: "name" },
      { path: "attendanceRecords.classId", select: "name" },
      { path: "attendanceRecords.subjectId", select: "name" },
    ]);

    // Format the results
    const formattedTeacherAttendances = teacherAttendances.map((record) => ({
      _id: record.teacherId?._id,
      name: record.teacherId?.name,
      attendanceRecords: (record.attendanceRecords || []).map((attendance) => ({
        ...(attendance || {}),
        classId: attendance.classId?._id,
        className: attendance.classId?.name,
        subjectId: attendance.subjectId?._id,
        subjectName: attendance.subjectId?.name,
      })),
    }));

    // Get total count for pagination info - use efficient countDocuments
    const countPipeline = [
      ...pipeline.filter((stage) => !stage.$skip && !stage.$limit),
    ];
    countPipeline.push({ $count: "total" });
    const countResult = await TeacherAttendance.aggregate(countPipeline).exec();
    const total = countResult.length > 0 ? countResult[0].total : 0;

    return NextResponse.json(
      {
        teacherAttendances: formattedTeacherAttendances,
        pagination: {
          page,
          limit,
          total,
          totalPages:
            limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
        },
        message: "Teacher attendance records fetched successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching teacher attendances:", error);
    return apiResponse.error(error);
  }
}

export async function POST(req, res) {
  try {
    await connectToDB();

    const body = await req.json();

    // Validate required fields for manual teacher attendance creation
    const requiredFields = ["teacherId", "attendanceRecords"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { message: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Make sure each attendance record has a date
    for (const record of body.attendanceRecords) {
      if (!record.date) {
        return NextResponse.json(
          { message: "Each attendance record must have a date" },
          { status: 400 }
        );
      }
    }

    // Use findOneAndUpdate to atomically update in one operation
    const teacherAttendance = await TeacherAttendance.findOne({
      teacherId: body.teacherId,
    });

    if (teacherAttendance) {
      // Update existing records and add new ones in memory
      const updatedRecords = [...teacherAttendance.attendanceRecords];
      const newRecords = [];

      for (const newRecord of body.attendanceRecords) {
        // Convert dates to ISO strings for comparison
        const newRecordDateString = new Date(newRecord.date)
          .toISOString()
          .split("T")[0];

        const existingIndex = updatedRecords.findIndex(
          (existing) =>
            existing.classId.toString() === newRecord.classId.toString() &&
            existing.subjectId.toString() === newRecord.subjectId.toString() &&
            existing.periodNumber === newRecord.periodNumber &&
            existing.day === newRecord.day &&
            new Date(existing.date).toISOString().split("T")[0] ===
            newRecordDateString
        );

        if (existingIndex === -1) {
          // Add new record with current timestamp
          newRecords.push({
            ...newRecord,
            markedAt: new Date(),
          });
        } else {
          // Update existing record with new values and timestamp
          updatedRecords[existingIndex] = {
            ...updatedRecords[existingIndex],
            ...newRecord,
            markedAt: new Date(),
          };
        }
      }

      // Use updateOne to efficiently update the document
      await TeacherAttendance.updateOne(
        { teacherId: body.teacherId },
        {
          $set: { attendanceRecords: [...updatedRecords, ...newRecords] },
        }
      );

      // Return updated document
      const updated = await TeacherAttendance.findOne({
        teacherId: body.teacherId,
      });
      return NextResponse.json(
        {
          teacherAttendance: updated,
          message: "Teacher attendance updated successfully",
        },
        { status: 200 }
      );
    } else {
      // Create new record using insertOne for better performance
      const newAttendance = {
        teacherId: body.teacherId,
        attendanceRecords: body.attendanceRecords.map((record) => ({
          ...record,
          markedAt: new Date(),
        })),
      };

      const result = await TeacherAttendance.create(newAttendance);

      return NextResponse.json(
        {
          teacherAttendance: result,
          message: "Teacher attendance created successfully",
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("Error creating teacher attendance:", error);
    return apiResponse.error(error);
  }
}

export async function PUT(req, res) {
  try {
    await connectToDB();

    const body = await req.json();
    const { teacherId, attendanceRecordIds, updates } = body;

    if (!teacherId || !attendanceRecordIds || !updates) {
      return NextResponse.json(
        { message: "teacherId, attendanceRecordIds, and updates are required" },
        { status: 400 }
      );
    }

    // Use array filter to update multiple records in one operation
    const updateOperations = attendanceRecordIds.map((id) => {
      return {
        "attendanceRecords.$[elem]": {
          ...updates,
          markedAt: new Date(),
        },
      };
    });

    // Use update with array filters for efficient updates
    const result = await TeacherAttendance.updateOne(
      { teacherId },
      { $set: updateOperations[0] },
      {
        arrayFilters: [{ "elem._id": { $in: attendanceRecordIds } }],
        new: true,
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Teacher attendance record not found" },
        { status: 404 }
      );
    }

    // Fetch the updated document
    const updatedAttendance = await TeacherAttendance.findOne({ teacherId })
      .populate("teacherId", "name")
      .populate("attendanceRecords.classId", "name")
      .populate("attendanceRecords.subjectId", "name");

    return NextResponse.json(
      {
        teacherAttendance: updatedAttendance,
        message: "Teacher attendance record updated successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating teacher attendance:", error);
    return apiResponse.error(error);
  }
}

export async function DELETE(req, res) {
  try {
    await connectToDB();

    const { teacherId, attendanceRecordIds } = await req.json();

    if (!teacherId || !attendanceRecordIds || !attendanceRecordIds.length) {
      return NextResponse.json(
        { message: "teacherId and attendanceRecordIds are required" },
        { status: 400 }
      );
    }

    // Use $pull operator to efficiently remove items from array
    const result = await TeacherAttendance.updateOne(
      { teacherId },
      {
        $pull: {
          attendanceRecords: {
            _id: { $in: attendanceRecordIds.map((id) => id.toString()) },
          },
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Teacher attendance record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: `Successfully deleted ${result.modifiedCount} attendance records`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting attendance records:", error);
    return apiResponse.error(error);
  }
}
