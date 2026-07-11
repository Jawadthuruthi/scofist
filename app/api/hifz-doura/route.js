import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import HifzDoura from "@/models/HifzDoura";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    await connectToDB();

    const url = new URL(req.url);
    const year = url.searchParams.get("year");
    const classId = url.searchParams.get("classId");
    const studentId = url.searchParams.get("studentId");
    const date = url.searchParams.get("date");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    const query = {};
    if (year) query.year = year;
    if (classId) {
      if (classId.includes(",")) {
        query.classId = { $in: classId.split(",") };
      } else {
        query.classId = classId;
      }
    }
    if (studentId) query.studentId = studentId;

    if (date) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    } else if (startDate && endDate) {
      query.date = {
        $gte: new Date(`${startDate}T00:00:00.000Z`),
        $lte: new Date(`${endDate}T23:59:59.999Z`),
      };
    } else if (startDate) {
      query.date = { $gte: new Date(`${startDate}T00:00:00.000Z`) };
    } else if (endDate) {
      query.date = { $lte: new Date(`${endDate}T23:59:59.999Z`) };
    }

    const records = await HifzDoura.find(query)
      .populate("studentId", "name profilePic guardianContactNumber studentSpecificField")
      .populate("classId", "name shortname")
      .populate("recordedBy", "name")
      .sort({ date: -1, "studentId.name": 1 })
      .lean();

    return NextResponse.json(
      { records, message: "Hifz & Doura records fetched successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function POST(req) {
  try {
    await connectToDB();

    const body = await req.json();
    const { entries, recordedBy, year } = body;
    // entries: [{ studentId, classId, pagesCount, date, notes }]

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { message: "No entries provided" },
        { status: 400 }
      );
    }

    const results = await Promise.allSettled(
      entries.map(({ studentId, classId, pagesCount, date, notes }) => {
        const targetDate = new Date(date);
        const startOfDay = new Date(targetDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setUTCHours(23, 59, 59, 999);

        return HifzDoura.findOneAndUpdate(
          {
            studentId,
            date: { $gte: startOfDay, $lte: endOfDay },
          },
          {
            studentId,
            classId,
            pagesCount,
            date: targetDate,
            recordedBy,
            year,
            notes: notes || "",
          },
          { upsert: true, new: true, runValidators: true }
        );
      })
    );

    const saved = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json(
      {
        message: `${saved} record(s) saved successfully${failed > 0 ? `, ${failed} failed` : ""}`,
        saved,
        failed,
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function DELETE(req) {
  try {
    await connectToDB();

    const { ids } = await req.json();

    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { message: "No IDs provided" },
        { status: 400 }
      );
    }

    const deleted = await HifzDoura.deleteMany({ _id: { $in: ids } });

    return NextResponse.json(
      { deleted, message: "Record(s) deleted successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
