import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Remark from "@/models/Remark";
import Class from "@/models/Class";
import { apiResponse } from "@/lib/apiResponse";
import { parseUser } from "@/lib/utils";
import { headers } from "next/headers";

// @desc GET all remarks
// @route GET /api/remarks
export async function GET(req) {
  try {
    await connectToDB();

    const headerStore = headers();
    const user = parseUser(headerStore);
    const activeRole = headerStore.get("active-role");

    let remarks;

    if (activeRole === "College Admin") {
      // College Admin can see all remarks
      remarks = await Remark.find({})
        .populate("studentId", "name")
        .populate("teacherId", "name")
        .populate("classId", "name")
        .sort({ createdAt: -1 });
    } else if (activeRole === "Teacher") {
      // Teacher can only see remarks for their own class
      const teacherClass = await Class.findOne({ teacherId: user.userId });
      if (!teacherClass) {
        return apiResponse.error("You are not assigned to any class.", 403);
      }
      remarks = await Remark.find({ classId: teacherClass._id })
        .populate("studentId", "name")
        .populate("teacherId", "name")
        .populate("classId", "name")
        .sort({ createdAt: -1 });
    } else {
      return apiResponse.error("You are not authorized to view remarks.", 403);
    }

    return NextResponse.json({ remarks }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error.message, 500);
  }
}

// @desc POST a new remark
// @route POST /api/remarks
export async function POST(req) {
  try {
    await connectToDB();

    const headerStore = headers();
    const user = parseUser(headerStore);

    const { studentId, classId, date, comments, status } = await req.json();

    const newRemark = new Remark({
      studentId,
      classId,
      teacherId: user.userId,
      date,
      comments,
      status,
    });

    await newRemark.save();

    return NextResponse.json({ remark: newRemark }, { status: 201 });
  } catch (error) {
    return apiResponse.error(error.message, 500);
  }
}

// @desc PUT (update) a remark
// @route PUT /api/remarks?id=<remark_id>
export async function PUT(req) {
  try {
    await connectToDB();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    const headerStore = headers();
    const user = parseUser(headerStore);
    const activeRole = headerStore.get("active-role");

    const { date, comments, status } = await req.json();

    const remark = await Remark.findById(id);

    if (!remark) {
      return apiResponse.error("Remark not found.", 404);
    }

    // Check if the user is the one who created the remark or an admin
    if (remark.teacherId.toString() !== user.userId && activeRole !== "College Admin") {
      return apiResponse.error("You are not authorized to edit this remark.", 403);
    }

    remark.date = date;
    remark.comments = comments;
    remark.status = status;

    await remark.save();

    return NextResponse.json({ remark }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error.message, 500);
  }
}

// @desc DELETE a remark
// @route DELETE /api/remarks?id=<remark_id>
export async function DELETE(req) {
  try {
    await connectToDB();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    const headerStore = headers();
    const user = parseUser(headerStore);
    const activeRole = headerStore.get("active-role");

    const remark = await Remark.findById(id);

    if (!remark) {
      return apiResponse.error("Remark not found.", 404);
    }

    // Check if the user is the one who created the remark or an admin
    if (remark.teacherId.toString() !== user.userId && activeRole !== "College Admin") {
      return apiResponse.error("You are not authorized to delete this remark.", 403);
    }

    await remark.deleteOne();

    return NextResponse.json({ message: "Remark deleted successfully." }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error.message, 500);
  }
}
