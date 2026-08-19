import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Participant from "@/models/Participant";
import User from "@/models/User";
import { getYear } from "@/lib/getYear";
import Division from "@/models/Division";
import Team from "@/models/Team";
import Program from "@/models/Program";

export async function POST(request) {
  try {
    await connectToDB();
    const body = await request.json();
    const { chestNumber, dateOfBirth } = body;

    if (!chestNumber || !dateOfBirth) {
      return NextResponse.json(
        { success: false, message: "Chest number and date of birth are required" },
        { status: 400 }
      );
    }

    const year = await getYear(request);

    // 1. Find Participant by chestNumber and year
    const participant = await Participant.findOne({
      chestNumber: Number(chestNumber),
      year,
    })
      .populate("teamId", "name type color")
      .populate("divisionId", "name type")
      .lean();

    if (!participant) {
      return NextResponse.json(
        { success: false, message: "Participant not found for the given chest number" },
        { status: 404 }
      );
    }

    // 2. Find associated User and verify Date of Birth
    const userId = participant._id.split("-")[0]; // extract base user ID if modified, though _id is the ref
    const user = await User.findById(userId).lean();

    if (!user || !user.dateOfBirth) {
      return NextResponse.json(
        { success: false, message: "User record or date of birth not found" },
        { status: 404 }
      );
    }

    // Compare date of birth (strip time from both for reliable comparison)
    const providedDob = new Date(dateOfBirth).toISOString().split('T')[0];
    const actualDob = new Date(user.dateOfBirth).toISOString().split('T')[0];

    if (providedDob !== actualDob) {
      return NextResponse.json(
        { success: false, message: "Incorrect date of birth" },
        { status: 401 }
      );
    }

    // 3. Populate Program details properly to match ParticipantsCard expectations
    if (participant.programs && participant.programs.length > 0) {
      const programIds = participant.programs.map((p) => p.id);
      const programsInfo = await Program.find({ _id: { $in: programIds } })
        .populate("divisionId", "name type")
        .lean();
      
      const programMap = {};
      programsInfo.forEach((p) => {
        programMap[String(p._id)] = p;
      });

      participant.programs = participant.programs.map((p) => {
        const pInfo = programMap[String(p.id)];
        return {
          ...p,
          ...pInfo,
          divisionId: pInfo?.divisionId?._id || p.divisionId,
          divisionType: pInfo?.divisionId?.type,
          divisionName: pInfo?.divisionId?.name,
        };
      });
    }

    // 4. Compute processedPrograms for the back side of the card
    const rawPrograms = participant.programs || [];
    const allPrograms = [...rawPrograms].sort((a, b) => {
      const aIsSec = a.divisionType === "Secondary";
      const bIsSec = b.divisionType === "Secondary";
      if (aIsSec !== bIsSec) return aIsSec ? 1 : -1;
      if (aIsSec && bIsSec && a.divisionId !== b.divisionId) {
        return (a.divisionId || "").localeCompare(b.divisionId || "");
      }
      if (a.category !== b.category) return a.category === "Stage" ? -1 : 1;
      return 0;
    });

    const counts = {};
    const processedPrograms = allPrograms.map((p) => {
      const key = p.divisionType === "Secondary"
        ? `Sec-${p.divisionId}-${p.category}`
        : `Pri-${p.category}`;
      if (!counts[key]) counts[key] = 0;
      counts[key]++;
      return { ...p, displayIndex: counts[key] };
    });

    const MAX_PROGRAMS = 16;
    const totalPages = Math.ceil(processedPrograms.length / MAX_PROGRAMS) || 1;

    const formattedParticipant = {
      ...participant,
      originalId: participant._id, // Used for QR code
      teamName: participant.teamId?.name || "",
      divisionName: participant.divisionId?.name || "",
      profilePic: user.profilePic?.url || null,
      processedPrograms,
      totalPages,
      allPrograms,
    };

    return NextResponse.json({
      success: true,
      participant: formattedParticipant,
      divisions: [participant.divisionId],
      teams: [participant.teamId],
    });

  } catch (error) {
    console.error("Error in participant login:", error);
    return NextResponse.json(
      { success: false, message: "An error occurred during authentication" },
      { status: 500 }
    );
  }
}
