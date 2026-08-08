import _ from "lodash";
import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import Settings from "@/models/Settings";
import { NextResponse } from "next/server";

export async function GET(req, res) {
  try {
    await connectToDB();
    const settings = await Settings.findOne({}).lean();

    if (!settings) {
      return NextResponse.json(
        { message: "No settings found. Please create settings." },
        { status: 404 }
      );
    }

    const { getYear } = await import("@/lib/getYear");
    const activeYear = await getYear(req);
    
    // Inject session-specific festival settings
    if (settings.festivals && settings.festivals.length > 0) {
      const festivalForYear = settings.festivals.find(f => f.year === activeYear);
      if (festivalForYear) {
        settings.festival = festivalForYear;
      } else {
        // Do not bleed old session data into new sessions
        settings.festival = { 
          year: activeYear, 
          festivalInfo: { year: parseInt(activeYear) || new Date().getFullYear() }, 
          resultPosters: [] 
        };
      }
    } else {
      // If no festivals array yet, but activeYear is different from the legacy year
      // (assuming legacy is "2025 november"), we still shouldn't bleed data.
      if (activeYear && activeYear !== "2025 november") {
        settings.festival = { 
          year: activeYear, 
          festivalInfo: { year: parseInt(activeYear) || new Date().getFullYear() }, 
          resultPosters: [] 
        };
      }
    }

    console.log("GET Settings - Spark Posters count:", settings.spark?.committeePosters?.length);
    console.log("GET Settings - Org Posters count:", settings.org?.committeePosters?.length);

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
        institutionPhoto: data.institutionPhoto ?? existingSettings?.institution?.institutionPhoto,
        updatesLogo: data.updatesLogo ?? existingSettings?.institution?.updatesLogo,
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
          whatsappChannel:
            data.whatsappChannel ?? existingSettings?.institution?.contact.whatsappChannel,
          youtube:
            data.youtube ?? existingSettings?.institution?.contact.youtube,
          instagram:
            data.instagram ?? existingSettings?.institution?.contact.instagram,
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
        committeePosters:
          data.committeePosters ?? existingSettings?.org?.committeePosters ?? [],
      },
      idCard: {
        backgroundImage:
          data.backgroundImage ?? existingSettings?.idCard?.backgroundImage,
      },
      general: {
        isWorkingDay:
          data.isWorkingDay ?? existingSettings?.general?.isWorkingDay,
        occasion: data.occasion ?? existingSettings?.general?.occasion,
        appIcon: data.appIcon ?? existingSettings?.general?.appIcon,
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
        festivalNameImage:
          data.festivalNameImage ?? existingSettings?.festival?.festivalNameImage,
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
        committeeContacts: {
          chairman: {
            name: data.chairmanName ?? existingSettings?.festival?.committeeContacts?.chairman?.name,
            phone: data.chairmanPhone ?? existingSettings?.festival?.committeeContacts?.chairman?.phone,
            whatsapp: data.chairmanWhatsapp ?? existingSettings?.festival?.committeeContacts?.chairman?.whatsapp,
          },
          convenor: {
            name: data.convenorName ?? existingSettings?.festival?.committeeContacts?.convenor?.name,
            phone: data.convenorPhone ?? existingSettings?.festival?.committeeContacts?.convenor?.phone,
            whatsapp: data.convenorWhatsapp ?? existingSettings?.festival?.committeeContacts?.convenor?.whatsapp,
          },
        },
      },
      years: data.years ?? existingSettings?.years ?? ["2025 november"],
      blockedYears: data.blockedYears ?? existingSettings?.blockedYears ?? [],
      activeYear:
        data.activeYear ?? existingSettings?.activeYear ?? "2025 november",
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

export async function PUT(req) {
  try {
    await connectToDB();
    
    let data = {};
    const contentType = req.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      try {
        data = await req.json();
      } catch (e) {
        console.error("Error parsing JSON body:", e);
        // Fallback to empty object if JSON parsing fails
      }
    }

    console.log("Settings PUT received data:", JSON.stringify(data, null, 2));

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { message: "No data provided for update." },
        { status: 400 }
      );
    }

    // Fetch existing settings first
    const existingSettings = await Settings.findOne({}).lean();

    if (!existingSettings) {
      return NextResponse.json(
        { message: "No settings found to update." },
        { status: 404 }
      );
    }

    // 🔧 Build update object WITHOUT referencing existingSettings in nested structures
    const updateData = {};

    // Special handling for Committee Posters (Org Admin & Spark Admin)
    if (data.committeePosters) {
      console.log(
        "Prioritized Update: Saving committee posters:",
        JSON.stringify(data.committeePosters)
      );

      const type = data.type || "org"; // Default to 'org' for backward compatibility
      const updateField = type === "spark" ? "spark.committeePosters" : "org.committeePosters";

      console.log("Processing Committee Posters Update");
      console.log("Type:", type);
      console.log("Update Field:", updateField);

      try {
        // If JUST updating posters, do it directly and return
        const updatedSettings = await Settings.findByIdAndUpdate(
          existingSettings._id,
          { $set: { [updateField]: data.committeePosters } },
          { new: true, runValidators: true }
        );
        console.log("Update success. Count:", updatedSettings?.spark?.committeePosters?.length);

        return NextResponse.json(
          {
            settings: updatedSettings,
            message: "Committee posters saved successfully!",
          },
          { status: 200 }
        );
      } catch (err) {
        console.error("Error updating committee posters:", err);
        return NextResponse.json({ message: err.message }, { status: 500 });
      }
    }

    // Institution
    if (
      data.name ||
      data.tagline ||
      data.logo ||
      data.address ||
      data.primaryPhone ||
      data.secondaryPhone ||
      data.email ||
      data.website ||
      data.institutionPhoto ||
      data.updatesLogo
    ) {
      updateData.institution = {
        name: data.name ?? existingSettings?.institution?.name,
        tagline: data.tagline ?? existingSettings?.institution?.tagline,
        logo: data.logo ?? existingSettings?.institution?.logo,
        institutionPhoto:
          data.institutionPhoto ?? existingSettings?.institution?.institutionPhoto,
        updatesLogo:
          data.updatesLogo ?? existingSettings?.institution?.updatesLogo,
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
          whatsappChannel:
            data.whatsappChannel ?? existingSettings?.institution?.contact?.whatsappChannel,
          youtube:
            data.youtube ?? existingSettings?.institution?.contact?.youtube,
          instagram:
            data.instagram ?? existingSettings?.institution?.contact?.instagram,
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
        committeePosters:
          data.committeePosters ?? existingSettings?.org?.committeePosters ?? [],
      };
    }

    if (data.committeePosters) {
      updateData["org.committeePosters"] = data.committeePosters;
    }

    // Spark
    if (
      data.spark_name ||
      data.spark_fullName ||
      data.spark_tagline ||
      data.spark_logo ||
      data.spark_address ||
      data.spark_primaryPhone ||
      data.spark_secondaryPhone ||
      data.spark_email ||
      data.spark_website
    ) {
      updateData.spark = {
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
      };
    }

    // General
    if (data.isWorkingDay !== undefined || data.occasion !== undefined || data.appIcon !== undefined) {
      // Use dot notation for all general fields to avoid MongoDB $set conflicts
      // with general.nonWorkingDays and general.nonWorkingDaysLog sub-paths
      if (data.isWorkingDay !== undefined) {
        updateData["general.isWorkingDay"] = data.isWorkingDay;
      }
      if (data.occasion !== undefined) {
        updateData["general.occasion"] = data.occasion;
      }
      if (data.appIcon !== undefined) {
        updateData["general.appIcon"] = data.appIcon;
      }

      // Auto-track non-working days: record today's date in IST when admin marks it as non-working
      if (data.isWorkingDay === false) {
        const now = new Date();
        const todayIST = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
        const y = todayIST.getUTCFullYear();
        const m = String(todayIST.getUTCMonth() + 1).padStart(2, "0");
        const d = String(todayIST.getUTCDate()).padStart(2, "0");
        const todayDateStr = `${y}-${m}-${d}`;
        const todayMidnight = new Date(`${todayDateStr}T00:00:00.000Z`);

        // Push date only if not already recorded (avoid duplicates)
        const alreadyRecorded = (existingSettings?.general?.nonWorkingDays || []).some(
          (dt) => new Date(dt).toISOString().split("T")[0] === todayDateStr
        );
        if (!alreadyRecorded) {
          updateData["general.nonWorkingDays"] = [
            ...(existingSettings?.general?.nonWorkingDays || []),
            todayMidnight,
          ];
        }

        // Build the occasion name from what was submitted
        const occasionName = data.occasion ?? existingSettings?.general?.occasion ?? "Holiday";

        // Build a set of already-logged dates for quick lookup
        const alreadyLoggedDates = new Set(
          (existingSettings?.general?.nonWorkingDaysLog || []).map(
            (entry) => new Date(entry.date).toISOString().split("T")[0]
          )
        );

        // Start with existing log entries
        const newLog = [...(existingSettings?.general?.nonWorkingDaysLog || [])];

        // Remove and re-add today's entry (always upsert with latest occasion name)
        const newLogWithoutToday = newLog.filter(
          (entry) => new Date(entry.date).toISOString().split("T")[0] !== todayDateStr
        );
        newLogWithoutToday.push({ date: todayMidnight, occasion: occasionName });

        // Helper to get the latest continuous block of dates (ignoring Fridays as gaps)
        const getLatestBlockStrs = (datesArray) => {
          if (!datesArray || datesArray.length === 0) return [];
          const sorted = [...datesArray].map(dt => new Date(dt)).sort((a, b) => a - b);
          const maxDate = sorted[sorted.length - 1];
          const block = new Set();
          let curr = maxDate;
          const dateStrs = new Set(sorted.map(d => d.toISOString().split("T")[0]));
          
          for (let i = 0; i < 365; i++) { // safety limit
            const currStr = curr.toISOString().split("T")[0];
            const isFriday = curr.getUTCDay() === 5;
            if (dateStrs.has(currStr)) {
              block.add(currStr);
              curr = new Date(curr.getTime() - 24 * 60 * 60 * 1000);
            } else if (isFriday) {
              curr = new Date(curr.getTime() - 24 * 60 * 60 * 1000);
            } else {
              break; // real gap breaks the block
            }
          }
          return block;
        };

        // Also backfill unlogged dates, but ONLY within the latest continuous block
        // This ensures dates like June 25-28 get the current occasion, but old legacy dates from May are ignored
        const allNonWorkingDates = alreadyRecorded
          ? (existingSettings?.general?.nonWorkingDays || [])
          : [...(existingSettings?.general?.nonWorkingDays || []), todayMidnight];

        const latestBlockStrs = getLatestBlockStrs(allNonWorkingDates);

        allNonWorkingDates.forEach((dt) => {
          const dateStr = new Date(dt).toISOString().split("T")[0];
          if (latestBlockStrs.has(dateStr) && dateStr !== todayDateStr && !alreadyLoggedDates.has(dateStr)) {
            // This date belongs to the current block and has no log entry yet — backfill it
            newLogWithoutToday.push({
              date: new Date(`${dateStr}T00:00:00.000Z`),
              occasion: occasionName,
            });
          }
        });

        updateData["general.nonWorkingDaysLog"] = newLogWithoutToday;

      } else if (data.isWorkingDay === true) {
        // Remove today from nonWorkingDays and nonWorkingDaysLog (IST date)
        const now = new Date();
        const todayIST = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
        const todayDS = `${todayIST.getUTCFullYear()}-${String(todayIST.getUTCMonth() + 1).padStart(2, "0")}-${String(todayIST.getUTCDate()).padStart(2, "0")}`;

        let newNonWorkingDays = [...(existingSettings?.general?.nonWorkingDays || [])];
        let newNonWorkingDaysLog = [...(existingSettings?.general?.nonWorkingDaysLog || [])];

        // The occasion that was active during the non-working period
        const prevOccasion = existingSettings?.general?.occasion || "Holiday";

        // Backfill intermediate days if it was previously false (multi-day non-working period)
        if (existingSettings?.general?.isWorkingDay === false && existingSettings?.updatedAt) {
          let curr = new Date(existingSettings.updatedAt);
          while (curr <= now) {
            const cIST = new Date(curr.getTime() + 5.5 * 60 * 60 * 1000);
            const cy = cIST.getUTCFullYear();
            const cm = String(cIST.getUTCMonth() + 1).padStart(2, "0");
            const cd = String(cIST.getUTCDate()).padStart(2, "0");
            const ds = `${cy}-${cm}-${cd}`;
            if (ds !== todayDS) {
              const cMidnight = new Date(`${ds}T00:00:00.000Z`);
              const alreadyRecorded = newNonWorkingDays.some(dt => new Date(dt).toISOString().split("T")[0] === ds);
              if (!alreadyRecorded) {
                newNonWorkingDays.push(cMidnight);
              }
              const logAlreadyRecorded = newNonWorkingDaysLog.some(entry => new Date(entry.date).toISOString().split("T")[0] === ds);
              if (!logAlreadyRecorded) {
                newNonWorkingDaysLog.push({ date: new Date(`${ds}T00:00:00.000Z`), occasion: prevOccasion });
              }
            }
            curr = new Date(curr.getTime() + 24 * 60 * 60 * 1000);
          }
        }

        // Helper to get the latest continuous block of dates (ignoring Fridays as gaps)
        const getLatestBlockStrsTrue = (datesArray) => {
          if (!datesArray || datesArray.length === 0) return [];
          const sorted = [...datesArray].map(dt => new Date(dt)).sort((a, b) => a - b);
          const maxDate = sorted[sorted.length - 1];
          const block = new Set();
          let curr = maxDate;
          const dateStrs = new Set(sorted.map(d => d.toISOString().split("T")[0]));
          
          for (let i = 0; i < 365; i++) {
            const currStr = curr.toISOString().split("T")[0];
            const isFriday = curr.getUTCDay() === 5;
            if (dateStrs.has(currStr)) {
              block.add(currStr);
              curr = new Date(curr.getTime() - 24 * 60 * 60 * 1000);
            } else if (isFriday) {
              curr = new Date(curr.getTime() - 24 * 60 * 60 * 1000);
            } else {
              break;
            }
          }
          return block;
        };

        // Also backfill existing nonWorkingDays that don't have a log entry yet,
        // but ONLY for the latest continuous block (prevents overwriting old disconnected legacy dates)
        const latestBlockStrsTrue = getLatestBlockStrsTrue(newNonWorkingDays);
        
        newNonWorkingDays.forEach((dt) => {
          const dateStr = new Date(dt).toISOString().split("T")[0];
          if (latestBlockStrsTrue.has(dateStr) && dateStr !== todayDS) {
            const logAlreadyRecorded = newNonWorkingDaysLog.some(
              (entry) => new Date(entry.date).toISOString().split("T")[0] === dateStr
            );
            if (!logAlreadyRecorded) {
              newNonWorkingDaysLog.push({
                date: new Date(`${dateStr}T00:00:00.000Z`),
                occasion: prevOccasion,
              });
            }
          }
        });

        updateData["general.nonWorkingDays"] = newNonWorkingDays.filter(
          (dt) => new Date(dt).toISOString().split("T")[0] !== todayDS
        );
        updateData["general.nonWorkingDaysLog"] = newNonWorkingDaysLog.filter(
          (entry) => new Date(entry.date).toISOString().split("T")[0] !== todayDS
        );
      }
    }

    // Section-level working day toggles (Senior Da-awa / Junior Da-awa)
    // Add historical tracking similar to general nonWorkingDays
    if (data.seniorDaawa_isWorkingDay !== undefined) {
      updateData["general.seniorDaawa.isWorkingDay"] = data.seniorDaawa_isWorkingDay;
      const now = new Date();
      const todayIST = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
      const todayDS = `${todayIST.getUTCFullYear()}-${String(todayIST.getUTCMonth() + 1).padStart(2, "0")}-${String(todayIST.getUTCDate()).padStart(2, "0")}`;
      let snwd = [...(existingSettings?.general?.seniorDaawaNonWorkingDays || [])];

      if (data.seniorDaawa_isWorkingDay === false) {
        if (!snwd.some((dt) => new Date(dt).toISOString().split("T")[0] === todayDS)) {
          snwd.push(new Date(`${todayDS}T00:00:00.000Z`));
        }
      } else {
        snwd = snwd.filter((dt) => new Date(dt).toISOString().split("T")[0] !== todayDS);
      }
      updateData["general.seniorDaawaNonWorkingDays"] = snwd;
    }
    if (data.seniorDaawa_occasion !== undefined) {
      updateData["general.seniorDaawa.occasion"] = data.seniorDaawa_occasion;
    }

    if (data.juniorDaawa_isWorkingDay !== undefined) {
      updateData["general.juniorDaawa.isWorkingDay"] = data.juniorDaawa_isWorkingDay;
      const now = new Date();
      const todayIST = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
      const todayDS = `${todayIST.getUTCFullYear()}-${String(todayIST.getUTCMonth() + 1).padStart(2, "0")}-${String(todayIST.getUTCDate()).padStart(2, "0")}`;
      let jnwd = [...(existingSettings?.general?.juniorDaawaNonWorkingDays || [])];

      if (data.juniorDaawa_isWorkingDay === false) {
        if (!jnwd.some((dt) => new Date(dt).toISOString().split("T")[0] === todayDS)) {
          jnwd.push(new Date(`${todayDS}T00:00:00.000Z`));
        }
      } else {
        jnwd = jnwd.filter((dt) => new Date(dt).toISOString().split("T")[0] !== todayDS);
      }
      updateData["general.juniorDaawaNonWorkingDays"] = jnwd;
    }
    if (data.juniorDaawa_occasion !== undefined) {
      updateData["general.juniorDaawa.occasion"] = data.juniorDaawa_occasion;
    }

    // Festival - Build carefully
    if (
      data.festival_name ||
      data.festival_theme ||
      data.festival_year ||
      data.festival_venue ||
      data.festival_startDate ||
      data.festival_endDate ||
      data.festivalNameImage ||
      data.printHeader ||
      data.registrationDeadline ||
      data.participantsCard ||
      data.textColor ||
      data.right !== undefined ||
      data.bottom !== undefined ||
      data.left !== undefined ||
      data.instructions ||
      data.festival?.resultPosters ||
      data.chairmanName !== undefined ||
      data.chairmanPhone !== undefined ||
      data.chairmanWhatsapp !== undefined ||
      data.convenorName !== undefined ||
      data.convenorPhone !== undefined ||
      data.convenorWhatsapp !== undefined
    ) {
      const { getYear } = await import("@/lib/getYear");
      const reqYear = await getYear(req);
      const currentFestivals = existingSettings?.festivals || [];
      const existingFestivalForYear = currentFestivals.find(f => f.year === reqYear) || existingSettings?.festival || {};

      const updatedFestivalForYear = {
        year: reqYear,
        festivalInfo: {
          name:
            data.festival_name ??
            existingFestivalForYear.festivalInfo?.name,
          theme:
            data.festival_theme ??
            existingFestivalForYear.festivalInfo?.theme,
          year:
            data.festival_year ??
            existingFestivalForYear.festivalInfo?.year,
          dates: {
            startDate:
              data.festival_startDate ??
              existingFestivalForYear.festivalInfo?.dates?.startDate,
            endDate:
              data.festival_endDate ??
              existingFestivalForYear.festivalInfo?.dates?.endDate,
          },
          venue:
            data.festival_venue ??
            existingFestivalForYear.festivalInfo?.venue,
        },
        festivalNameImage:
          data.festivalNameImage ?? existingFestivalForYear.festivalNameImage,
        printHeader:
          data.printHeader ?? existingFestivalForYear.printHeader,
        registrationDeadline:
          data.registrationDeadline ??
          existingFestivalForYear.registrationDeadline,
        participantsCard: {
          backgroundImage:
            data.participantsCard ??
            existingFestivalForYear.participantsCard?.backgroundImage,
          textColor:
            data.textColor ??
            existingFestivalForYear.participantsCard?.textColor,
          textPositions: {
            right:
              data.right ??
              existingFestivalForYear.participantsCard?.textPositions?.right,
            bottom:
              data.bottom ??
              existingFestivalForYear.participantsCard?.textPositions?.bottom,
            left:
              data.left ??
              existingFestivalForYear.participantsCard?.textPositions?.left,
          },
        },
        instructions:
          data.instructions ?? existingFestivalForYear.instructions,
        resultPosters:
          data.festival?.resultPosters ??
          existingFestivalForYear.resultPosters ??
          [],
        committeeContacts: {
          chairman: {
            name: data.chairmanName ?? existingFestivalForYear.committeeContacts?.chairman?.name,
            phone: data.chairmanPhone ?? existingFestivalForYear.committeeContacts?.chairman?.phone,
            whatsapp: data.chairmanWhatsapp ?? existingFestivalForYear.committeeContacts?.chairman?.whatsapp,
          },
          convenor: {
            name: data.convenorName ?? existingFestivalForYear.committeeContacts?.convenor?.name,
            phone: data.convenorPhone ?? existingFestivalForYear.committeeContacts?.convenor?.phone,
            whatsapp: data.convenorWhatsapp ?? existingFestivalForYear.committeeContacts?.convenor?.whatsapp,
          },
        },
      };

      const existingIndex = currentFestivals.findIndex(f => f.year === reqYear);
      let newFestivals = [...currentFestivals];
      if (existingIndex >= 0) {
        newFestivals[existingIndex] = updatedFestivalForYear;
      } else {
        newFestivals.push(updatedFestivalForYear);
      }
      updateData.festivals = newFestivals;
      
      // Update legacy object ONLY if we are editing the legacy year,
      // otherwise we overwrite old session data!
      if (reqYear === "2025 november") {
        updateData.festival = updatedFestivalForYear;
      }
    }

    if (data.years) {
      const oldYears = existingSettings?.years || [];
      const newYears = data.years;

      // Detect if exactly one year was renamed
      if (oldYears.length === newYears.length) {
        const removedYears = oldYears.filter(y => !newYears.includes(y));
        const addedYears = newYears.filter(y => !oldYears.includes(y));

        if (removedYears.length === 1 && addedYears.length === 1) {
          const oldYearName = removedYears[0];
          const newYearName = addedYears[0];
          
          try {
            const db = (await connectToDB()).connection.db;
            const collections = await db.listCollections().toArray();
            for (const collInfo of collections) {
              if (collInfo.type === 'collection') {
                await db.collection(collInfo.name).updateMany(
                  { year: oldYearName },
                  { $set: { year: newYearName } }
                );
              }
            }
            console.log(`Successfully migrated data from ${oldYearName} to ${newYearName}`);
          } catch (migrationError) {
            console.error("Error migrating collections:", migrationError);
          }
        }
      }

      updateData.years = data.years;
    }
    if (data.blockedYears !== undefined) {
      updateData.blockedYears = data.blockedYears;
    }
    if (data.activeYear) {
      updateData.activeYear = data.activeYear;
    }

    const updatedSettings = await Settings.findByIdAndUpdate(
      existingSettings._id,
      { $set: updateData }, // Use updateData instead of cleanedData
      { new: true, runValidators: true }
    );
    console.log("Settings updated. Org Posters count:", updatedSettings?.org?.committeePosters?.length);

    return NextResponse.json(
      { settings: updatedSettings, message: "Settings updated successfully!" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Settings PUT error:", error);
    return apiResponse.error(error);
  }
}
