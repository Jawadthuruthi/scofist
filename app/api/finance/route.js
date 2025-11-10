import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Finance from "@/models/Finance";
import { apiResponse } from "@/lib/apiResponse";
import { parseUser } from "@/lib/utils";
import { headers } from "next/headers";

// @desc GET all finance entries
// @route GET /api/finance
export async function GET(req) {
  try {
    await connectToDB();

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "0");
    const limit = parseInt(url.searchParams.get("limit")) || Infinity;

    const filterParams = {};
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== "page" && key !== "limit") {
        filterParams[key] = value;
      }
    }

    const headerStore = headers();
    const activeRole = headerStore.get("active-role");

    if (activeRole !== "College Admin" && activeRole !== "Finance") {
      return apiResponse.error("You are not authorized to view finance records.", 403);
    }

    let query = {};

    if (filterParams.category) {
      query.category = { $regex: filterParams.category, $options: "i" };
    }

    if (filterParams.startDate && filterParams.endDate) {
      query.date = {
        $gte: new Date(filterParams.startDate),
        $lte: new Date(filterParams.endDate),
      };
    }

    const financeEntries = await Finance.find(query)
      .skip(page * limit)
      .limit(limit)
      .sort({ date: -1 });

    const total = await Finance.countDocuments(query);

    return NextResponse.json(
        {
          data: financeEntries,
          pagination: {
            page,
            limit,
            total,
            totalPages:
              limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
          },
          message: "Finance entries fetched successfully!",
        },
        { status: 200 }
      );
  } catch (error) {
    return apiResponse.error(error.message, 500);
  }
}

// @desc POST a new finance entry
// @route POST /api/finance
export async function POST(req) {
    try {
      await connectToDB();

      const headerStore = headers();
      const activeRole = headerStore.get("active-role");

      if (activeRole !== "College Admin" && activeRole !== "Finance") {
        return apiResponse.error("You are not authorized to create finance records.", 403);
      }

      const { date, type, invoiceNo, category, amount } = await req.json();

      const newEntry = new Finance({
        date,
        type,
        invoiceNo,
        category,
        amount,
      });

      await newEntry.save();

      return NextResponse.json({ data: newEntry, message: "Finance entry created successfully!" }, { status: 201 });
    } catch (error) {
      return apiResponse.error(error.message, 500);
    }
}


// @desc PUT (update) a finance entry
// @route PUT /api/finance
export async function PUT(req) {
    try {
      await connectToDB();

      const headerStore = headers();
      const activeRole = headerStore.get("active-role");

      if (activeRole !== "College Admin" && activeRole !== "Finance") {
        return apiResponse.error("You are not authorized to update finance records.", 403);
      }

      const { ids, date, type, invoiceNo, category, amount } = await req.json();

      const updatedEntries = await Finance.updateMany(
        { _id: { $in: ids } },
        { $set: { date, type, invoiceNo, category, amount } }
      );

      return NextResponse.json({ data: updatedEntries, message: "Finance entries updated successfully!" }, { status: 200 });
    } catch (error) {
      return apiResponse.error(error.message, 500);
    }
}

// @desc DELETE a finance entry
// @route DELETE /api/finance
export async function DELETE(req) {
    try {
        await connectToDB();

        const headerStore = headers();
        const activeRole = headerStore.get("active-role");

        if (activeRole !== "College Admin" && activeRole !== "Finance") {
            return apiResponse.error("You are not authorized to delete finance records.", 403);
        }

        const { ids } = await req.json();

        await Finance.deleteMany({_id: { $in: ids }});

        return NextResponse.json({ message: "Finance entries deleted successfully." }, { status: 200 });
    } catch (error) {
        return apiResponse.error(error.message, 500);
    }
}