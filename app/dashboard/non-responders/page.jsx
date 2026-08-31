import DynamicDataTable from "@/components/DynamicDataTable";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { fetchData, formatOptions } from "@/lib/utils";

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
    header: "Chest Number",
    type: ["number"],
  },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "teamName", header: "Team" },
  { accessorKey: "divisionName", header: "Division" },
  {
    accessorKey: "nonResponseProgramsNames",
    header: "Programs",
    type: ["array", "vertical"],
  },
];

export default async function NonRespondersPage() {
  try {
    const cookiesStore = await cookies();
    const apiKey = process.env.API_KEY;
    const activeYear = cookiesStore.get("active-year")?.value;
    const yearParam = activeYear ? `year=${encodeURIComponent(activeYear)}&` : "";

    // Fetch related data for form options
    const [classes, teams, divisions] = await Promise.all([
      fetchData("classes", "projection=_id,name", 0),
      fetchData("teams", `${yearParam}projection=_id,name`, 0),
      fetchData("divisions", `${yearParam}projection=_id,name&type=Primary`, 0),
    ]);

    const filterConfig = [
      { id: "name", label: "Name" },
      {
        id: "classId",
        label: "Class",
        inputType: "select",
        options: formatOptions(classes),
      },
      {
        id: "teamId",
        label: "Team",
        inputType: "select",
        options: formatOptions(teams),
        className: "col-span-1",
      },
      {
        id: "divisionId",
        label: "Division",
        inputType: "select",
        options: formatOptions(divisions),
        className: "col-span-1",
      },
    ];

    return (
      <>
        <Header
          title="NON-RESPONDERS"
          subTitle={
            <>
              Participants without code letters
              <span className="hidden md:inline"> for registered programs</span>
            </>
          }
        />
        <DynamicDataTable
          resource="participants"
          initialData={[]}
          columnsConfig={columnsConfig}
          apiKey={apiKey}
          filterConfig={filterConfig}
          limit={1000}
          readOnly={true}
          isFestival={true}
          apiFilters={{
            nonResponders: true,
          }}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading non-responders page:", error.message);
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
