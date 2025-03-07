import connectToDB from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req, res) {
  try {
    await connectToDB();
    const users = await User.find({});
    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error("Error fetching users:", error.message);
    return NextResponse.json(
      { message: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
