import { cookies } from "next/headers";
import DataTableComponent from "@/components/DataTableComponent";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { baseURL } from "@/lib/utils";

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
];

const statusMessages = {
  create: "Class added successfully!",
  edit: "Class updated successfully!",
  delete: "Class deleted successfully!",
};

export default async function ClassesPage() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    const batchesResponse = await fetch(`${baseURL}/api/batches`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "api-key": token,
      },
      next: { revalidate: 60 },
    });
    const batchesData = await batchesResponse.json();
    const batches = batchesData.batches;

    const teachersResponse = await fetch(`${baseURL}/api/users`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "api-key": token,
      },
      next: { revalidate: 60 },
    });
    const teachersData = await teachersResponse.json();
    const teachers = teachersData.users;

    console.log(batches.length);

    if (!token) {
      return (
        <ErrorPage
          statusCode={403}
          title="Access Denied"
          description="You don't have permission to access this resource."
        />
      );
    }

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
        options: batches.map((batch) => ({
          value: batch._id,
          label: batch.name,
        })),
      },
      {
        name: "teacherId",
        label: "Assign a teacher",
        type: "text",
        inputType: "select",
        required: true,
        options: teachers.map((teacher) => ({
          value: teacher._id,
          label: teacher.name,
        })),
      },
    ];

    const filterConfig = [
      { id: "name", label: "Name" },
      {
        id: "batchId",
        label: "Select a batch",
        inputType: "select",
        options: [],
      },
      {
        id: "teacherId",
        label: "Select a teacher",
        inputType: "select",
        options: [],
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
          token={token}
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
