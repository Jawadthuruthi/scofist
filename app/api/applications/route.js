// app/api/applications/route.js
import apiResponse from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import ApplicationForm from "@/models/ApplicationForm";
import { NextResponse } from "next/server";

export async function GET(req, res) {
  try {
    await connectToDB();
    
    // Parse URL to get search params
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page")) || 0;
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
    let projections;

    // Convert projection param to MongoDB projection object
    if (projectionParam) {
      const fields = projectionParam.split(",");
      projections = {};
      fields.forEach((field) => {
        projections[field] = 1; // Include each field
      });
    }

    // Build MongoDB query from filter params
    const query = {};
    if (filterParams?.id) query._id = filterParams?.id;
    if (filterParams.name)
      query.name = { $regex: filterParams.name, $options: "i" };

    // Execute query with pagination
    const applications = await ApplicationForm.find(query, projections)
      .skip(page * limit)
      .limit(limit)
      .sort({ _id: -1 });

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
        message: "Applications fetched successfully!",
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

    // Extract address fields - handle both nested and flat structures
    let formattedBody;
    
    if (body.address && typeof body.address === 'object') {
      // Address is already nested (from ApplicationForm component)
      formattedBody = {
        ...body,
        // Address is already in the correct format
      };
    } else {
      // Address fields are flat (legacy format)
      const { houseName, place, postOffice, district, state, pin } = body;
      formattedBody = {
        ...body,
        address: { houseName, place, postOffice, district, state, pin },
      };
    }

    const applicationForm = new ApplicationForm(formattedBody);
    await applicationForm.save();

    return NextResponse.json(
      {
        message: "Application submitted successfully!",
        applicationForm,
      },
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
    const { id, ...updateData } = body;

    // Handle address fields - check if they're nested or flat
    if (updateData.address && typeof updateData.address === 'object') {
      // Address is already nested, no need to modify
    } else {
      // Check if flat address fields exist
      const { houseName, place, postOffice, district, state, pin } = updateData;
      if (houseName || place || postOffice || district || state || pin) {
        updateData.address = { houseName, place, postOffice, district, state, pin };
      }
    }

    const updatedApplicationForm = await ApplicationForm.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedApplicationForm) {
      return NextResponse.json(
        { message: "Application not found!" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Application updated successfully!",
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
    const ids = await req.json();
    const id = ids[0];

    if (ids.length > 1) {
      const deletedApplicationForms = await ApplicationForm.deleteMany({
        _id: { $in: ids },
      });
      return NextResponse.json(
        {
          deletedApplicationForms,
          message: "Applications deleted successfully!",
        },
        { status: 200 }
      );
    }

    const deletedApplicationForm = await ApplicationForm.findByIdAndDelete(id);

    return NextResponse.json(
      {
        deletedApplicationForm,
        message: "Application deleted successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
