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
    searchParams: "roles=Teacher&projection=_id,name",
  },
  {
    pathname: "subjects",
    searchParams: "projection=_id,name",
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
  { accessorKey: "_id", header: "Class ID" },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "batchName", header: "Batch" },
  { accessorKey: "teacherName", header: "Teacher" },
  { accessorKey: "subjectsName", header: "Subjects", type: ["array"] },
];

const statusMessages = {
  create: "Class added successfully!",
  edit: "Class Updated successfully!",
  delete: "Class deleted successfully!",
};

export default async function ClassesPage() {
  try {
    const apiKey = process.env.API_KEY;

    const [batches, teachers, subjects] = await Promise.all(
      API_ENDPOINTS.map((endpoint) =>
        fetchData(endpoint.pathname, apiKey, endpoint.searchParams)
      )
    );

    const formFields = [
      {
        name: "_id",
        label: "Class ID",
        type: "text",
        placeholder: "Class ID",
        required: true,
        validators: {
          minLength: 3,
          minLengthMessage: "Class ID must be at least 3 characters long",
          pattern: "^[A-Z0-9-]+$",
          patternMessage:
            "Class ID must only contain uppercase letters, numbers, and hyphens (-).",
        },
        hideOnEdit: true,
      },
      {
        name: "name",
        label: "Name",
        type: "text",
        placeholder: "Class name",
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
        required: true,
        options: formatOptions(batches),
      },
      {
        name: "teacherId",
        label: "Assign a teacher",
        type: "text",
        inputType: "select",
        required: true,
        options: formatOptions(teachers),
      },
      {
        name: "subjectIds",
        label: "Assign Subjects",
        type: "array",
        inputType: "multiSelect",
        options: formatOptions(subjects),
      },
    ];

    const filterConfig = [
      { id: "name", label: "Name" },
      {
        id: "batchId",
        label: "Select a batch",
        inputType: "select",
        options: formatOptions(batches),
      },
      {
        id: "teacherId",
        label: "Select a teacher",
        inputType: "select",
        options: formatOptions(teachers),
      },
    ];

    return (
      <>
        <Header
          title="CLASSES MANAGEMENT"
          subTitle="Organize and Oversee Classes"
        />
        <DataTableComponent
          resource="classes"
          initialData={[]}
          columnsConfig={columnsConfig}
          formFields={formFields}
          apiKey={apiKey}
          createFormTitle="Add New Class"
          editFormTitle="Edit Class"
          deleteFormTitle="Delete Class"
          createSuccessMessage={statusMessages.create}
          editSuccessMessage={statusMessages.edit}
          deleteSuccessMessage={statusMessages.delete}
          filterConfig={filterConfig}
          limit={20}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading classes:", error.message);
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
export const dynamic = "force-static";
