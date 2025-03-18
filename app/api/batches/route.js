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

    const batches = await Batch.find({});
    return NextResponse.json(
      { batches, message: "Batches fetched successfully" },
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

    const field = Object.keys(error.keyPattern)[0] === "_id" ? "ID" : "name";
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
