import React from "react";
import DynamicDataTable from "@/components/DynamicDataTable";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { fetchData } from "@/lib/utils";
import { cookies } from "next/headers";
import PublishTeamPointsButton from "./PublishTeamPointsButton";

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
    header: <span className="whitespace-normal block leading-tight text-left">Stage<br />Points</span>,
    popupHeader: "Stage Points",
    type: ["clickableNumber"],
    clickable: true,
    valueKey: "programs",
    viewType: "programsList",
    filterKey: "category",
    filterValue: "Stage",
  },
  {
    accessorKey: "offStagePoints",
    header: <span className="whitespace-normal block leading-tight text-left">Off-Stage<br />Points</span>,
    popupHeader: "Off-Stage Points",
    type: ["clickableNumber"],
    clickable: true,
    valueKey: "programs",
    viewType: "programsList",
    filterKey: "category",
    filterValue: "Off-Stage",
  },
  {
    accessorKey: "totalPoints",
    header: <span className="whitespace-normal block leading-tight text-left">Total<br />Points</span>,
    popupHeader: "Total Points",
    type: ["clickableNumber"],
    clickable: true,
    valueKey: "programs",
    viewType: "programsList",
  },
];

const filterConfig = [{ id: "name", label: "Team Name" }];

export default async function TeamPointsPage() {
  try {
    const apiKey = process.env.API_KEY;
    const cookiesStore = await cookies();
    const activeYear = cookiesStore.get("active-year")?.value;
    const activeRole = cookiesStore.get("active-role")?.value;
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
          subTitle={`Team result after ${maxResultNumber} results. (Note: You must click Publish below to update the public page)`}
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
        <PublishTeamPointsButton activeRole={activeRole} activeYear={activeYear} />
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
