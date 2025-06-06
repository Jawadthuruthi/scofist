import DataTableComponent from "@/components/DataTableComponent";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { fetchData, formatOptions } from "@/lib/utils";

const API_ENDPOINTS = [
  {
    pathname: "batches",
    searchParams: "projection=_id,name,students",
  },
  {
    pathname: "users",
    searchParams: "roles=Student&projection=_id,name,batchId&status=Active",
  },
];

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
  { accessorKey: "_id", header: "Group ID" },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "students", header: "Students", type: ["array", "vertical"] },
];

const statusMessages = {
  create: "Group added successfully!",
  edit: "Group Updated successfully!",
  delete: "Group deleted successfully!",
};

export default async function GroupsPage() {
  try {
    const apiKey = process.env.API_KEY;

    const [batches, students] = await Promise.all(
      API_ENDPOINTS.map((endpoint) =>
        fetchData(endpoint.pathname, endpoint.searchParams)
      )
    );

    const formFields = [
      {
        name: "_id",
        label: "Group ID",
        type: "text",
        placeholder: "Group ID",
        required: true,
        validators: {
          minLength: 3,
          minLengthMessage: "Group ID must be at least 3 characters long",
          pattern: "^[A-Z0-9-]+$",
          patternMessage:
            "Group ID must only contain uppercase letters, numbers, and hyphens (-).",
        },
        hideOnEdit: true,
      },
      {
        name: "name",
        label: "Name",
        type: "text",
        placeholder: "Group name",
        required: true,
        validators: {
          minLength: 3,
          minLengthMessage: "Name must be at least 3 characters long",
        },
      },
      {
        name: "batchId",
        label: "Assign a batch",
        type: "text",
        inputType: "select",
        options: formatOptions(batches),
      },
      {
        name: "studentsId",
        label: "Assign students",
        type: "text",
        inputType: "multiSelect",
        required: true,
        options: formatOptions(students),
        showSelectedCount: true,
        filter: {
          dependentField: "batchId",
        },
      },
    ];

    const filterConfig = [{ id: "name", label: "Name" }];

    return (
      <>
        <Header
          title="GROUPS MANAGEMENT"
          subTitle="Organize and Oversee Groups"
        />
        <DataTableComponent
          resource="groups"
          apiEndpoint="literary/groups"
          initialData={[]}
          columnsConfig={columnsConfig}
          formFields={formFields}
          apiKey={apiKey}
          createFormTitle="Add New Group"
          editFormTitle="Edit Group"
          deleteFormTitle="Delete Group"
          createSuccessMessage={statusMessages.create}
          editSuccessMessage={statusMessages.edit}
          deleteSuccessMessage={statusMessages.delete}
          filterConfig={filterConfig}
          limit={20}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading groups:", error.message);
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
