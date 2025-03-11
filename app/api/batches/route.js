import connectToDB from "@/lib/db";
import Batch from "@/models/Batch";
import { NextResponse } from "next/server";

export async function GET(req, res) {
  try {
    await connectToDB();
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
    await connectToDB();
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
    return NextResponse.json(
      { message: "Error creating batch" },
      { status: 500 }
    );
  }
}

export async function PUT(req, res) {
  try {
    await connectToDB();
    const body = await req.json();
    const { _id, name, startYear, endYear, status } = body;
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
    await connectToDB();
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
