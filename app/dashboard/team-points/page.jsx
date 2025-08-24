import DataTableComponent from "@/components/DataTableComponent";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";

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
    accessorKey: "membersCount",
    header: "Members Count",
    type: ["number"],
  },
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

    return (
      <>
        <Header
          title="TEAM POINTS"
          subTitle="View and Manage Team-wise Points"
        />
        <DataTableComponent
          resource="teams"
          initialData={[]}
          columnsConfig={columnsConfig}
          apiKey={apiKey}
          filterConfig={filterConfig}
          limit={20}
          readOnly={true}
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

export const revalidate = 60;
