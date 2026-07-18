import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import Class from "@/models/Class";
import User from "@/models/User";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/repair-class-assignments
 * No params: lists ALL classes with their current student counts (to find correct class IDs)
 *
 * GET /api/repair-class-assignments?from=CLASS-ID-A&to=CLASS-ID-B
 * Dry-run: shows which students would be moved from "from" class to "to" class
 *
 * POST /api/repair-class-assignments
 * Body: { "fromClassId": "CLASS-ID-A", "toClassId": "CLASS-ID-B" }
 * Actually moves all students from one class to another
 */

export async function GET(req) {
  try {
    await connectToDB();

    const url = new URL(req.url);
    const fromClassId = url.searchParams.get("from");
    const toClassId = url.searchParams.get("to");

    // If no params — list all classes with student counts so admin can find correct IDs
    if (!fromClassId && !toClassId) {
      const allClasses = await Class.find({}).lean();

      // Count students per class
      const classCounts = await User.aggregate([
        { $match: { roles: "Student" } },
        { $group: { _id: "$studentSpecificField.classId", count: { $sum: 1 } } },
      ]);
      const countMap = {};
      classCounts.forEach((c) => { countMap[String(c._id)] = c.count; });

      const result = allClasses.map((cls) => ({
        _id: cls._id,
        name: cls.name,
        batchId: cls.batchId,
        status: cls.status,
        studentCount: countMap[String(cls._id)] || 0,
      }));

      return NextResponse.json({
        message: "All classes with student counts. Use ?from=CLASS-ID&to=CLASS-ID for a dry run.",
        classes: result,
        usage: "GET ?from=PLUS-TWO-B&to=PLUS-TWO → dry run | POST { fromClassId, toClassId } → fix",
      });
    }

    if (!fromClassId || !toClassId) {
      return NextResponse.json(
        { message: "Provide both 'from' and 'to' query params. e.g. ?from=PLUS-TWO-B&to=PLUS-TWO" },
        { status: 400 }
      );
    }

    const fromClass = await Class.findById(fromClassId).lean();
    const toClass = await Class.findById(toClassId).lean();

    if (!fromClass) {
      return NextResponse.json({ message: `Class not found: ${fromClassId}` }, { status: 404 });
    }
    if (!toClass) {
      return NextResponse.json({ message: `Class not found: ${toClassId}` }, { status: 404 });
    }

    // Find students currently assigned to the "from" class
    const studentsInFromClass = await User.find({
      roles: "Student",
      "studentSpecificField.classId": fromClassId,
    })
      .select("_id name studentSpecificField.classId studentSpecificField.batchId studentSpecificField.admissionNumber studentSpecificField.status")
      .lean();

    return NextResponse.json({
      message: `Dry run: Found ${studentsInFromClass.length} students in '${fromClass.name}' (${fromClassId}) that would be moved to '${toClass.name}' (${toClassId}).`,
      fromClass: { _id: fromClass._id, name: fromClass.name, batchId: fromClass.batchId },
      toClass: { _id: toClass._id, name: toClass.name, batchId: toClass.batchId },
      studentsCount: studentsInFromClass.length,
      students: studentsInFromClass.map((s) => ({
        _id: s._id,
        name: s.name,
        admissionNumber: s.studentSpecificField?.admissionNumber,
        currentClassId: s.studentSpecificField?.classId,
        status: s.studentSpecificField?.status,
      })),
    });
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function POST(req) {
  try {
    await connectToDB();

    const { fromClassId, toClassId } = await req.json();

    if (!fromClassId || !toClassId) {
      return NextResponse.json(
        { message: "Provide 'fromClassId' and 'toClassId' in the request body." },
        { status: 400 }
      );
    }

    const fromClass = await Class.findById(fromClassId).lean();
    const toClass = await Class.findById(toClassId).lean();

    if (!fromClass) {
      return NextResponse.json({ message: `Class not found: ${fromClassId}` }, { status: 404 });
    }
    if (!toClass) {
      return NextResponse.json({ message: `Class not found: ${toClassId}` }, { status: 404 });
    }

    // Move all students from fromClass → toClass
    const result = await User.updateMany(
      {
        roles: "Student",
        "studentSpecificField.classId": fromClassId,
      },
      {
        $set: { "studentSpecificField.classId": toClassId },
      }
    );

    console.log(
      `[RepairClassAssignments] Moved ${result.modifiedCount} students from '${fromClass.name}' (${fromClassId}) to '${toClass.name}' (${toClassId}).`
    );

    return NextResponse.json({
      message: `Successfully moved ${result.modifiedCount} students from '${fromClass.name}' to '${toClass.name}'.`,
      fromClass: { _id: fromClass._id, name: fromClass.name },
      toClass: { _id: toClass._id, name: toClass.name },
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    return apiResponse.error(error);
  }
}
