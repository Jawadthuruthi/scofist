// app/dashboard/undeclared-results/page.jsx
import DynamicDataTable from "@/components/DynamicDataTable";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { fetchData, formatOptions } from "@/lib/utils";

import { cookies } from "next/headers";

const columnsConfig = [
  {
    accessorKey: "serialNo",
    header: "Sl.No",
    type: "serialNo",
    width: 60,
    maxWidth: 60,
    minWidth: 60,
  },
  {
    accessorKey: "programName",
    header: "Program",
  },
  {
    accessorKey: "divisionName",
    header: "Division",
  },
  {
    accessorKey: "programType",
    header: "Type",
  },
  {
    accessorKey: "programCategory",
    header: "Category",
  },
];

export default async function UndeclaredResultsPage() {
  try {
    const cookiesStore = await cookies();
    const activeYear = cookiesStore.get("active-year")?.value;
    const yearParam = activeYear ? `year=${encodeURIComponent(activeYear)}&` : "";
    const apiKey = process.env.APIKEY;

    const [divisions] = await Promise.all([
      fetchData("divisions", `${yearParam}projection=id,name`, 0),
    ]);

    // Filter configuration
    const filterConfig = [
      {
        id: "divisionName",
        label: "Division",
        inputType: "select",
        options: formatOptions(divisions),
      },
      {
        id: "programType",
        label: "Type",
        inputType: "select",
        options: [
          { value: "Group", label: "Group" },
          { value: "Individual", label: "Individual" },
        ],
      },
      {
        id: "programCategory",
        label: "Category",
        inputType: "select",
        options: [
          { value: "Stage", label: "Stage" },
          { value: "Off-Stage", label: "Off-Stage" },
        ],
      },
    ];

    return (
      <>
        <Header
          title="UNDECLARED RESULTS"
          subTitle="Evaluated programs ready for result declaration"
        />
        <DynamicDataTable
          resource="undeclared-results"
          apiEndpoint="undeclared-results"
          columnsConfig={columnsConfig}
          filterConfig={filterConfig}
          filterTitle="Undeclared Results"
          filterType="api"
          readOnly={true}
          printTitle="Undeclared Results Report"
          apiKey={apiKey}
          limit={1000}
          isFestival={true}
          enableSearch={true}
          desktopSearchPlaceholder="Search program name..."
          searchBarClassName="md:w-full"
        />
      </>
    );
  } catch (error) {
    console.error("Error loading undeclared results:", error.message);
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
