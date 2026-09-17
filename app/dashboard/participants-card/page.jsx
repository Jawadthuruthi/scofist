import ErrorPage from "@/components/ErrorPage";
import ParticipantsCard from "@/components/ParticipantsCard";
import { cookies, headers } from "next/headers";
import { parseUser, fetchData } from "@/lib/utils";

export const revalidate = 0;

const participantsCardPage = async () => {
  try {
    const cookiesStore = await cookies();
    const headerStore = await headers();
    const user = parseUser(headerStore);

    const activeYear = cookiesStore.get("active-year")?.value;
    const activeRole = cookiesStore.get("active-role")?.value;
    const yearParam = activeYear ? `year=${encodeURIComponent(activeYear)}&` : "";

    let activeTeamId = null;
    let participantsQuery = `${yearParam}limit=1000`;

    if (activeRole === "Program Leader") {
      const userTeams = await fetchData("teams", `${yearParam}leaderId=${user?.userId}`, 0);
      if (userTeams && userTeams.length > 0) {
        activeTeamId = userTeams[0]._id;
        participantsQuery = `${yearParam}teamId=${activeTeamId}&limit=500`;
      } else {
        participantsQuery = `${yearParam}teamId=NONE&limit=0`;
      }
    }

    const allowedRoles = ["Program Committee", "Program Leader"];
    if (!allowedRoles.includes(activeRole)) {
      return (
        <ErrorPage
          statusCode={403}
          title="Access Denied"
          description="You do not have permission to view this page."
        />
      );
    }


    const [participants, settings, divisions, teams] = await Promise.all([
      fetchData("participants", participantsQuery, 0),
      fetchData("settings", `${yearParam}`),
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
        activeRole={activeRole}
        activeTeamId={activeTeamId}
        apiKey={process.env.API_KEY}
        activeYear={activeYear}
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
