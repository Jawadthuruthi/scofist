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
    accessorKey: "divisionName",
    header: "Division",
  },
  {
    accessorKey: "programName",
    header: "Program",
  },
  {
    accessorKey: "winners",
    header: "Winners",
    type: ["array", "vertical"],
  },
];

export default async function WinnersListPage() {
  try {
    const cookiesStore = await cookies();
    const apiKey = process.env.API_KEY;
    const activeYear = cookiesStore.get("active-year")?.value;
    const yearParam = activeYear ? `year=${encodeURIComponent(activeYear)}&` : "";

    const divisions = await fetchData("divisions", `${yearParam}projection=_id,name`, 0);

    const filterConfig = [
      {
        id: "divisionId",
        label: "Division",
        inputType: "select",
        options: formatOptions(divisions),
      },
      {
        id: "category",
        label: "Category",
        inputType: "select",
        options: [
          {
            value: "Stage",
            label: "Stage",
          },
          { value: "Off-Stage", label: "Off-Stage" },
        ],
      },
      {
        id: "rank",
        label: "Rank",
        inputType: "select",
        options: [
          { value: "1", label: "1" },
          { value: "2", label: "2" },
          { value: "3", label: "3" },
        ],
      },
    ];

    return (
      <>
        <Header title="WINNERS LIST" subTitle="View Winners List" />
        <DynamicDataTable
          resource="results"
          initialData={[]}
          columnsConfig={columnsConfig}
          apiKey={apiKey}
          limit={100}
          readOnly={true}
          filterType="api"
          apiFilters={{
            isResultDeclared: "true",
          }}
          filterConfig={filterConfig}
          isFestival={true}
          inlineFiltersOnDesktop={true}
          enableSearch={true}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading winners list page:", error.message);
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
