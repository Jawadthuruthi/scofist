import { cookies } from "next/headers";
import DataTableComponent from "@/components/DataTableComponent";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";

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
  { accessorKey: "_id", header: "Subject ID" },
  { accessorKey: "name", header: "Name" },
];

const formFields = [
  {
    name: "_id",
    label: "Subject ID",
    type: "text",
    placeholder: "Subject ID",
    required: true,
    validators: {
      minLength: 3,
      minLengthMessage: "Subject ID must be at least 3 characters long",
      pattern: "^[A-Z0-9-]+$",
      patternMessage:
        "Subject ID must only contain uppercase letters, numbers, and hyphens (-).",
    },
    hideOnEdit: true,
  },
  {
    name: "name",
    label: "Name",
    type: "text",
    placeholder: "Subject name",
    required: true,
    validators: {
      minLength: 3,
      minLengthMessage: "Name must be at least 3 characters long",
    },
  },
];

const filterConfig = [
  { id: "_id", label: "Subject ID" },
  { id: "name", label: "Name" },
];

const statusMessages = {
  create: "Subject added successfully!",
  edit: "Subject Updated successfully!",
  delete: "Subject deleted successfully!",
};

export default async function BatchesPage() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return (
        <ErrorPage
          statusCode={403}
          title="Access Denied"
          description="You don't have permission to access this resource."
        />
      );
    }

    return (
      <>
        <Header
          title="SUBJECTS MANAGEMENT"
          subTitle="Organize and Oversee Batches"
        />
        <DataTableComponent
          resource="subjects"
          initialData={[]}
          columnsConfig={columnsConfig}
          formFields={formFields}
          token={token}
          createFormTitle="Add New Subject"
          editFormTitle="Edit Subject"
          deleteFormTitle="Delete Subject"
          createSuccessMessage={statusMessages.create}
          editSuccessMessage={statusMessages.edit}
          deleteSuccessMessage={statusMessages.delete}
          filterConfig={filterConfig}
          limit={20}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading subjects:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
}

export const revalidate = 30;
