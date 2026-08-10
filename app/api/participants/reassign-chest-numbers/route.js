import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Participant from "@/models/Participant";
import Division from "@/models/Division";
import { getYear } from "@/lib/getYear";

/**
 * POST /api/participants/reassign-chest-numbers
 * Reassigns chest numbers for all participants in every division,
 * ordered by participant _id ascending within each division.
 */
export async function POST(req) {
  try {
    await connectToDB();

    const activeYear = await getYear(req);

    // Fetch all divisions that have a chest number range
    const divisions = await Division.find({
      chestNumberRange: { $exists: true },
    }).lean();

    if (!divisions.length) {
      return NextResponse.json(
        { message: "No divisions with chest number ranges found." },
        { status: 400 }
      );
    }

    let totalUpdated = 0;
    const divisionSummaries = [];

    for (const division of divisions) {
      const { from, to } = division.chestNumberRange;

      // Fetch all participants in this division for the active year, sorted by _id ascending
      const participants = await Participant.find(
        { divisionId: division._id, year: activeYear },
        { _id: 1, chestNumber: 1 }
      ).sort({ _id: 1 });

      if (!participants.length) {
        divisionSummaries.push({
          division: division.name,
          updated: 0,
          message: "No participants",
        });
        continue;
      }

      if (participants.length > to - from + 1) {
        divisionSummaries.push({
          division: division.name,
          updated: 0,
          message: `Not enough chest numbers in range ${from}-${to} for ${participants.length} participants`,
        });
        continue;
      }

      // Assign chest numbers sequentially starting from `from`, in _id order
      const bulkOps = participants.map((participant, index) => ({
        updateOne: {
          filter: { _id: participant._id },
          update: { $set: { chestNumber: from + index } },
        },
      }));

      await Participant.bulkWrite(bulkOps);
      totalUpdated += participants.length;

      divisionSummaries.push({
        division: division.name,
        updated: participants.length,
        range: `${from} - ${from + participants.length - 1}`,
      });
    }

    return NextResponse.json(
      {
        message: `Chest numbers reassigned for ${totalUpdated} participant(s) across ${divisionSummaries.length} division(s).`,
        divisions: divisionSummaries,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error reassigning chest numbers:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
