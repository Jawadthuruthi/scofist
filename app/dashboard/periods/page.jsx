import ErrorPage from "@/components/ErrorPage";
import connectToDB from "@/lib/db";
import Settings from "@/models/Settings";
import PeriodsManagementClient from "./PeriodsManagementClient";

export default async function PeriodsPage() {
  try {
    const apiKey = process.env.API_KEY;

    await connectToDB();
    const settings = await Settings.findOne().lean();
    const isSpecialDay = Boolean(settings?.general?.isSpecialDay);

    return (
      <PeriodsManagementClient
        apiKey={apiKey}
        initialIsSpecialDay={isSpecialDay}
      />
    );
  } catch (error) {
    console.error("Error loading periods:", error.message);
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
