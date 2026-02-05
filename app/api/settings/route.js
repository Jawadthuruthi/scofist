import _ from "lodash";
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

    // Fetch existing settings first
    const existingSettings = await Settings.findOne({});

    // Merge festival data safely
    const formattedData = {
      institution: {
        name: data.name ?? existingSettings?.institution?.name,
        tagline: data.tagline ?? existingSettings?.institution?.tagline,
        logo: data.logo ?? existingSettings?.institution?.logo,
        address: data.address ?? existingSettings?.institution?.address,
        contact: {
          primaryPhone:
            data.primaryPhone ??
            existingSettings?.institution?.contact.primaryPhone,
          secondaryPhone:
            data.secondaryPhone ??
            existingSettings?.institution?.contact.secondaryPhone,
          email: data.email ?? existingSettings?.institution?.contact.email,
          website:
            data.website ?? existingSettings?.institution?.contact.website,
        },
      },
      spark: {
        name: data.spark_name ?? existingSettings?.spark?.name,
        fullName: data.spark_fullName ?? existingSettings?.spark?.fullName,
        tagline: data.spark_tagline ?? existingSettings?.spark?.tagline,
        logo: data.spark_logo ?? existingSettings?.spark?.logo,
        address: data.spark_address ?? existingSettings?.spark?.address,
        contact: {
          primaryPhone:
            data.spark_primaryPhone ??
            existingSettings?.spark?.contact?.primaryPhone,
          secondaryPhone:
            data.spark_secondaryPhone ??
            existingSettings?.spark?.contact?.secondaryPhone,
          email: data.spark_email ?? existingSettings?.spark?.contact?.email,
          website:
            data.spark_website ?? existingSettings?.spark?.contact?.website,
        },
      },
      org: {
        name: data.org_name ?? existingSettings?.org?.name,
        fullName: data.org_fullName ?? existingSettings?.org?.fullName,
        tagline: data.org_tagline ?? existingSettings?.org?.tagline,
        logo: data.org_logo ?? existingSettings?.org?.logo,
        address: data.org_address ?? existingSettings?.org?.address,
        contact: {
          primaryPhone:
            data.org_primaryPhone ??
            existingSettings?.org?.contact?.primaryPhone,
          secondaryPhone:
            data.org_secondaryPhone ??
            existingSettings?.org?.contact?.secondaryPhone,
          email: data.org_email ?? existingSettings?.org?.contact?.email,
          website:
            data.org_website ?? existingSettings?.org?.contact?.website,
        },
      },
      idCard: {
        backgroundImage:
          data.backgroundImage ?? existingSettings?.idCard?.backgroundImage,
      },
      general: {
        isWorkingDay:
          data.isWorkingDay ?? existingSettings?.general?.isWorkingDay,
        occasion: data.occasion ?? existingSettings?.general?.occasion,
      },
      festival: {
        festivalInfo: {
          name:
            data.festivalInfo?.name ??
            data.festival_name ??
            existingSettings?.festival?.festivalInfo?.name,
          theme:
            data.festivalInfo?.theme ??
            data.festival_theme ??
            existingSettings?.festival?.festivalInfo?.theme,
          year:
            data.festivalInfo?.year ??
            data.festival_year ??
            existingSettings?.festival?.festivalInfo?.year,
          dates: {
            startDate:
              data.festivalInfo?.dates?.startDate ??
              data.festival_startDate ??
              existingSettings?.festival?.festivalInfo?.dates?.startDate,
            endDate:
              data.festivalInfo?.dates?.endDate ??
              data.festival_endDate ??
              existingSettings?.festival?.festivalInfo?.dates?.endDate,
          },
          venue:
            data.festivalInfo?.venue ??
            data.festival_venue ??
            existingSettings?.festival?.festivalInfo?.venue,
        },
        printHeader:
          data.printHeader ?? existingSettings?.festival?.printHeader,
        registrationDeadline:
          data.registrationDeadline ??
          existingSettings?.festival?.registrationDeadline,
        participantsCard: {
          backgroundImage:
            data.participantsCard ??
            existingSettings?.festival?.participantsCard?.backgroundImage,
          textColor:
            data.textColor ??
            existingSettings?.festival?.participantsCard?.textColor,
          textPositions: {
            right:
              data.right ??
              existingSettings?.festival?.participantsCard?.textPositions
                ?.right,
            bottom:
              data.bottom ??
              existingSettings?.festival?.participantsCard?.textPositions
                ?.bottom,
            left:
              data.left ??
              existingSettings?.festival?.participantsCard?.textPositions?.left,
          },
        },
        instructions:
          data.instructions ?? existingSettings?.festival?.instructions,
        resultPosters:
          data.festival?.resultPosters ??
          existingSettings?.festival?.resultPosters ??
          [],
      },
    };

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
    const existingSettings = await Settings.findOne({}).lean(); // 🔧 ADD .lean() to get plain object

    if (!existingSettings) {
      return NextResponse.json(
        { message: "No settings found to update." },
        { status: 404 }
      );
    }

    // 🔧 Build update object WITHOUT referencing existingSettings in nested structures
    const updateData = {};

    // Institution
    if (
      data.name ||
      data.tagline ||
      data.logo ||
      data.address ||
      data.primaryPhone ||
      data.secondaryPhone ||
      data.email ||
      data.website
    ) {
      updateData.institution = {
        name: data.name ?? existingSettings?.institution?.name,
        tagline: data.tagline ?? existingSettings?.institution?.tagline,
        logo: data.logo ?? existingSettings?.institution?.logo,
        address: data.address ?? existingSettings?.institution?.address,
        contact: {
          primaryPhone:
            data.primaryPhone ??
            existingSettings?.institution?.contact?.primaryPhone,
          secondaryPhone:
            data.secondaryPhone ??
            existingSettings?.institution?.contact?.secondaryPhone,
          email: data.email ?? existingSettings?.institution?.contact?.email,
          website:
            data.website ?? existingSettings?.institution?.contact?.website,
        },
      };
    }

    // ID Card
    if (data.backgroundImage) {
      updateData.idCard = {
        backgroundImage: data.backgroundImage,
      };
    }

    // Org - (Added for separate Org Admin profile)
    if (
      data.org_name ||
      data.org_fullName ||
      data.org_tagline ||
      data.org_logo ||
      data.org_address ||
      data.org_primaryPhone ||
      data.org_secondaryPhone ||
      data.org_email ||
      data.org_website
    ) {
      updateData.org = {
        name: data.org_name ?? existingSettings?.org?.name,
        fullName: data.org_fullName ?? existingSettings?.org?.fullName,
        tagline: data.org_tagline ?? existingSettings?.org?.tagline,
        logo: data.org_logo ?? existingSettings?.org?.logo,
        address: data.org_address ?? existingSettings?.org?.address,
        contact: {
          primaryPhone:
            data.org_primaryPhone ?? existingSettings?.org?.contact?.primaryPhone,
          secondaryPhone:
            data.org_secondaryPhone ?? existingSettings?.org?.contact?.secondaryPhone,
          email: data.org_email ?? existingSettings?.org?.contact?.email,
          website: data.org_website ?? existingSettings?.org?.contact?.website,
        },
      };
    }

    // General
    if (data.isWorkingDay !== undefined || data.occasion !== undefined) {
      updateData.general = {
        isWorkingDay:
          data.isWorkingDay ?? existingSettings?.general?.isWorkingDay,
        occasion: data.occasion ?? existingSettings?.general?.occasion,
      };
    }

    // Festival - Build carefully
    if (
      data.festival_name ||
      data.festival_theme ||
      data.festival_year ||
      data.festival_venue ||
      data.festival_startDate ||
      data.festival_endDate ||
      data.printHeader ||
      data.registrationDeadline ||
      data.participantsCard ||
      data.textColor ||
      data.right !== undefined ||
      data.bottom !== undefined ||
      data.left !== undefined ||
      data.instructions ||
      data.festival?.resultPosters
    ) {
      updateData.festival = {
        festivalInfo: {
          name:
            data.festival_name ??
            existingSettings?.festival?.festivalInfo?.name,
          theme:
            data.festival_theme ??
            existingSettings?.festival?.festivalInfo?.theme,
          year:
            data.festival_year ??
            existingSettings?.festival?.festivalInfo?.year,
          dates: {
            startDate:
              data.festival_startDate ??
              existingSettings?.festival?.festivalInfo?.dates?.startDate,
            endDate:
              data.festival_endDate ??
              existingSettings?.festival?.festivalInfo?.dates?.endDate,
          },
          venue:
            data.festival_venue ??
            existingSettings?.festival?.festivalInfo?.venue,
        },
        printHeader:
          data.printHeader ?? existingSettings?.festival?.printHeader,
        registrationDeadline:
          data.registrationDeadline ??
          existingSettings?.festival?.registrationDeadline,
        participantsCard: {
          backgroundImage:
            data.participantsCard ??
            existingSettings?.festival?.participantsCard?.backgroundImage,
          textColor:
            data.textColor ??
            existingSettings?.festival?.participantsCard?.textColor,
          textPositions: {
            right:
              data.right ??
              existingSettings?.festival?.participantsCard?.textPositions
                ?.right,
            bottom:
              data.bottom ??
              existingSettings?.festival?.participantsCard?.textPositions
                ?.bottom,
            left:
              data.left ??
              existingSettings?.festival?.participantsCard?.textPositions?.left,
          },
        },
        instructions:
          data.instructions ?? existingSettings?.festival?.instructions,
        resultPosters:
          data.festival?.resultPosters ??
          existingSettings?.festival?.resultPosters ??
          [],
      };
    }

    const updatedSettings = await Settings.findByIdAndUpdate(
      existingSettings._id,
      { $set: updateData }, // Use updateData instead of cleanedData
      { new: true }
    );

    return NextResponse.json(
      { settings: updatedSettings, message: "Settings updated successfully!" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Settings PUT error:", error);
    return apiResponse.error(error);
  }
}
