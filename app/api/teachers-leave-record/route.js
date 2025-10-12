import { apiResponse } from "@/lib/apiResponse";
import TeachersLeaveRecord from "@/models/TeachersLeaveRecord";
import { NextResponse } from "next/server";

function convertToIST(date) {
  const dateObj = new Date(date);

  // Format the date in IST timezone
  const istString = dateObj.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  // Parse the formatted string (format: DD/MM/YYYY)
  const [day, month, year] = istString.split("/");

  // Create date at midnight IST
  const istDate = new Date(`${year}-${month}-${day}T00:00:00+05:30`);

  return istDate;
}

export async function GET(req) {
  try {
    const url = new URL(req.url);

    const filterParams = {};
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== "page" && key !== "limit") {
        filterParams[key] = value;
      }
    }

    const query = {};
    if (filterParams?.teacherId) {
      query.teacherId = filterParams.teacherId;
    }
    if (filterParams?.classId) {
      query.classId = filterParams.classId;
    }
    if (filterParams?.periodNumber) {
      query.periodNumber = parseInt(filterParams.periodNumber);
    }
    if (filterParams?.date) {
      const startDate = convertToIST(filterParams.date);
      startDate.setUTCHours(0, 0, 0, 0);
      const nextDay = new Date(startDate);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      nextDay.setUTCHours(0, 0, 0, 0);
      query.date = { $gte: startDate, $lt: nextDay };
    }
    if (filterParams?.isForTimeTable === "true") {
      const endDate = convertToIST(new Date());
      endDate.setUTCHours(0, 0, 0, 0);

      const startDate = new Date(endDate);
      startDate.setUTCDate(startDate.getUTCDate() - 6);
      startDate.setUTCHours(0, 0, 0, 0);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const teachersLeaveRecord = await TeachersLeaveRecord.find(query).sort({
      createdAt: -1,
    });

    return NextResponse.json({ teachersLeaveRecord }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    const date = convertToIST(data.date);
    date.setUTCHours(0, 0, 0, 0);
    const teachersLeaveRecord = await TeachersLeaveRecord.updateOne(
      {
        teacherId: data.teacherId,
        date: date,
        periodNumber: data.periodNumber,
        classId: data.classId,
      },
      {
        $set: {
          leaveReason: data.leaveReason,
        },
      },
      { upsert: true }
    );

    return NextResponse.json(
      { message: "Team created successfully!", teachersLeaveRecord },
      { status: 201 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
