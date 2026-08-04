import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import connectToDB from "@/lib/db";
import Rental from "@/models/Rental";
import LibraryBook from "@/models/LibraryBook";
import User from "@/models/User";
import Class from "@/models/Class";
import Batch from "@/models/Batch";

export async function GET(req) {
    try {
        await connectToDB();

        const url = new URL(req.url);
        const month = parseInt(url.searchParams.get("month")); // 0-11
        const year = parseInt(url.searchParams.get("year"));

        if (isNaN(month) || isNaN(year)) {
            return NextResponse.json({ success: false, msg: "Invalid month or year", data: {} }, { status: 400 });
        }

        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59);

        const stats = await Rental.aggregate([
            {
                $match: {
                    rentedDate: {
                        $gte: startDate,
                        $lte: endDate
                    }
                }
            },
            {
                $group: {
                    _id: "$bookId",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 1 }
        ]);

        if (stats.length === 0) {
            return NextResponse.json({ success: true, msg: "No rentals found for this period", data: null }, { status: 200 });
        }

        const mostReadBookId = stats[0]._id;
        const mostReadBook = await LibraryBook.findById(mostReadBookId);

        // Fetch raw rentals (no populate) sorted by rentedDate desc
        const rentals = await Rental.find({
            bookId: mostReadBookId,
            rentedDate: { $gte: startDate, $lte: endDate }
        })
            .sort({ rentedDate: -1 })
            .lean();

        // Collect unique student IDs
        const studentIds = [...new Set(rentals.map(r => r.studentId).filter(Boolean))];

        // Fetch all students in one query
        const users = await User.find({ _id: { $in: studentIds } })
            .select("name studentSpecificField")
            .lean();

        // Build a quick lookup map: userId -> user
        const userMap = {};
        for (const u of users) {
            userMap[u._id] = u;
        }

        // Collect unique classId and batchId values to look up names
        const classIds = [...new Set(users.map(u => u.studentSpecificField?.classId).filter(Boolean))];
        const batchIds = [...new Set(users.map(u => u.studentSpecificField?.batchId).filter(Boolean))];

        const classes = await Class.find({ _id: { $in: classIds } }).select("name").lean();
        const batches = await Batch.find({ _id: { $in: batchIds } }).select("name").lean();

        const classMap = Object.fromEntries(classes.map(c => [c._id, c.name]));
        const batchMap = Object.fromEntries(batches.map(b => [b._id, b.name]));

        // Build students array: one entry per rental (same student can appear multiple times)
        const students = rentals.map(r => {
            const u = userMap[r.studentId];
            const ssf = u?.studentSpecificField || {};
            return {
                _id: r.studentId || null,
                name: u?.name || "Unknown",
                admissionNumber: ssf.admissionNumber || null,
                className: classMap[ssf.classId] || null,
                batchName: batchMap[ssf.batchId] || null,
                rentedDate: r.rentedDate || null,
                receivedDate: r.receivedDate || null,
            };
        });

        return NextResponse.json({
            success: true,
            data: {
                book: mostReadBook,
                count: stats[0].count,
                students,
            }
        }, { status: 200 });

    } catch (error) {
        console.error("Error fetching most read book:", error);
        return NextResponse.json({ success: false, msg: error.message, data: {} }, { status: 500 });
    }
}
