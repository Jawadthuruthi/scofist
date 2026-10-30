import ErrorPage from "@/components/ErrorPage";
import connectToDB from "@/lib/db";
import Settings from "@/models/Settings";
import PeriodsManagementClient from "./PeriodsManagementClient";

const DEFAULT_SCHEDULES = [
  { id: "normal", name: "Normal Schedule", isDefault: true },
  { id: "thursday", name: "Thursday Schedule", isDefault: true },
];

export default async function PeriodsPage() {
  try {
    const apiKey = process.env.API_KEY;

    await connectToDB();
    const settings = await Settings.findOne().lean();

    const savedSchedules = settings?.general?.schedules || [];
    const map = new Map();
    DEFAULT_SCHEDULES.forEach((s) => map.set(s.id, s));
    savedSchedules.forEach((s) => {
      map.set(s.id, {
        id: s.id,
        name: s.name,
        description: s.description,
        isDefault: Boolean(s.isDefault),
      });
    });
    const initialSchedules = Array.from(map.values());

    let initialActiveSchedule = settings?.general?.activeSchedule;
    if (!initialActiveSchedule) {
      initialActiveSchedule = settings?.general?.isSpecialDay ? "thursday" : "normal";
    }

    return (
      <PeriodsManagementClient
        apiKey={apiKey}
        initialActiveSchedule={initialActiveSchedule}
        initialSchedules={initialSchedules}
        initialAutoThursdaySchedule={Boolean(settings?.general?.autoThursdaySchedule)}
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
