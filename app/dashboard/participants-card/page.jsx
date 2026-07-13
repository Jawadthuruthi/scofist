import ErrorPage from "@/components/ErrorPage";
import ParticipantsCard from "@/components/ParticipantsCard";
import { fetchData } from "@/lib/utils";

export const revalidate = 60;
import { cookies } from "next/headers";

const participantsCardPage = async () => {
  try {
    const cookiesStore = await cookies();
    const activeYear = cookiesStore.get("active-year")?.value;
    const yearParam = activeYear ? `year=${encodeURIComponent(activeYear)}&` : "";

    const [participants, settings, divisions, teams] = await Promise.all([
      fetchData("participants", `${yearParam}limit=1000`, 0),
      fetchData("settings"),
      fetchData("divisions", `${yearParam}limit=100`, 0),
      fetchData("teams", `${yearParam}limit=100`, 0),
    ]);

    return (
      <ParticipantsCard
        participants={participants}
        festivalSettings={{
          ...settings.festival,
        }}
        divisions={divisions}
        teams={teams}
      />
    );
  } catch (error) {
    console.error("Error loading participants card:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
};

export default participantsCardPage;
