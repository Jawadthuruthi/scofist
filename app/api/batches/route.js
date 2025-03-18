import { verifyToken } from "@/lib/auth";
import connectToDB from "@/lib/db";
import Batch from "@/models/Batch";
import { NextResponse } from "next/server";

export async function GET(req, res) {
  try {
    const apiKey = req.headers.get("api-key");
    await connectToDB();
    const authorized = await verifyToken(apiKey);
    if (!authorized) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Parse URL to get search params
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "0");
    const limit = parseInt(url.searchParams.get("limit") || "0");

    // Build filter object from query parameters
    const filterParams = {};
    for (const [key, value] of url.searchParams.entries()) {
      // Skip pagination parameters
      if (key !== "page" && key !== "limit") {
        filterParams[key] = value;
      }
    }

    // Build MongoDB query from filter params
    const query = {};

    // Handle global search
    if (filterParams.search) {
      const searchRegex = { $regex: filterParams.search, $options: "i" };
      const searchQuery = [
        { name: searchRegex },
        { description: searchRegex },
        { status: searchRegex },
        // Add other text fields you want to search
      ];

      // Try to convert search string to number for numeric fields
      const numericSearch = !isNaN(filterParams.search)
        ? Number(filterParams.search)
        : null;
      if (numericSearch !== null) {
        searchQuery.push(
          { startYear: numericSearch },
          { endYear: numericSearch }
        );
      }

      query.$or = searchQuery;
    }

    // Handle specific filters
    if (filterParams.name) {
      query.name = { $regex: filterParams.name, $options: "i" };
    }
    if (filterParams.status) {
      query.status = filterParams.status;
    }
    if (filterParams.startYear) {
      query.startYear = filterParams.startYear;
    }
    if (filterParams.endYear) {
      query.endYear = filterParams.endYear;
    }

    // Execute query with pagination
    const batches = await Batch.find(query)
      .skip(page * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Get total count for pagination info
    const total = await Batch.countDocuments(query);

    return NextResponse.json(
      {
        batches,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        message: "Batches fetched successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.log(error.message);
    return NextResponse.json(
      { message: "Error fetching batches" },
      { status: 500 }
    );
  }
}

export async function POST(req, res) {
  try {
    const apiKey = req.headers.get("api-key");
    await connectToDB();
    const authorized = await verifyToken(apiKey);
    if (!authorized) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { _id, name, startYear, endYear, status } = await req.json();
    const newBatch = await Batch.create({
      _id,
      name,
      startYear,
      endYear,
      status,
    });
    return NextResponse.json(
      { newBatch, message: "Batch created successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.log(error.message);

    // Handle duplicate key error (MongoDB error code 11000)
    const field = Object.keys(error.keyPattern)[0] === "_id" ? "ID" : "Name";

    if (error.code === 11000) {
      return NextResponse.json(
        { message: `Batch with this ${field} already exists.` },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: "Error creating batch" },
      { status: 500 }
    );
  }
}

export async function PUT(req, res) {
  try {
    const apiKey = req.headers.get("api-key");
    await connectToDB();
    const authorized = await verifyToken(apiKey);
    if (!authorized) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const { ids, name, startYear, endYear, status } = body;

    const _id = ids[0];

    if (ids.length > 1) {
      const updatedBatches = await Batch.updateMany(
        { _id: { $in: ids } },
        { $set: { name, startYear, endYear, status } }
      );
      return NextResponse.json(
        { updatedBatches, message: "Batches updated successfully" },
        { status: 200 }
      );
    }

    const updatedBatch = await Batch.findOneAndUpdate(
      { _id },
      { name, startYear, endYear, status },
      { new: true }
    );
    return NextResponse.json(
      { updatedBatch, message: "Batch updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.log(error.message);
    return NextResponse.json(
      { message: "Error updating batch" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, res) {
  try {
    const apiKey = req.headers.get("api-key");
    await connectToDB();
    const authorized = await verifyToken(apiKey);
    if (!authorized) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { ids } = await req.json();
    const _id = ids[0];
    if (ids.length > 1) {
      const deletedBatches = await Batch.deleteMany({ _id: { $in: ids } });
      return NextResponse.json(
        { deletedBatches, message: "Batches deleted successfully" },
        { status: 200 }
      );
    }
    const deletedBatch = await Batch.findByIdAndDelete(_id);
    return NextResponse.json(
      { deletedBatch, message: "Batch deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.log(error.message);
    return NextResponse.json(
      { message: "Error deleting batch" },
      { status: 500 }
    );
  }
}
