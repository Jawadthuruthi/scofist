import DynamicDataTable from "@/components/DynamicDataTable";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { fetchData } from "@/lib/utils";
import { cookies } from "next/headers";

const columnsConfig = [
  {
    accessorKey: "serialNo",
    header: "Sl.No",
    type: ["serialNo"],
    width: 60,
    maxWidth: 60,
    minWidth: 60,
  },
  { accessorKey: "name", header: "Team Name" },
  { accessorKey: "leaderName", header: "Team Leader" },

  {
    accessorKey: "stagePoints",
    header: "Stage Points",
    type: ["number"],
  },
  {
    accessorKey: "offStagePoints",
    header: "Off-Stage Points",
    type: ["number"],
  },
  {
    accessorKey: "totalPoints",
    header: "Total Points",
    type: ["number"],
  },
];

const filterConfig = [{ id: "name", label: "Team Name" }];

export default async function TeamPointsPage() {
  try {
    const apiKey = process.env.API_KEY;
    const cookiesStore = await cookies();
    const activeYear = cookiesStore.get("active-year")?.value;
    const yearParam = activeYear ? `year=${encodeURIComponent(activeYear)}&` : "";

    const results = await fetchData(
      "results",
      `${yearParam}projection=_id&isResultDeclared=true`,
      0
    );

    const maxResultNumber = results?.length > 0 
      ? Math.max(...results.map(r => r.resultNumber || 0)) 
      : 0;

    return (
      <>
        <Header
          title="TEAM POINTS"
          subTitle={`Team result after ${maxResultNumber} results.`}
        />
        <DynamicDataTable
          resource="teams"
          initialData={[]}
          columnsConfig={columnsConfig}
          apiKey={apiKey}
          filterConfig={filterConfig}
          limit={100}
          readOnly={true}
          apiFilters={{ sortByPoints: "true" }}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading teams page:", error.message);
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
