
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
    const accountType = searchParams.get("accountType") || "College"; // Default to College
    console.log("Finance API GET:", { accountType, allParams: Object.fromEntries(searchParams) });
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
      const escapedCategory = category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.category = { $regex: escapedCategory, $options: "i" };
    }

    if (mode && mode !== "all") {
      query.mode = mode;
    }

    if (accountType) {
      query.accountType = accountType;
    }

    const transactions = await Finance.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    if (transactions.length > 0) {
      console.log("Sample fetched transaction:", {
        id: transactions[0]._id,
        item: transactions[0].item,
        recipient: transactions[0].recipient
      });
    }

    const total = await Finance.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    // Calculate Summary (Global Balance)
    const summary = await getFinanceSummary(accountType);

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
    console.log("Finance API POST Body:", {
      ...body,
      item: body.item,
      recipient: body.recipient
    });

    const newTransaction = await Finance.create(body);
    console.log("Created Transaction:", newTransaction);

    return NextResponse.json({ success: true, data: newTransaction }, { status: 201 });
  } catch (error) {
    console.error("Error creating transaction:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create transaction" },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    await connectToDB();
    const body = await req.json();
    const { ids, ...updateData } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "No items selected for update" },
        { status: 400 }
      );
    }

    // Remove immutable fields if present, just in case
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const result = await Finance.updateMany(
      { _id: { $in: ids } },
      { $set: updateData }
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error updating transaction:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update transaction" },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    await connectToDB();
    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "No items selected for deletion" },
        { status: 400 }
      );
    }

    const result = await Finance.deleteMany({ _id: { $in: ids } });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete transaction" },
      { status: 500 }
    );
  }
}