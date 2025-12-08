
import connectToDB from "@/lib/db";
import Finance from "@/models/Finance";
import { getFinanceSummary } from "@/libservices/financeService";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await connectToDB();
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const category = searchParams.get("category");
    const mode = searchParams.get("mode");

    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;
    const skip = (page - 1) * limit;

    let query = {};

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (category && category !== "all") {
      query.category = { $regex: category, $options: "i" }; // Case-insensitive partial match for robust filtering
    }

    if (mode && mode !== "all") {
      query.mode = mode;
    }

    const transactions = await Finance.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Finance.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    // Calculate Summary (Global Balance)
    const summary = await getFinanceSummary();

    return NextResponse.json({
      success: true,
      finance: transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages
      },
      summary
    });
  } catch (error) {
    console.error("Error fetching finance data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectToDB();
    const body = await req.json();

    const newTransaction = await Finance.create(body);

    return NextResponse.json({ success: true, data: newTransaction }, { status: 201 });
  } catch (error) {
    console.error("Error creating transaction:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}