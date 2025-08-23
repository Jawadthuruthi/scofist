import _ from "lodash";

import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import Settings from "@/models/Settings";
import { NextResponse } from "next/server";
import { removeEmptyValuesDeep } from "@/lib/utils";

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
        tagline: data.tagline,
        logo: data.logo,
        address: data.address,
        contact: {
          primaryPhone: data.primaryPhone,
          secondaryPhone: data.secondaryPhone,
          email: data.email,
          website: data.website,
        },
      },
      idCard: data.backgroundImage,
      general: {
        isWorkingDay: data.isWorkingDay,
        occasion: data.occasion,
      },
      festival: {
        printHeader: data.printHeader,
        registrationDeadline: data.registrationDeadline,
        participantsCard: {
          backgroundImage: data.participantsCard,
          textColor: data.textColor || "#000000",
        },
        instructions: data.instructions,
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
      const newSettings = await Settings.create(formattedData);

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

    // Fetch existing settings first
    const existingSettings = await Settings.findOne({});
    if (!existingSettings) {
      return NextResponse.json(
        { message: "No settings found to update." },
        { status: 404 }
      );
    }

    // Merge festival data safely
    const formattedData = {
      institution: {
        name: data.name ?? existingSettings.institution.name,
        tagline: data.tagline ?? existingSettings.institution.tagline,
        logo: data.logo ?? existingSettings.institution.logo,
        address: data.address ?? existingSettings.institution.address,
        contact: {
          primaryPhone:
            data.primaryPhone ??
            existingSettings.institution.contact.primaryPhone,
          secondaryPhone:
            data.secondaryPhone ??
            existingSettings.institution.contact.secondaryPhone,
          email: data.email ?? existingSettings.institution.contact.email,
          website: data.website ?? existingSettings.institution.contact.website,
        },
      },
      idCard: {
        backgroundImage:
          data.backgroundImage ?? existingSettings.idCard.backgroundImage,
      },
      general: {
        isWorkingDay:
          data.isWorkingDay ?? existingSettings.general.isWorkingDay,
        occasion: data.occasion ?? existingSettings.general.occasion,
      },
      festival: {
        printHeader: data.printHeader ?? existingSettings.festival.printHeader,
        registrationDeadline:
          data.registrationDeadline ??
          existingSettings.festival.registrationDeadline,
        participantsCard: {
          backgroundImage:
            data.participantsCard ??
            existingSettings.festival.participantsCard.backgroundImage,
          textColor:
            data.textColor ??
            existingSettings.festival.participantsCard.textColor,
        },
        instructions:
          data.instructions ?? existingSettings.festival.instructions,
      },
    };

    const cleanedData = removeEmptyValuesDeep(formattedData);

    const updatedSettings = await Settings.findByIdAndUpdate(
      existingSettings._id,
      { $set: cleanedData },
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
