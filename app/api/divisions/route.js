import { NextResponse } from "next/server";
import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import Division from "@/models/Division";

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
      query._id = filterParams?._id;
    }
    if (filterParams.name) {
      query.name = { $regex: filterParams.name, $options: "i" };
    }

    if (filterParams.type) {
      query.type = filterParams.type;
    }
    if (filterParams.subDivisions) {
      query.subDivisions = { $in: filterParams.subDivisions };
    }
    if (filterParams.participantsId) {
      query.participantsId = { $in: filterParams.participantsId };
    }

    // Execute query with pagination
    const divisions = await Division.find(query, projections)
      .populate("subDivisions", ["_id", "name"])
      .populate("participantsId", ["_id", "name"])
      .skip(page * limit)
      .limit(limit)
      .sort({ _id: 1 })
      .collation({ locale: "en_US", numericOrdering: true });
    // Get total count for pagination info
    const total = await Division.countDocuments(query);

    const formattedDivisions = divisions.map((division) => ({
      ...division.toObject(),
      subDivisions: division.subDivisions.map((sub) => sub._id),
      subDivisionsName: division.subDivisions.map((sub) => sub.name),
      chestNumberStartsAt: division.chestNumberRange?.from || 0,
      participantsCount: division.participantsId?.length || 0,
      programsCount: division.programsId?.length || 0,
    }));

    return NextResponse.json(
      {
        divisions: formattedDivisions,
        pagination: {
          page,
          limit,
          total,
          totalPages:
            limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
        },
        message: "Divisions fetched successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching divisions:", error);
    return apiResponse.error(error);
  }
}

export async function POST(req, res) {
  try {
    await connectToDB();
    const data = await req.json();

    // Create new division
    const divisions = await Division.create(data);

    return NextResponse.json(
      { message: "Division created successfully!", divisions },
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

    const division = await Division.findOneAndUpdate(
      { _id: ids[0] },
      { $set: data },
      { new: true }
    );

    return NextResponse.json(
      { message: "Division updated successfully!", division },
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

    const deletedDivisions = await Division.deleteMany({ _id: { $in: ids } });

    return NextResponse.json(
      { message: "Divisions deleted successfully!", deletedDivisions },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
