import DynamicDataTable from "@/components/DynamicDataTable";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { fetchData, formatOptions, sortClasses } from "@/lib/utils";
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
  {
    accessorKey: "chestNumber",
    header: "Chest No.",
    type: ["number"],
  },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "teamName", header: "Team" },
  { accessorKey: "divisionName", header: "Division" },
  {
    accessorKey: "programsCount",
    header: "Programs Count",
    type: ["clickableNumber"],
    clickable: true,
    valueKey: "programs",
    viewType: "programsList",
  },
  {
    accessorKey: "stagePoints",
    header: "Stage Points",
    type: ["clickableNumber"],
    clickable: true,
    valueKey: "programs",
    viewType: "programsList",
    filterKey: "category",
    filterValue: "Stage",
  },
  {
    accessorKey: "offStagePoints",
    header: "Off-Stage Points",
    type: ["clickableNumber"],
    clickable: true,
    valueKey: "programs",
    viewType: "programsList",
    filterKey: "category",
    filterValue: "Off-Stage",
  },
  {
    accessorKey: "totalPoints",
    header: "Total Points",
    type: ["clickableNumber"],
    clickable: true,
    valueKey: "programs",
    viewType: "programsList",
  },
];

export default async function IndividualPointsPage() {
  try {
    const apiKey = process.env.API_KEY;
    const cookiesStore = await cookies();
    const activeYear = cookiesStore.get("active-year")?.value;
    const yearParam = activeYear ? `year=${encodeURIComponent(activeYear)}&` : "";

    // Fetch related data for form options
    const [classes, teams, divisions, results] = await Promise.all([
      fetchData("classes", `${yearParam}projection=_id,name`, 0),
      fetchData("teams", `${yearParam}projection=_id,name`, 0),
      fetchData("divisions", `${yearParam}projection=_id,name&type=Primary`, 0),
      fetchData("results", `${yearParam}projection=_id&isResultDeclared=true`, 0),
    ]);

    const sortedClasses = classes ? [...classes].sort(sortClasses) : [];

    const filterConfig = [
      { id: "name", label: "Name" },
      {
        id: "classId",
        label: "Class",
        inputType: "select",
        options: formatOptions(sortedClasses),
      },
      {
        id: "teamId",
        label: "Team",
        inputType: "select",
        options: formatOptions(teams),
      },
      {
        id: "divisionId",
        label: "Division",
        inputType: "select",
        options: formatOptions(divisions),
      },
    ];

    const maxResultNumber = results?.length > 0 
      ? Math.max(...results.map(r => r.resultNumber || 0)) 
      : 0;

    return (
      <>
        <Header
          title="INDIVIDUAL POINTS"
          subTitle={`Participant result after ${maxResultNumber} results.`}
        />
        <DynamicDataTable
          resource="participants"
          initialData={[]}
          columnsConfig={columnsConfig}
          apiKey={apiKey}
          filterConfig={filterConfig}
          limit={5000}
          readOnly={true}
          isFestival={true}
          apiFilters={{
            sortByPoints: true,
          }}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading participants page:", error.message);
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
