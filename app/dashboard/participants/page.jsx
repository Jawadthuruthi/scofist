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
  { accessorKey: "_id", header: "Participant ID" },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "batchName", header: "Batch" },
  {
    accessorKey: "chestNumber",
    header: "Chest Number",
    type: ["number"],
  },
  { accessorKey: "teamName", header: "Team" },
  { accessorKey: "divisionName", header: "Division" },
  {
    accessorKey: "programsCount",
    header: "Programs Count",
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

const filterConfig = [
  { id: "name", label: "Name" },
  { id: "batchId", label: "Batch" },
  { id: "teamId", label: "Team" },
  { id: "divisionId", label: "Division" },
];

const statusMessages = {
  create: "Participant(s) added successfully!",
  edit: "Participant updated successfully!",
  delete: "Participant(s) deleted successfully!",
};

export default async function ParticipantsPage() {
  try {
    const cookiesStore = await cookies();
    const activeRole = cookiesStore.get("active-role")?.value;
    const apiKey = process.env.API_KEY;

    // Fetch related data for form options
    const [users, batches, teams, divisions] = await Promise.all([
      fetchData("users", "projection=_id,name&status=Active&roles=Student", 0),
      fetchData("batches", "projection=_id,name&status=Active", 0),
      fetchData("teams", "projection=_id,name", 0),
      fetchData("divisions", "projection=_id,name&type=Primary", 0),
    ]);

    const formFields = [
      {
        name: "batchId",
        label: "Batch",
        type: "text",
        inputType: "select",
        options: formatOptions(batches),
        required: true,
        placeholder: "Select batch",
      },
      {
        name: "participantIds",
        label: "Select Participants",
        type: "array",
        inputType: "multiSelect",
        options: formatOptions(users),
        required: true,
        placeholder: "Select participants",
        validators: {
          minLength: 1,
          minLengthMessage: "At least one participant must be selected",
        },
        helpText: "Participant IDs will be automatically set to match User IDs",
        filter: {
          dependentField: "batchId",
        },
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
        name: "divisionId",
        label: "Division",
        type: "text",
        inputType: "select",
        options: formatOptions(divisions),
        required: true,
        placeholder: "Select division",
        helpText:
          "Chest numbers will be auto-assigned based on division range and batch/ID order",
      },
    ];

    // Edit form fields (single participant)
    const editFormFields = [
      {
        name: "name",
        label: "Name",
        type: "text",
        placeholder: "Participant name",
        required: true,
        validators: {
          minLength: 3,
          minLengthMessage: "Name must be at least 3 characters long",
        },
        readOnly: true,
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
        name: "divisionId",
        label: "Division",
        type: "text",
        inputType: "select",
        options: formatOptions(divisions),
        required: true,
        placeholder: "Select division",
        helpText: "Changing division may reassign chest number",
      },
    ];

    const filteredColumnsConfig = columnsConfig.filter((column) => {
      if (activeRole === "Program Committee") {
        return true;
      } else {
        return column.id !== "select";
      }
    });

    return (
      <>
        <Header
          title="PARTICIPANTS MANAGEMENT"
          subTitle="Organize and Oversee Participants"
        />
        <DataTableComponent
          resource="participants"
          initialData={[]}
          columnsConfig={filteredColumnsConfig}
          formFields={formFields}
          editFormFields={editFormFields}
          apiKey={apiKey}
          createFormTitle="Add New Participants"
          editFormTitle="Edit Participant"
          deleteFormTitle="Delete Participants"
          createSuccessMessage={statusMessages.create}
          editSuccessMessage={statusMessages.edit}
          deleteSuccessMessage={statusMessages.delete}
          filterConfig={filterConfig}
          limit={20}
          readOnly={activeRole !== "Program Committee"}
          bulkCreate={true}
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

export const revalidate = 60;
