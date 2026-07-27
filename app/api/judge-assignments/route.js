import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import JudgeAssignment from "@/models/JudgeAssignment";
import Program from "@/models/Program";
import Division from "@/models/Division";
import User from "@/models/User";

// GET - List judge assignments
export async function GET(request) {
  try {
    await connectToDB();
    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");
    const divisionId = searchParams.get("divisionId");
    const judgeId = searchParams.get("judgeId");
    const year = searchParams.get("year");

    const query = {};
    if (programId) query.programId = programId;
    if (divisionId) query.divisionId = divisionId;
    if (judgeId) query.judgeId = judgeId;
    if (year) query.year = year;

    const assignments = await JudgeAssignment.find(query)
      .sort({ judgeNumber: 1 })
      .populate("programId", "rules topics criteria");

    return NextResponse.json({ success: true, assignments });
  } catch (error) {
    console.error("Error fetching judge assignments:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch judge assignments" },
      { status: 500 }
    );
  }
}

// POST - Create a new judge assignment
export async function POST(request) {
  try {
    await connectToDB();
    const body = await request.json();
    const { judgeId, programId, divisionId, judgeNumber, year, createdBy, judgeName } = body;

    if (!judgeId || !programId || !judgeNumber || !year) {
      return NextResponse.json(
        {
          success: false,
          message: "judgeId, programId, judgeNumber, and year are required",
        },
        { status: 400 }
      );
    }

    // Check if this judgeNumber is already taken for this program/year
    const conflicting = await JudgeAssignment.findOne({
      programId,
      judgeNumber,
      year,
    });

    if (conflicting) {
      return NextResponse.json(
        {
          success: false,
          message: `Judge ${judgeNumber} is already assigned to this program.`,
        },
        { status: 409 }
      );
    }

    // Fetch program (divisionId is a plain String in the Program model)
    const program = await Program.findById(programId).select("name divisionId");

    if (!program) {
      return NextResponse.json(
        { success: false, message: "Program not found" },
        { status: 404 }
      );
    }

    // Resolve division name using the string divisionId
    const resolvedDivisionId = divisionId || program.divisionId;
    let divisionName = "";
    if (resolvedDivisionId) {
      const division = await Division.findById(resolvedDivisionId).select("name");
      divisionName = division?.name || "";
    }

    // Find the actual User account for this judgeId
    const judgeUser = await User.findById(judgeId);

    if (!judgeUser) {
      return NextResponse.json(
        { 
          success: false, 
          message: `No Judge user account found with this ID.` 
        },
        { status: 404 }
      );
    }

    const assignment = await JudgeAssignment.create({
      judgeId: judgeUser._id.toString(),
      judgeName: judgeName || judgeUser.name,
      programId,
      programName: program.name,
      divisionId: resolvedDivisionId || "",
      divisionName,
      judgeNumber,
      year,
      createdBy,
      isCompleted: false,
    });

    return NextResponse.json({ success: true, assignment }, { status: 201 });
  } catch (error) {
    console.error("Error creating judge assignment:", error);
    if (error.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          message: "A judge with this number is already assigned to this program.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, message: "Failed to create judge assignment" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a judge assignment
export async function DELETE(request) {
  try {
    await connectToDB();
    const body = await request.json();
    const { assignmentId } = body;

    if (!assignmentId) {
      return NextResponse.json(
        { success: false, message: "Assignment ID is required" },
        { status: 400 }
      );
    }

    await JudgeAssignment.findByIdAndDelete(assignmentId);

    return NextResponse.json({
      success: true,
      message: "Judge assignment removed",
    });
  } catch (error) {
    console.error("Error deleting judge assignment:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete judge assignment" },
      { status: 500 }
    );
  }
}
