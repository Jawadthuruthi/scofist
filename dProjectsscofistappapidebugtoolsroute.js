import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import StudentsFund from "@/models/StudentsFund";

export async function GET(req) {
  try {
    await connectToDB();
    const allFunds = await StudentsFund.find({ "studentId": "657" }).lean();
    return NextResponse.json({ allFunds });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
