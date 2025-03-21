import { verifyToken } from "@/lib/auth";
import connectToDB from "@/lib/db";
import User from "@/models/User";
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
    if (filterParams.roles) {
      query.roles = { $in: filterParams.roles };
    }
    if (filterParams.status) {
      query.status = filterParams.status;
    }

    // Execute query with pagination
    const users = await User.find(query)
      .skip(page * limit)
      .limit(limit)
      .sort({ updatedAt: -1 });

    // Get total count for pagination info
    const total = await User.countDocuments(query);

    return NextResponse.json(
      {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) - 1,
        },
        message: "Users fetched successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.log(error.message);
    return NextResponse.json(
      { message: "Error fetching users" },
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
    const { _id, name, status } = await req.json();
    const newUser = await User.create({
      _id,
      name,
      status,
    });
    return NextResponse.json(
      { newUser, message: "User created successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.log(error.message);

    // Handle duplicate key error (MongoDB error code 11000)
    const field = Object.keys(error.keyPattern)[0] === "_id" ? "ID" : "Name";

    if (error.code === 11000) {
      return NextResponse.json(
        { message: `User with this ${field} already exists.` },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: "Error creating user" },
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
    const { ids, name, status } = body;

    const _id = ids[0];

    if (ids.length > 1) {
      const updatedUsers = await User.updateMany(
        { _id: { $in: ids } },
        { $set: { name, status } }
      );
      return NextResponse.json(
        { updatedUsers, message: "Users updated successfully" },
        { status: 200 }
      );
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id },
      { name, status },
      { new: true }
    );
    return NextResponse.json(
      { updatedUser, message: "User updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.log(error.message);
    return NextResponse.json(
      { message: "Error updating user" },
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
      const deletedUsers = await User.deleteMany({ _id: { $in: ids } });
      return NextResponse.json(
        { deletedUsers, message: "Users deleted successfully" },
        { status: 200 }
      );
    }
    const deletedUser = await User.findByIdAndDelete(_id);
    return NextResponse.json(
      { deletedUser, message: "User deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.log(error.message);
    return NextResponse.json(
      { message: "Error deleting user" },
      { status: 500 }
    );
  }
}
