import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import Settings from "@/models/Settings";
import { NextResponse } from "next/server";

export async function GET(req, res) {
  try {
    await connectToDB();

    const settings = await Settings.findOne({});

    if (!settings) {
      return NextResponse.json(
        { message: "No settings found. Please create settings." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        settings,
        message: "Settings fetched successfully!",
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

    const data = await req.json();
    const formattedData = {
      institution: {
        name: data.name,
        shortName: data.shortName,
        tagline: data.tagline,
        logo: data.logo,
        establishedYear: data.establishedYear,
        address: {
          line1: data.line1,
          line2: data.line2,
          city: data.city,
          state: data.state,
          country: data.country,
          pinCode: data.pinCode,
        },
        contact: {
          primaryPhone: data.primaryPhone,
          secondaryPhone: data.secondaryPhone,
          email: data.email,
          website: data.website,
        },
      },
    };

    // Check if settings already exist
    const existingSettings = await Settings.findOne({});

    if (existingSettings) {
      // Update existing settings
      const updatedSettings = await Settings.findByIdAndUpdate(
        existingSettings._id,
        formattedData,
        { new: true }
      );

      return NextResponse.json(
        {
          settings: updatedSettings,
          message: "Settings updated successfully!",
        },
        { status: 200 }
      );
    } else {
      // Create new settings
      const newSettings = await Settings.create(data);

      return NextResponse.json(
        { settings: newSettings, message: "Settings created successfully!" },
        { status: 201 }
      );
    }
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function PUT(req, res) {
  try {
    await connectToDB();

    const data = await req.json();
    const formattedData = {
      institution: {
        name: data.name,
        shortName: data.shortName,
        tagline: data.tagline,
        logo: data.logo,
        establishedYear: data.establishedYear,
        address: {
          line1: data.line1,
          line2: data.line2,
          city: data.city,
          state: data.state,
          country: data.country,
          pinCode: data.pinCode,
        },
        contact: {
          primaryPhone: data.primaryPhone,
          secondaryPhone: data.secondaryPhone,
          email: data.email,
          website: data.website,
        },
      },
    };

    // Check if settings exist
    const existingSettings = await Settings.findOne({});

    if (!existingSettings) {
      return NextResponse.json(
        { message: "No settings found to update." },
        { status: 404 }
      );
    }

    // Update settings
    const updatedSettings = await Settings.findByIdAndUpdate(
      existingSettings._id,
      formattedData,
      { new: true }
    );

    return NextResponse.json(
      { settings: updatedSettings, message: "Settings updated successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
