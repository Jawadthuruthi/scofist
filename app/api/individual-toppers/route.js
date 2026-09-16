import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Result from "@/models/Result";
import Participant from "@/models/Participant";
import Team from "@/models/Team";
import Division from "@/models/Division";
import User from "@/models/User";
import Program from "@/models/Program";
import { getYear } from "@/lib/getYear";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    await connectToDB();

    const activeYear = await getYear(request);

    // 1. Fetch primary division individual programs only
    const primaryDivisions = await Division.find({ type: "Primary", year: activeYear }).select("_id").lean();
    const primaryDivisionIds = primaryDivisions.map(d => d._id);

    const individualPrograms = await Program.find({
      type: "Individual",
      divisionId: { $in: primaryDivisionIds },
      year: activeYear
    }).select("_id").lean();
    
    const primaryIndividualProgramIds = individualPrograms.map(p => p._id.toString());

    // 2. Fetch fully declared programmatic results for those programs
    const declaredResults = await Result.find({ 
      isResultDeclared: true, 
      year: activeYear,
      programId: { $in: primaryIndividualProgramIds }
    }).lean();

    // Mapping Dictionary (Participant ID -> total accrued points)
    const pointsMap = {};

    declaredResults.forEach(res => {
      if (!res.participants) return;
      res.participants.forEach(p => {
        if (!p.id || !p.points) return;
        
        const partIdStr = p.id.toString();
        if (!pointsMap[partIdStr]) pointsMap[partIdStr] = 0;
        pointsMap[partIdStr] += p.points;
      });
    });

    const activeParticipantIds = Object.keys(pointsMap);

    // 2. Hydrate those explicitly scored participants with division and team mappings
    const activeParticipants = await Participant.find({ _id: { $in: activeParticipantIds } })
      .populate("teamId", "name color")
      .populate("divisionId", "name")
      .lean();

    // 2.5 Hydrate User photos manually by cross-referencing generic IDs directly
    const userIds = activeParticipantIds.map(id => id.split("-")[0]);
    const users = await User.find({ _id: { $in: userIds } }, "profilePic").lean();
    const userPhotoMap = {};
    users.forEach(u => {
      userPhotoMap[u._id.toString()] = u.profilePic?.url || null;
    });

    // 3. Bucket them exactly by their assigned Division Name
    const divisionBuckets = {};

    activeParticipants.forEach(p => {
      // Must have a resolved division string to bucket cleanly
      if (!p.divisionId || !p.divisionId.name) return;
      
      const divName = p.divisionId.name;
      const points = pointsMap[p._id.toString()];
      const userId = p._id.toString().split("-")[0];

      if (!divisionBuckets[divName]) {
        divisionBuckets[divName] = [];
      }

      divisionBuckets[divName].push({
        _id: p._id,
        name: p.name,
        chestNumber: p.chestNumber || "N/A",
        teamName: p.teamId?.name || "Unknown Team",
        teamColor: p.teamId?.color || "#808080",
        points: points,
        divisionName: divName,
        photo: userPhotoMap[userId] || null
      });
    });

    // 4. Iterate over buckets, sort by point totals descending, select index zero
    const finalToppers = [];

    for (const [div, candidates] of Object.entries(divisionBuckets)) {
      // Sort strictly mathematically highest points to lowest
      candidates.sort((a, b) => b.points - a.points);
      
      const maxPoints = candidates[0].points;
      
      // If there are ties, theoretically we take the first, or send all. We'll simply extract the first occurrence.
      // E.g., The absolute mathematical topper:
      finalToppers.push(candidates[0]);
    }

    // Optional: Sort alphabetically by Division Name for structured UI delivery
    finalToppers.sort((a, b) => a.divisionName.localeCompare(b.divisionName));

    return NextResponse.json({
      success: true,
      data: finalToppers
    });

  } catch (error) {
    console.error("Error fetching individual toppers:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch top individual candidates." },
      { status: 500 }
    );
  }
}
