import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import Class from "@/models/Class";
import User from "@/models/User";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/repair-class-assignments
 * Dry-run: shows what would be changed (move students from "Plus Two B" to "Plus Two")
 *
 * POST /api/repair-class-assignments
 * Actually performs the fix: moves all students from "Plus Two B" to "Plus Two"
 */

export async function GET(req) {
  try {
    await connectToDB();

    const url = new URL(req.url);
    const fromClassId = url.searchParams.get("from"); // e.g. "PLUS-TWO-B"
    const toClassId = url.searchParams.get("to");     // e.g. "PLUS-TWO"

    if (!fromClassId || !toClassId) {
      return NextResponse.json(
        { message: "Please provide 'from' and 'to' class IDs as query params. e.g. ?from=PLUS-TWO-B&to=PLUS-TWO" },
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
        { message: "Please provide 'fromClassId' and 'toClassId' in the request body." },
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

    // Update all students with classId = fromClassId to toClassId
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
