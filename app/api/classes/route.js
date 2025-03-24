import { apiResponse } from "@/lib/apiResponse";
import { verifyToken } from "@/lib/auth";
import connectToDB from "@/lib/db";
import Class from "@/models/Class";
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

    if (filterParams.name) {
      query.name = { $regex: filterParams.name, $options: "i" };
    }
    if (filterParams.batchId) {
      query.batchId = batchId;
    }
    if (filterParams.teacherId) {
      query.teacherId = teacherId;
    }

    // Execute query with pagination
    const classes = await Class.find(query)
      .skip(page * limit)
      .limit(limit)
      .sort({ updatedAt: -1 });

    // Get total count for pagination info
    const total = await Class.countDocuments(query);

    return NextResponse.json(
      {
        classes,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) - 1,
        },
        message: "Classes fetched successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
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
    const { _id, name, batchId, teacherId } = await req.json();
    const newClass = await Class.create({
      _id,
      name,
      batchId,
      teacherId,
    });
    return NextResponse.json(
      { newClass, message: "Class created successfully" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
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
    const { ids, name, batchId, teacherId } = body;

    const _id = ids[0];

    if (ids.length > 1) {
      const updatedClasses = await Class.updateMany(
        { _id: { $in: ids } },
        { $set: { name, batchId, teacherId } }
      );
      return NextResponse.json(
        { updatedClasses, message: "Classes updated successfully" },
        { status: 200 }
      );
    }

    const updatedClass = await Class.findOneAndUpdate(
      { _id },
      { name, batchId, teacherId },
      { new: true }
    );
    return NextResponse.json(
      { updatedClass, message: "Class updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
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
      const deletedClasses = await Class.deleteMany({ _id: { $in: ids } });
      return NextResponse.json(
        { deletedClasses, message: "Classes deleted successfully" },
        { status: 200 }
      );
    }
    const deletedClass = await Class.findByIdAndDelete(_id);
    return NextResponse.json(
      { deletedClass, message: "Class deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
