import DynamicDataTable from "@/components/DynamicDataTable";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { fetchData, formatOptions } from "@/lib/utils";
import { cookies } from "next/headers";

const columnsConfig = [
  {
    accessorKey: "resultNumber",
    header: "Result No",
    type: "number, sortablePrefix",
    width: 80,
    maxWidth: 80,
    minWidth: 80,
  },
  {
    accessorKey: "programName",
    header: "Program",
  },
  {
    accessorKey: "divisionName",
    header: "Division",
  },
];

export default async function DeclaredResultsPage() {
  try {
    const apiKey = process.env.API_KEY;
    const cookieStore = cookies();
    const activeYear = cookieStore.get("active-year")?.value || "";

    const divisions = await fetchData("divisions", "projection=_id,name", 0);
    const declaredResults = await fetchData("results", `isResultDeclared=true&projection=_id&year=${encodeURIComponent(activeYear)}`, 0);
    const resultsCount = declaredResults?.length || 0;

    const filterConfig = [
      {
        id: "divisionId",
        label: "Division",
        inputType: "select",
        options: formatOptions(divisions),
      },
    ];

    return (
      <>
        <Header
          title="DECLARED RESULTS"
          subTitle={`View Declared Results [${resultsCount}]`}
        />
        <DynamicDataTable
          resource="results"
          initialData={[]}
          columnsConfig={columnsConfig}
          apiKey={apiKey}
          limit={1000}
          readOnly={true}
          apiFilters={{
            isResultDeclared: true,
          }}
          filterConfig={filterConfig}
          isFestival={true}
          enableSearch={true}
          desktopSearchPlaceholder="Search program name..."
          defaultSorting={[{ id: "resultNumber", desc: false }]}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading declared results page:", error.message);
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
