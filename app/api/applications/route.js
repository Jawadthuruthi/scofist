import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import ApplicationForm from "@/models/ApplicationForm";
import { NextResponse } from "next/server";

export async function GET(req, res) {
  try {
    await connectToDB();

    // Parse URL to get search params
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "0");
    const limit = parseInt(url.searchParams.get("limit")) || Infinity;

    // Build filter object from query parameters
    const filterParams = {};
    for (const [key, value] of url.searchParams.entries()) {
      // Skip pagination parameters
      if (key !== "page" && key !== "limit" && key !== "projection") {
        filterParams[key] = value;
      }
    }

    // Get projection param
    const projectionParam = url.searchParams.get("projection");
    let projections = {};

    // Convert projection param to MongoDB projection object
    if (projectionParam) {
      const fields = projectionParam.split(",");
      fields.forEach((field) => {
        projections[field] = 1; // Include each field
      });
    }

    // Build MongoDB query from filter params
    const query = {};

    if (filterParams?._id) {
      query._id = filterParams?._id;
    }
    if (filterParams.name) {
      query.name = { $regex: filterParams.name, $options: "i" };
    }

    // Execute query with pagination
    const applications = await ApplicationForm.find(query, projections)
      .skip(page * limit)
      .limit(limit)
      .sort({ _id: 1 });
    // Get total count for pagination info
    const total = await ApplicationForm.countDocuments(query);

    return NextResponse.json(
      {
        applications,
        pagination: {
          page,
          limit,
          total,
          totalPages:
            limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
        },
        message: "Groups fetched successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function POST(req, res) {
  try {
    await connectToDB();

    const body = await req.json();
    const { houseName, place, postOffice, district, state, pin } = body;

    const formattedBody = {
      ...body,
      address: {
        houseName,
        place,
        postOffice,
        district,
        state,
        pin,
      },
    };

    const applicationForm = new ApplicationForm(formattedBody);
    await applicationForm.save();

    return NextResponse.json(
      { message: "Group created successfully!", applicationForm },
      { status: 201 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function PUT(req, res) {
  try {
    await connectToDB();

    const body = await req.json();
    const { _id, ...updateData } = body;

    const { houseName, place, postOffice, district, state, pin } = updateData;

    if (houseName || place || postOffice || district || state || pin) {
      updateData.address = {
        houseName,
        place,
        postOffice,
        district,
        state,
        pin,
      };
    }

    const updatedApplicationForm = await ApplicationForm.findByIdAndUpdate(
      _id,
      updateData,
      { new: true }
    );

    if (!updatedApplicationForm) {
      return NextResponse.json(
        { message: "Group not found!" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Group updated successfully!",
        applicationForm: updatedApplicationForm,
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function DELETE(req, res) {
  try {
    await connectToDB();

    const { ids } = await req.json();
    const _id = ids[0];
    if (ids.length > 1) {
      const deletedApplicationForms = await ApplicationForm.deleteMany({
        _id: { $in: ids },
      });
      return NextResponse.json(
        { deletedApplicationForms, message: "Groups deleted successfully!" },
        { status: 200 }
      );
    }
    const deletedApplicationForm = await ApplicationForm.findByIdAndDelete(_id);
    return NextResponse.json(
      { deletedApplicationForm, message: "Group deleted successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
