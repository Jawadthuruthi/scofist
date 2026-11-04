import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { fetchData } from "@/lib/utils";
import { cookies } from "next/headers";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  try {
    const cookiesStore = await cookies();
    const activeRole = cookiesStore.get("active-role")?.value;
    const activeYear = cookiesStore.get("active-year")?.value;
    const apiKey = process.env.API_KEY;

    // Fetch data using the activeYear query parameter so the API returns the session-specific festival settings
    const data = await fetchData(
      "settings",
      activeYear ? `year=${encodeURIComponent(activeYear)}` : "",
      0
    );

    const general = {
      ...data.general,
      appIcon: data.general?.appIcon || {},
    };

    const institution = {
      ...data.institution,
      ...data.institution?.contact,
      logo: data.institution?.logo?.url ? data.institution.logo : { url: "/sdc_seal.png" },
    };

    const festival = {
      festival_name: typeof data.festival?.festivalInfo?.name === "string" ? data.festival?.festivalInfo?.name : "",
      festival_theme: typeof data.festival?.festivalInfo?.theme === "string" ? data.festival?.festivalInfo?.theme : "",
      festival_year:
        data.festival?.festivalInfo?.year || new Date().getFullYear(),
      festival_venue: typeof data.festival?.festivalInfo?.venue === "string" ? data.festival?.festivalInfo?.venue : "",
      festivalNameImage: data.festival?.festivalNameImage || {},
      festivalFullNameImage: data.festival?.festivalFullNameImage || {},
      festivalLogo: data.festival?.festivalLogo || {},
      festivalThemeImage: data.festival?.festivalThemeImage || {},
      festivalVenueImage: data.festival?.festivalVenueImage || {},
      printHeader: data.festival?.printHeader || {},
      instructions: data.festival?.instructions || "",
      committeeContact1Position: data.festival?.committeeContacts?.contact1?.position || "",
      committeeContact1Name: data.festival?.committeeContacts?.contact1?.name || "",
      committeeContact1Phone: data.festival?.committeeContacts?.contact1?.phone || "",
      committeeContact2Position: data.festival?.committeeContacts?.contact2?.position || "",
      committeeContact2Name: data.festival?.committeeContacts?.contact2?.name || "",
      committeeContact2Phone: data.festival?.committeeContacts?.contact2?.phone || "",
      committeeContact3Position: data.festival?.committeeContacts?.contact3?.position || "",
      committeeContact3Name: data.festival?.committeeContacts?.contact3?.name || "",
      committeeContact3Phone: data.festival?.committeeContacts?.contact3?.phone || "",
      committeeContact4Position: data.festival?.committeeContacts?.contact4?.position || "",
      committeeContact4Name: data.festival?.committeeContacts?.contact4?.name || "",
      committeeContact4Phone: data.festival?.committeeContacts?.contact4?.phone || "",
    };

    const idCard = {
      ...data.idCard,
    };

    const spark = {
      spark_name: data.spark?.name,
      spark_fullName: data.spark?.fullName,
      spark_tagline: data.spark?.tagline,
      spark_address: data.spark?.address,
      spark_primaryPhone: data.spark?.contact?.primaryPhone,
      spark_secondaryPhone: data.spark?.contact?.secondaryPhone,
      spark_email: data.spark?.contact?.email,
      spark_website: data.spark?.contact?.website,
      spark_logo: data.spark?.logo || {},
      committeePosters: data.spark?.committeePosters || [],
    };

    const org = {
      org_name: data.org?.name,
      org_fullName: data.org?.fullName,
      org_tagline: data.org?.tagline,
      org_address: data.org?.address,
      org_primaryPhone: data.org?.contact?.primaryPhone,
      org_secondaryPhone: data.org?.contact?.secondaryPhone,
      org_email: data.org?.contact?.email,
      org_website: data.org?.contact?.website,
      org_logo: data.org?.logo || {},
      committeePosters: data.org?.committeePosters || [],
    };

    const isFestivalRole = activeRole === "Program Committee" || activeRole === "Program Leader";

    return (
      <>
        <Header
          title={isFestivalRole ? "FESTIVAL SETTINGS" : "SETTINGS"}
          subTitle={isFestivalRole ? "Configure Festival Details" : "Configure all settings"}
        />
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
