import DataTableComponent from "@/components/DataTableComponent";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { fetchData, formatOptions } from "@/lib/utils";
import { cookies } from "next/headers";

const columnsConfig = [
  {
    id: "select",
    header: "Select",
    type: ["checkbox"],
    width: 50,
    maxWidth: 50,
    minWidth: 50,
  },
  {
    accessorKey: "serialNo",
    header: "Sl.No",
    type: ["serialNo"],
    width: 60,
    maxWidth: 60,
    minWidth: 60,
  },
  { accessorKey: "programName", header: "Program" },
  { accessorKey: "teamName", header: "Team" },
  {
    accessorKey: "participantsCount",
    header: "Participants Count",
    type: ["number"],
  },
  {
    accessorKey: "participantNames",
    header: "Participants",
    type: ["array", "vertical"],
  },
  { accessorKey: "status", header: "Status" },
];

const filterConfig = [
  { id: "programId", label: "Program" },
  { id: "teamId", label: "Team" },
  { id: "status", label: "Status" },
];

const statusMessages = {
  create: "Program registration added successfully!",
  edit: "Program registration updated successfully!",
  delete: "Program registration(s) deleted successfully!",
};

export default async function ProgramRegistrationPage() {
  try {
    const cookiesStore = await cookies();
    const activeRole = cookiesStore.get("active-role")?.value;
    const userId = cookiesStore.get("user-id")?.value;
    const apiKey = process.env.API_KEY;

    // Fetch data based on role
    let programs, teams, participants, divisions;

    if (activeRole === "Program Committee") {
      // Program Committee can see all data
      [programs, teams, participants, divisions] = await Promise.all([
        fetchData("programs", "projection=_id,name,maxParticipants,type", 0),
        fetchData("teams", "projection=_id,name", 0),
        fetchData("participants", "projection=_id,name,teamId", 0),
        fetchData("divisions", "projection=_id,name", 0),
      ]);
    } else if (activeRole === "Program Leader") {
      // Program Leader can only see their own team's data
      const userTeams = await fetchData(
        "teams",
        `leaderId=${userId}&projection=_id,name`,
        0
      );

      if (!userTeams || userTeams.length === 0) {
        throw new Error("No team found for this program leader");
      }

      const teamIds = userTeams.map((team) => team._id);

      [programs, participants, divisions] = await Promise.all([
        fetchData("programs", "projection=_id,name,maxParticipants,type", 0),
        fetchData(
          "participants",
          `teamId=${teamIds[0]}&projection=_id,name,teamId`,
          0
        ),
        fetchData("divisions", "projection=_id,name", 0),
      ]);

      teams = userTeams;
    } else {
      throw new Error("Unauthorized access");
    }

    // Form fields for Program Committee (can select any team)
    const programCommitteeFormFields = [
      {
        name: "divisionId",
        label: "Division",
        type: "text",
        inputType: "select",
        options: formatOptions(divisions),
        placeholder: "Select division",
        readOnlyOnEdit: true,
      },
      {
        name: "programId",
        label: "Program",
        type: "text",
        inputType: "select",
        options: formatOptions(programs),
        required: true,
        placeholder: "Select program",
        filter: {
          dependentField: "divisionId",
        },
        readOnlyOnEdit: true,
      },
      {
        name: "teamId",
        label: "Team",
        type: "text",
        inputType: "select",
        options: formatOptions(teams),
        required: true,
        placeholder: "Select team",
      },
      {
        name: "participants",
        label: "Participants",
        type: "array",
        inputType: "multiSelect",
        options: formatOptions(participants),
        required: true,
        placeholder: "Select participants",
        validators: {
          minLength: 1,
          minLengthMessage: "At least one participant must be selected",
        },
        filter: {
          dependentField: "teamId",
        },
        helpText: "Select participants from the chosen team",
      },
    ];

    // Form fields for Program Leader (team is pre-selected)
    const programLeaderFormFields = [
      {
        name: "divisionId",
        label: "Division",
        type: "text",
        inputType: "select",
        options: formatOptions(divisions),
        placeholder: "Select division",
        readOnlyOnEdit: true,
      },
      {
        name: "programId",
        label: "Program",
        type: "text",
        inputType: "select",
        options: formatOptions(programs),
        required: true,
        placeholder: "Select program",
        filter: {
          dependentField: "divisionId",
        },
        readOnlyOnEdit: true,
      },
      {
        name: "participants",
        label: "Participants",
        type: "array",
        inputType: "multiSelect",
        options: formatOptions(participants),
        required: true,
        placeholder: "Select participants from your team",
        validators: {
          minLength: 1,
          minLengthMessage: "At least one participant must be selected",
        },
      },
    ];

    const formFields =
      activeRole === "Program Committee"
        ? programCommitteeFormFields
        : programLeaderFormFields;

    const filteredColumnsConfig = columnsConfig.filter((column) => {
      if (activeRole === "Program Committee") {
        return true;
      } else {
        return column.id !== "select";
      }
    });

    // Build query parameters for fetching registrations
    let registrationQuery = "";
    if (activeRole === "Program Leader" && teams.length > 0) {
      registrationQuery = `teamId=${teams[0]._id}`;
    }

    return (
      <>
        <Header
          title="PROGRAM REGISTRATIONS"
          subTitle={
            activeRole === "Program Committee"
              ? "Manage All Program Registrations"
              : "Manage Your Team's Program Registrations"
          }
        />
        <DataTableComponent
          apiEndpoint="program-registration"
          resource="registrations"
          initialData={[]}
          columnsConfig={filteredColumnsConfig}
          formFields={formFields}
          apiKey={apiKey}
          createFormTitle="Register for Program"
          editFormTitle="Update Registration"
          deleteFormTitle="Delete Registration"
          createSuccessMessage={statusMessages.create}
          editSuccessMessage={statusMessages.edit}
          deleteSuccessMessage={statusMessages.delete}
          filterConfig={filterConfig}
          limit={20}
          readOnly={
            activeRole !== "Program Committee" &&
            activeRole !== "Program Leader"
          }
          additionalProps={{
            userId: userId,
            activeRole: activeRole,
            defaultTeamId:
              activeRole === "Program Leader" && teams.length > 0
                ? teams[0]._id
                : null,
          }}
          queryParams={registrationQuery}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading program registration page:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Access Error"
        description={
          error.message ||
          "An unexpected error occurred while processing your request."
        }
      />
    );
  }
}

export const revalidate = 60;
