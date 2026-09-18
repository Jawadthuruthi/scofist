import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Result from "@/models/Result";
import Team from "@/models/Team";
import Participant from "@/models/Participant";
import { getYear } from "@/lib/getYear";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : null;

    await connectToDB();

    const activeYear = await getYear(request);
    const apiKey = request.headers.get("api-key");
    const isDashboard = !!apiKey;

    // ── PUBLIC REQUEST ── serve from the stored snapshot
    if (!isDashboard) {
      // Use raw MongoDB driver to read snapshot — avoids Mongoose schema cache issues
      const db = mongoose.connection.db;
      const settingsDoc = await db
        .collection("settings")
        .findOne({}, { projection: { teamPointsSnapshot: 1 } });

      const snapshot = (settingsDoc?.teamPointsSnapshot || []).find(
        (s) => s.year === activeYear
      );

      if (!snapshot) {
        return NextResponse.json({
          success: true,
          teams: [],
          teamColors: {},
          totalResultsAvailable: 0,
          appliedLimit: 0,
          published: false,
        });
      }

      let teams = snapshot.teams || [];
      const totalResultsAvailable = snapshot.totalResults || 0;

      if (limit !== null && !isNaN(limit) && limit >= 0) {
        teams = teams.slice(0, limit);
      }

      const teamColors = {};
      teams.forEach((t) => {
        teamColors[t.name] = t.color || "#808080";
      });

      return NextResponse.json({
        success: true,
        teams,
        teamColors,
        totalResultsAvailable,
        appliedLimit: limit !== null ? limit : totalResultsAvailable,
        publishedAt: snapshot.publishedAt,
        published: true,
      });
    }

    const teams = await Team.find({ year: activeYear }).sort({ name: 1 }).lean();
    const teamMap = {};
    teams.forEach((team) => {
      teamMap[team._id.toString()] = {
        _id: team._id.toString(),
        name: team.name,
        points: 0,
        color: team.color || "#808080",
      };
    });

    const declaredResults = await Result.find({
      isResultDeclared: true,
      year: activeYear,
    }).lean();

    const totalResultsAvailable = declaredResults.length;

    const participantIds = new Set();
    declaredResults.forEach((res) => {
      (res.participants || []).forEach((p) => {
        if (p.id) participantIds.add(p.id.toString());
      });
    });

    const participantDocs = await Participant.find({
      _id: { $in: Array.from(participantIds) },
    })
      .select("_id teamId")
      .lean();

    const participantTeamMap = {};
    participantDocs.forEach((p) => {
      participantTeamMap[p._id.toString()] = p.teamId?.toString();
    });

    let filteredResults = declaredResults;
    if (limit !== null && !isNaN(limit) && limit >= 0) {
      filteredResults = filteredResults.slice(0, limit);
    }

    filteredResults.forEach((res) => {
      (res.participants || []).forEach((p) => {
        if (!p.id || !p.points) return;
        const teamId = participantTeamMap[p.id.toString()];
        if (teamId && teamMap[teamId]) {
          teamMap[teamId].points += p.points;
        }
      });
    });

    const teamPointsArray = teams.map(team => teamMap[team._id.toString()]);

    const teamColors = {};
    teams.forEach((t) => {
      teamColors[t.name] = t.color || "#808080";
    });

    return NextResponse.json({
      success: true,
      teams: teamPointsArray,
      teamColors,
      totalResultsAvailable,
      appliedLimit: limit !== null ? limit : totalResultsAvailable,
    });
  } catch (error) {
    console.error("Error fetching team points poster:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch team points" },
      { status: 500 }
    );
  }
}
