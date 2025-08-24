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

    return (
      <>
        <Header
          title="DECLARED RESULTS"
          subTitle="View and Manage Declared Results"
        />
        <DataTableComponent
          resource="results"
          initialData={[]}
          columnsConfig={columnsConfig}
          apiKey={apiKey}
          limit={20}
          readOnly={true}
          apiFilters={{
            isResultDeclared: true,
          }}
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

export const revalidate = 60;
