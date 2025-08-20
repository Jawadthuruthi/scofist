import ParticipantsCard from "@/components/ParticipantsCard";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { fetchData, formatOptions } from "@/lib/utils";
import { cookies } from "next/headers";

export default async function ParticipantsCardPage() {
  try {
    const cookiesStore = await cookies();
    const activeRole = cookiesStore.get("active-role")?.value;
    const apiKey = process.env.API_KEY;

    // Fetch related data for filter options
    const [teams, divisions] = await Promise.all([
      fetchData("teams", "projection=_id,name", 0),
      fetchData("divisions", "projection=_id,name", 0),
    ]);

    const filterConfig = [
      {
        id: "divisionId",
        label: "Division",
        inputType: "select",
        options: formatOptions(divisions),
      },
      {
        id: "teamId",
        label: "Team",
        inputType: "select",
        options: formatOptions(teams),
      },
      {
        id: "chestNumber",
        label: "Chest Number",
        inputType: "number",
        placeholder: "Enter chest number",
      },
    ];

    return (
      <>
        <Header
          title="PARTICIPANT CARDS"
          subTitle="View Participant Details and Programs"
        />
        <ParticipantsCard
          apiKey={apiKey}
          filterConfig={filterConfig}
          readOnly={activeRole !== "Program Committee"}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading participant cards page:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
}

export const revalidate = 60;
