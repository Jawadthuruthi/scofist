import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function POST(req, res) {
  try {
    await connectToDB();
    const { userId } = await req.json();
    const user = await User.findById(userId);
    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error);
  }
}
