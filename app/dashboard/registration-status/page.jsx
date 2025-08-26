import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import AdvancedDataTableComponent from "@/components/AdvancedDataTableComponent";
import { fetchData, formatOptions, parseUser } from "@/lib/utils";
import { cookies, headers } from "next/headers";

export default async function RegistrationStatusPage() {
  try {
    const headerStore = await headers();
    const cookiesStore = await cookies();
    const user = parseUser(headerStore);
    const activeRole = cookiesStore.get("active-role")?.value;
    const apiKey = process.env.API_KEY;

    let programs, teams, divisions, participants;

    if (activeRole === "Program Committee") {
      [programs, teams, divisions, participants] = await Promise.all([
        fetchData(
          "programs",
          "projection=_id,name,type,category,maxParticipants,divisionId",
          0
        ),
        fetchData("teams", "projection=_id,name", 0),
        fetchData("divisions", "projection=_id,name", 0),
        fetchData("participants", "projection=_id,name,teamId", 0),
      ]);
    } else if (activeRole === "Program Leader") {
      const userTeams = await fetchData(
        "teams",
        `leaderId=${user?.userId}&projection=_id,name`,
        0
      );

      if (!userTeams || userTeams.length === 0) {
        throw new Error("No team found for this program leader");
      }

      const teamIds = userTeams.map((t) => t._id);

      [programs, divisions, participants] = await Promise.all([
        fetchData(
          "programs",
          "projection=_id,name,type,category,maxParticipants,divisionId",
          0
        ),
        fetchData("divisions", "projection=_id,name", 0),
        fetchData(
          "participants",
          `teamId=${teamIds[0]}&projection=_id,name,teamId`,
          0
        ),
      ]);

      teams = userTeams;
    } else {
      throw new Error("Unauthorized access");
    }

    // Common column configuration for both registered and unregistered tabs
    const baseColumnsConfig = [
      {
        header: "Sl.No.",
        accessorKey: "serialNo",
        type: ["serialNo"],
        width: 60,
        maxWidth: 60,
        minWidth: 60,
      },
      { header: "Program", accessorKey: "programName" },
      { header: "Division", accessorKey: "divisionName" },
    ];

    // Registered programs columns
    const registeredColumnsConfig = [
      ...baseColumnsConfig,
      { header: "Team", accessorKey: "teamName" },
      {
        header: "Participants Count",
        accessorKey: "participantsCount",
        type: ["number"],
      },
      {
        header: "Participants",
        accessorKey: "participantNames",
        type: ["array", "vertical"],
      },
      { header: "Status", accessorKey: "status" },
    ];

    // Unregistered programs columns (no team/participant info)
    const unregisteredColumnsConfig = [
      ...baseColumnsConfig,
      { header: "Registration Status", accessorKey: "registrationStatus" },
    ];

    // Common filter configuration
    const commonFilterConfig = [
      {
        id: "programId",
        label: "Program",
        inputType: "select",
        options: formatOptions(programs),
      },
      {
        id: "divisionId",
        label: "Division",
        inputType: "select",
        options: formatOptions(divisions),
      },
      {
        id: "programType",
        label: "Type",
        inputType: "select",
        options: [
          { value: "Individual", label: "Individual" },
          { value: "Group", label: "Group" },
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

    // Add team filter only for Program Committee
    const filterConfig =
      activeRole === "Program Committee"
        ? [
            ...commonFilterConfig,
            {
              id: "teamId",
              label: "Team",
              inputType: "select",
              options: formatOptions(teams),
            },
          ]
        : commonFilterConfig;

    let apiFilters = {};
    if (activeRole === "Program Leader" && teams?.length > 0) {
      apiFilters = {
        teamId: teams[0]._id || "Unknown",
      };
    }

    const tabsConfig = [
      {
        label: "Registered Programs",
        value: "registered",
        resource: "registrations",
        apiEndpoint: "program-registration",
        printTitle: "Registered Programs",
        filterTitle: "Filter Registered Programs",
        columnsConfig: registeredColumnsConfig,
        filterConfig: filterConfig,
        readOnly: true,
        filterType: "api",
        apiFilters: apiFilters,
      },
      {
        label: "Unregistered Programs",
        value: "unregistered",
        resource: "unregisteredPrograms",
        apiEndpoint: "program-registration/unregistered",
        printTitle: "Unregistered Programs",
        filterTitle: "Filter Unregistered Programs",
        columnsConfig: unregisteredColumnsConfig,
        filterConfig: commonFilterConfig, // No team filter for unregistered
        readOnly: true,
        filterType: "api",
        apiFilters: apiFilters,
      },
    ];

    return (
      <>
        <Header
          title="REGISTRATION STATUS"
          subTitle={
            activeRole === "Program Committee"
              ? "View All Program Registration Status"
              : "View Your Team's Registration Status"
          }
        />
        <AdvancedDataTableComponent tabsConfig={tabsConfig} apiKey={apiKey} />
      </>
    );
  } catch (error) {
    console.error("Error loading registration status page:", error?.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Access Error"
        description={
          error?.message ||
          "An unexpected error occurred while processing your request."
        }
      />
    );
  }
}

export const revalidate = 60;
