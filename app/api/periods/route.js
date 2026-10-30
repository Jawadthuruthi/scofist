import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import Period from "@/models/Period";
import Settings from "@/models/Settings";
import { NextResponse } from "next/server";

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

    const query = {};

    if (filterParams.periodNumber) {
      query.periodNumber = parseInt(filterParams.periodNumber);
    }

    // Determine special day status
    const settings = await Settings.findOne().lean();
    const isSpecialActive = Boolean(settings?.general?.isSpecialDay);

    const isSpecialDayParam = filterParams.isSpecialDay;

    if (isSpecialDayParam === "true" || isSpecialDayParam === true) {
      query.isSpecialDay = true;
    } else if (isSpecialDayParam === "false" || isSpecialDayParam === false) {
      query.isSpecialDay = { $ne: true };
    } else if (isSpecialDayParam === "all") {
      // Query both without filter
    } else {
      // Default behavior (e.g., when called from dashboard or my-periods without explicit isSpecialDay param)
      if (isSpecialActive) {
        const specialCount = await Period.countDocuments({
          isSpecialDay: true,
          ...(query.periodNumber ? { periodNumber: query.periodNumber } : {}),
        });
        if (specialCount > 0) {
          query.isSpecialDay = true;
        } else {
          // If no special day periods configured yet, fallback to normal periods
          query.isSpecialDay = { $ne: true };
        }
      } else {
        query.isSpecialDay = { $ne: true };
      }
    }

    const periods = await Period.find(query)
      .skip(page * limit)
      .limit(limit)
      .sort({ periodNumber: 1 });

    const total = await Period.countDocuments(query);

    return NextResponse.json(
      {
        periods,
        isSpecialDayActive: isSpecialActive,
        pagination: {
          page,
          limit,
          total,
          totalPages:
            limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
        },
        message: "Periods fetched successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function POST(req) {
  try {
    await connectToDB();

    const { periodNumber, startTime, endTime, isSpecialDay } = await req.json();
    const newPeriod = await Period.create({
      periodNumber: parseInt(periodNumber),
      startTime,
      endTime,
      isSpecialDay: Boolean(isSpecialDay),
    });

    return NextResponse.json(
      { newPeriod, message: "Period created successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function PUT(req) {
  try {
    await connectToDB();

    const body = await req.json();
    const { ids, periodNumber, startTime, endTime, isSpecialDay } = body;

    const _id = ids ? ids[0] : body._id;

    const updateData = {};
    if (periodNumber !== undefined) updateData.periodNumber = parseInt(periodNumber);
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;
    if (isSpecialDay !== undefined) updateData.isSpecialDay = Boolean(isSpecialDay);

    if (ids && ids.length > 1) {
      const updatedPeriods = await Period.updateMany(
        { _id: { $in: ids } },
        { $set: updateData }
      );
      return NextResponse.json(
        { updatedPeriods, message: "Periods Updated successfully!" },
        { status: 200 }
      );
    }

    const updatedPeriod = await Period.findOneAndUpdate(
      { _id },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return NextResponse.json(
      { updatedPeriod, message: "Period Updated successfully!" },
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
    const _id = ids ? ids[0] : null;

    if (ids && ids.length > 1) {
      const deletedPeriods = await Period.deleteMany({ _id: { $in: ids } });
      return NextResponse.json(
        { deletedPeriods, message: "Periods deleted successfully!" },
        { status: 200 }
      );
    }

    const deletedPeriod = await Period.findByIdAndDelete(_id);
    return NextResponse.json(
      { deletedPeriod, message: "Period deleted successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
