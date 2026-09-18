import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Result from "@/models/Result";
import Team from "@/models/Team";
import Participant from "@/models/Participant";
import { getYear } from "@/lib/getYear";
import apiResponse from "@/lib/apiResponse";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    await connectToDB();
    const activeYear = await getYear(req);

    console.log("[team-points-publish] Publishing snapshot for year:", activeYear);

    // 1. Fetch all teams for this year
    const teams = await Team.find({ year: activeYear }).lean();
    const teamMap = {};
    teams.forEach((team) => {
      teamMap[team._id.toString()] = {
        _id: team._id.toString(),
        name: team.name,
        points: 0,
        color: team.color || "#808080",
      };
    });

    // 2. Fetch all currently declared results for this year
    const declaredResults = await Result.find({
      isResultDeclared: true,
      year: activeYear,
    }).lean();

    const totalResults = declaredResults.length;
    console.log("[team-points-publish] Declared results:", totalResults);

    // 3. Collect all participant IDs from these results
    const participantIds = new Set();
    declaredResults.forEach((res) => {
      (res.participants || []).forEach((p) => {
        if (p.id) participantIds.add(p.id.toString());
      });
    });

    // 4. Fetch participants directly (avoids populate issues)
    const participantDocs = await Participant.find({
      _id: { $in: Array.from(participantIds) },
    })
      .select("_id teamId")
      .lean();

    const participantTeamMap = {};
    participantDocs.forEach((p) => {
      participantTeamMap[p._id.toString()] = p.teamId?.toString();
    });

    // 5. Sum points per team
    declaredResults.forEach((res) => {
      (res.participants || []).forEach((p) => {
        if (!p.id || !p.points) return;
        const teamId = participantTeamMap[p.id.toString()];
        if (teamId && teamMap[teamId]) {
          teamMap[teamId].points += p.points;
        }
      });
    });

    const teamsArray = Object.values(teamMap).sort(
      (a, b) => b.points - a.points
    );

    const newSnapshot = {
      year: activeYear,
      publishedAt: new Date(),
      totalResults,
      teams: teamsArray,
    };

    // 6. Use raw MongoDB driver to save snapshot — bypasses Mongoose model
    //    caching / schema issues entirely.
    const db = mongoose.connection.db;
    const settingsCol = db.collection("settings");

    // Remove existing snapshot for this year, then push the new one
    await settingsCol.updateOne(
      {},
      { $pull: { teamPointsSnapshot: { year: activeYear } } }
    );
    await settingsCol.updateOne(
      {},
      { $push: { teamPointsSnapshot: newSnapshot } },
      { upsert: true }
    );

    console.log(
      `[team-points-publish] Snapshot saved: ${totalResults} results, ${teamsArray.length} teams`
    );
    teamsArray.forEach((t) =>
      console.log(`  ${t.name}: ${t.points} pts`)
    );

    try {
      revalidatePath(`/team-points/[year]`, 'page');
      revalidatePath(`/(client)/team-points/[year]`, 'page');
      revalidatePath(`/team-points/${activeYear}`);
      revalidatePath(`/team-points`);
    } catch (err) {
      console.warn("Failed to revalidate path:", err);
    }

    return NextResponse.json(
      {
        message: "Team points published successfully!",
        year: activeYear,
        totalResults,
        teams: teamsArray,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error publishing team points:", error);
    return apiResponse.error(error);
  }
}
