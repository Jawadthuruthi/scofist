import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Performance from "@/models/Performance";
import Class from "@/models/Class";
import User from "@/models/User";
import { apiResponse } from "@/lib/apiResponse";
import { parseUser } from "@/lib/utils";
import { headers, cookies } from "next/headers";

// @desc GET all performances
// @route GET /api/performance
export async function GET(req) {
  try {
    await connectToDB();

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "0");
    const limit = parseInt(url.searchParams.get("limit")) || Infinity;

    const filterParams = {};
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== "page" && key !== "limit" && key !== "projection") {
        filterParams[key] = value;
      }
    }

    const headerStore = headers();
    const cookieStore = cookies();
    const user = parseUser(headerStore);
    const activeRole = cookieStore.get("active-role")?.value || headerStore.get("active-role");

    let query = {};

    const isMyRecords = filterParams.myRecords === "true" || url.searchParams.get("myRecords") === "true";

    if (activeRole === "Teacher") {
      if (isMyRecords) {
        query.teacherId = user.userId;
      } else {
        const teacherClass = await Class.findOne({ teacherId: user.userId });
        if (!teacherClass) {
          return apiResponse.error("You are not assigned to any class.", 403);
        }
        query.classId = teacherClass._id.toString();
      }
    } else if (activeRole === "Literary Leader") {
      query.teacherId = user.userId;
    } else if (activeRole !== "College Admin") {
      return apiResponse.error("You are not authorized to view performances.", 403);
    }

    if (filterParams.classId) query.classId = filterParams.classId;
    if (filterParams.studentId) query.studentId = filterParams.studentId;
    if (filterParams.status) query.status = filterParams.status;
    if (filterParams.teacherId) query.teacherId = filterParams.teacherId;
    if (filterParams.comments) query.comments = { $regex: filterParams.comments, $options: "i" };

    if (filterParams.date) {
      const startDate = new Date(filterParams.date);
      const endDate = new Date(filterParams.date);
      endDate.setDate(endDate.getDate() + 1);
      query.date = { $gte: startDate, $lt: endDate };
    }

    if (filterParams.studentName || filterParams.global) {
      const searchName = filterParams.global || filterParams.studentName;
      const students = await User.find({
        $or: [
          { name: { $regex: searchName, $options: "i" } },
          { _id: { $regex: searchName, $options: "i" } },
          { "studentSpecificField.admissionNumber": { $regex: searchName, $options: "i" } }
        ],
        roles: "Student",
      }).select("_id");
      const studentIds = students.map((s) => s._id);
      query.studentId = { $in: studentIds };
    }

    const projectionParam = url.searchParams.get("projection");
    let projections = {};

    if (projectionParam) {
      const fields = projectionParam.split(",");
      fields.forEach((field) => {
        projections[field] = 1;
      });
    }

    const performances = await Performance.find(query, projections)
      .populate("studentId", "name contactNumber studentSpecificField.admissionNumber studentSpecificField.guardianContactNumber")
      .populate("teacherId", "name")
      .populate("classId", "name")
      .skip(page * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Performance.countDocuments(query);

    const formattedPerformances = performances.map((performance) => ({
      ...performance.toObject(),
      studentId: performance.studentId?._id?.toString() || performance.studentId?.toString(),
      classId: performance.classId?._id?.toString() || performance.classId?.toString(),
      teacherId: performance.teacherId?._id?.toString() || performance.teacherId?.toString(),
      studentName: performance.studentId?.name,
      className: performance.classId?.name,
      teacherName: performance.teacherId?.name,
      contactNumber: performance.studentId?.contactNumber,
      guardianContactNumber: performance.studentId?.studentSpecificField?.guardianContactNumber,
      admissionNumber: performance.studentId?.studentSpecificField?.admissionNumber,
    }));

    return NextResponse.json(
      {
        performance: formattedPerformances,
        pagination: {
          page,
          limit,
          total,
          totalPages:
            limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
        },
        message: "Performances fetched successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error.message, 500);
  }
}

// @desc POST a new performance
// @route POST /api/performance
export async function POST(req) {
  try {
    await connectToDB();

    const headerStore = headers();
    const user = parseUser(headerStore);

    const { studentId, classId, date, comments, status, teacherId } = await req.json();

    let assignedTeacherId = user.userId;
    const cookieStore = cookies();
    const activeRole = cookieStore.get("active-role")?.value || headerStore.get("active-role");

    if (activeRole === "College Admin" && teacherId) {
      assignedTeacherId = teacherId;
    }

    const studentIds = Array.isArray(studentId) ? studentId : [studentId];
    
    const performancesToCreate = studentIds.map(id => ({
      studentId: id,
      classId,
      teacherId: assignedTeacherId,
      date,
      comments,
      status,
    }));

    const newPerformances = await Performance.insertMany(performancesToCreate);

    return NextResponse.json({ performance: newPerformances[0], performances: newPerformances, message: "Performance(s) created successfully!" }, { status: 201 });
  } catch (error) {
    return apiResponse.error(error.message, 500);
  }
}


// @desc PUT (update) a performance
// @route PUT /api/performance
export async function PUT(req) {
  try {
    await connectToDB();

    const headerStore = headers();
    const cookieStore = cookies();
    const user = parseUser(headerStore);
    const activeRole = cookieStore.get("active-role")?.value || headerStore.get("active-role");

    const { ids, date, comments, status } = await req.json();

    const performances = await Performance.find({ _id: { $in: ids } });

    if (!performances || performances.length === 0) {
      return apiResponse.error("No performances found.", 404);
    }

    for (const performance of performances) {
      if (performance.teacherId.toString() !== user.userId && activeRole !== "College Admin") {
        return apiResponse.error(`You are not authorized to edit performance ${performance._id}.`, 403);
      }
    }

    const updatedPerformances = await Performance.updateMany(
      { _id: { $in: ids } },
      { $set: { date, comments, status } }
    );

    return NextResponse.json({ updatedPerformances, message: "Performances updated successfully!" }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error.message, 500);
  }
}

// @desc DELETE a performance
// @route DELETE /api/performance
export async function DELETE(req) {
  try {
    await connectToDB();

    const headerStore = headers();
    const cookieStore = cookies();
    const user = parseUser(headerStore);
    const activeRole = cookieStore.get("active-role")?.value || headerStore.get("active-role");

    const { ids } = await req.json();

    const performances = await Performance.find({ _id: { $in: ids } });

    if (!performances || performances.length === 0) {
      return apiResponse.error("No performances found.", 404);
    }

    for (const performance of performances) {
      if (performance.teacherId.toString() !== user.userId && activeRole !== "College Admin") {
        return apiResponse.error(`You are not authorized to delete performance ${performance._id}.`, 403);
      }
    }

    await Performance.deleteMany({ _id: { $in: ids } });

    return NextResponse.json({ message: "Performances deleted successfully." }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error.message, 500);
  }
}
