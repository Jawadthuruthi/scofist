import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Performance from "@/models/Performance";
import { apiResponse } from "@/lib/apiResponse";
import { parseUser } from "@/lib/utils";
import { headers, cookies } from "next/headers";

// @desc POST bulk performances
// @route POST /api/performance/bulk
export async function POST(req) {
  try {
    await connectToDB();

    const headerStore = headers();
    const user = parseUser(headerStore);
    const cookieStore = cookies();
    const activeRole = cookieStore.get("active-role")?.value || headerStore.get("active-role");

    const { records, clearAll, classId, date, comments } = await req.json();

    // Determine default teacher ID
    let assignedTeacherId = user.userId;

    if (clearAll) {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
      
      await Performance.deleteMany({
        classId: classId,
        teacherId: assignedTeacherId, // ensure we only overwrite this teacher's entries
        comments: comments,
        date: { $gte: startOfDay, $lte: endOfDay }
      });
      return NextResponse.json({ message: "Performances cleared successfully!" }, { status: 200 });
    }

    if (!Array.isArray(records) || records.length === 0) {
      return apiResponse.error("No records provided.", 400);
    }

    // Attach teacherId to all records if not provided
    const performancesToInsert = records.map(record => ({
      ...record,
      teacherId: (activeRole === "College Admin" && record.teacherId) ? record.teacherId : assignedTeacherId
    }));

    if (performancesToInsert.length > 0) {
      const firstRecord = performancesToInsert[0];
      const targetDate = new Date(firstRecord.date);
      // Create start and end of day for the query
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

      await Performance.deleteMany({
        classId: firstRecord.classId,
        teacherId: firstRecord.teacherId, // ensure we only overwrite this teacher's entries
        comments: firstRecord.comments,
        date: { $gte: startOfDay, $lte: endOfDay }
      });
    }

    await Performance.insertMany(performancesToInsert);

    return NextResponse.json({ 
      message: `${performancesToInsert.length} performances created successfully!` 
    }, { status: 201 });
  } catch (error) {
    console.error("Bulk Performance Error:", error);
    return apiResponse.error(error.message, 500);
  }
}
