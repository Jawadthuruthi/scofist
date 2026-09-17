import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Result from "@/models/Result";
import { getYear } from "@/lib/getYear";
import apiResponse from "@/lib/apiResponse";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    await connectToDB();
    const activeYear = await getYear(req);

    // Update all declared results to be published for team points
    const updateResult = await Result.updateMany(
      { isResultDeclared: true, year: activeYear, isTeamPointsPublished: { $ne: true } },
      { $set: { isTeamPointsPublished: true } }
    );

    return NextResponse.json(
      { 
        message: "Team points published successfully!", 
        updatedCount: updateResult.modifiedCount 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error publishing team points:", error);
    return apiResponse.error(error);
  }
}
