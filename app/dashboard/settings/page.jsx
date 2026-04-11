import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { fetchData } from "@/lib/utils";
import { cookies } from "next/headers";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  try {
    const cookiesStore = await cookies();
    const activeRole = cookiesStore.get("active-role")?.value;
    const apiKey = process.env.API_KEY;

    const data = (await fetchData("settings", "", 0)) || {};
    const settings = data || {};

    const general = {
      ...(settings.general || {}),
    };

    const institution = {
      ...(settings.institution || {}),
      ...(settings.institution?.contact || {}),
    };

    const festival = {
      festival_name: settings.festival?.festivalInfo?.name || "",
      festival_theme: settings.festival?.festivalInfo?.theme || "",
      festival_year:
        settings.festival?.festivalInfo?.year || new Date().getFullYear(),
      festival_venue: settings.festival?.festivalInfo?.venue || "",
      festival_startDate: settings.festival?.festivalInfo?.dates?.startDate
        ? new Date(settings.festival.festivalInfo.dates.startDate)
            .toISOString()
            .split("T")[0]
        : "",
      festival_endDate: settings.festival?.festivalInfo?.dates?.endDate
        ? new Date(settings.festival.festivalInfo.dates.endDate)
            .toISOString()
            .split("T")[0]
        : "",
      participantsCard: settings.festival?.participantsCard?.backgroundImage || {},
      textColor: settings.festival?.participantsCard?.textColor || "#000000",
      right: settings.festival?.participantsCard?.textPositions?.right || 0,
      bottom: settings.festival?.participantsCard?.textPositions?.bottom || 0,
      left: settings.festival?.participantsCard?.textPositions?.left || 0,
      festivalNameImage: settings.festival?.festivalNameImage || {},
      printHeader: settings.festival?.printHeader || {},
      registrationDeadline: settings.festival?.registrationDeadline
        ? new Date(settings.festival.registrationDeadline).toISOString().split("T")[0]
        : "",
      instructions: settings.festival?.instructions || "",
    };

    const idCard = {
      ...(settings.idCard || {}),
    };

    const spark = {
      spark_name: settings.spark?.name || "",
      spark_fullName: settings.spark?.fullName || "",
      spark_tagline: settings.spark?.tagline || "",
      spark_address: settings.spark?.address || "",
      spark_primaryPhone: settings.spark?.contact?.primaryPhone || "",
      spark_secondaryPhone: settings.spark?.contact?.secondaryPhone || "",
      spark_email: settings.spark?.contact?.email || "",
      spark_website: settings.spark?.contact?.website || "",
      spark_logo: settings.spark?.logo || {},
      committeePosters: settings.spark?.committeePosters || [],
    };

    const org = {
      org_name: settings.org?.name || "",
      org_fullName: settings.org?.fullName || "",
      org_tagline: settings.org?.tagline || "",
      org_address: settings.org?.address || "",
      org_primaryPhone: settings.org?.contact?.primaryPhone || "",
      org_secondaryPhone: settings.org?.contact?.secondaryPhone || "",
      org_email: settings.org?.contact?.email || "",
      org_website: settings.org?.contact?.website || "",
      org_logo: settings.org?.logo || {},
      committeePosters: settings.org?.committeePosters || [],
    };

    return (
      <>
        <Header title="SETTINGS" subTitle="Customize System Behavior" />
        <SettingsClient
          activeRole={activeRole}
          apiKey={apiKey}
          general={general}
          institution={institution}
          festival={festival}
          idCard={idCard}
          spark={spark}
          org={org}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading settings:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
}

export const revalidate = 0;
