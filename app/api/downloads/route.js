import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Download from "@/models/Download";
import { apiResponse } from "@/lib/apiResponse";

export async function GET(req, res) {
  try {
    await connectToDB();
    const url = new URL(req.url);
    const searchParams = {};
    for (const [key, value] of url.searchParams.entries()) {
      searchParams[key] = value;
    }

    const query = {};
    if (searchParams.year) {
      query.year = searchParams.year;
    }
    if (searchParams.semester) {
      query.semester = searchParams.semester;
    }

    const downloads = await Download.find(query).sort({ createdAt: -1 });

    return NextResponse.json({ downloads }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function POST(req, res) {
  try {
    await connectToDB();
    const { title, year, semester, subject, fileUrl } = await req.json();

    const newDownload = new Download({
      title,
      year,
      semester,
      subject,
      fileUrl,
    });

    await newDownload.save();
    return NextResponse.json({ newDownload }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error);
  }
}
