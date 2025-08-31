import { NextResponse } from "next/server";
import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import Team from "@/models/Team";

export async function GET(req, res) {
  try {
    await connectToDB();

    // Parse URL to get search params
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "0");
    const limit = parseInt(url.searchParams.get("limit")) || Infinity;

    // Build filter object from query parameters
    const filterParams = {};
    for (const [key, value] of url.searchParams.entries()) {
      // Skip pagination parameters
      if (key !== "page" && key !== "limit" && key !== "projection") {
        filterParams[key] = value;
      }
    }

    // Get projection param
    const projectionParam = url.searchParams.get("projection");
    let projections = {};

    // Convert projection param to MongoDB projection object
    if (projectionParam) {
      const fields = projectionParam.split(",");
      fields.forEach((field) => {
        projections[field] = 1; // Include each field
      });
    }

    // Build MongoDB query from filter params
    const query = {};

    if (filterParams?._id) {
      query._id = filterParams._id;
    }
    if (filterParams.name) {
      query.name = { $regex: filterParams.name, $options: "i" };
    }
    if (filterParams.leaderId) {
      query.leaderId = filterParams.leaderId;
    }
    if (filterParams.membersId) {
      query.membersId = { $in: filterParams.membersId };
    }

    // Execute query with pagination
    const teams = await Team.find(query, projections)
      .populate("leaderId", ["_id", "name"])
      .populate("membersId", ["_id", "name"])
      .skip(page * limit)
      .limit(limit)
      .collation({ locale: "en_US", numericOrdering: true });

    // Get total count for pagination info
    const total = await Team.countDocuments(query);

    const formattedTeams = teams
      .map((team) => ({
        ...team.toObject(),
        leaderId: team.leaderId?._id,
        leaderName: team.leaderId?.name || "Unknown",
        membersCount: team.membersId?.length || 0,
        totalPoints: (team.stagePoints || 0) + (team.offStagePoints || 0),
        membersId: team.membersId?.map((member) => member._id) || [],
        membersNames: team.membersId?.map((member) => member.name) || [],
      }))
      ?.sort((a, b) =>
        filterParams.sortByPoints === "true" ? b.totalPoints - a.totalPoints : 0
      );

    return NextResponse.json(
      {
        teams: formattedTeams,
        pagination: {
          page,
          limit,
          total,
          totalPages:
            limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
        },
        message: "Teams fetched successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching teams:", error);
    return apiResponse.error(error);
  }
}

export async function POST(req, res) {
  try {
    await connectToDB();
    const data = await req.json();

    // Create new team
    const team = await Team.create(data);

    return NextResponse.json(
      { message: "Team created successfully!", team },
      { status: 201 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function PUT(req, res) {
  try {
    await connectToDB();
    const data = await req.json();

    const { ids } = data;

    if (!ids || ids.length === 0) {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    const team = await Team.findOneAndUpdate(
      { _id: ids[0] },
      { $set: data },
      { new: true }
    );

    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Team updated successfully!", team },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function DELETE(req, res) {
  try {
    await connectToDB();
    const data = await req.json();

    const { ids } = data;

    if (!ids || ids.length === 0) {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    const deletedTeams = await Team.deleteMany({ _id: { $in: ids } });

    if (deletedTeams.deletedCount === 0) {
      return NextResponse.json(
        { message: "No teams found to delete" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Teams deleted successfully!", deletedTeams },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
