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
  { accessorKey: "periodNumber", header: "Period No." },
  { accessorKey: "startTime", header: "Start Time" },
  { accessorKey: "endTime", header: "End Time" },
  { accessorKey: "formattedTime", header: "12 Hours Format" },
];

const formFields = [
  {
    name: "periodNumber",
    label: "Period No.",
    type: "number",
    placeholder: "Period No.",
    required: true,
  },
  {
    name: "startTime",
    label: "Start Time",
    type: "time",
    placeholder: "Start Time",
    required: true,
    validators: {
      compareWith: [
        {
          field: "endTime",
          operator: "<",
          message: "Start time must be before end time",
          errorPath: "startTime",
        },
      ],
    },
  },
  {
    name: "endTime",
    label: "End Time",
    type: "time",
    placeholder: "End Time",
    required: true,
    validators: {
      compareWith: [
        {
          field: "startTime",
          operator: ">",
          message: "End time must be after start time",
          errorPath: "endTime",
        },
      ],
    },
  },
];

const filterConfig = [
  { id: "periodNumber", label: "Period No." },
  { id: "startTime", label: "Start Time" },
  { id: "endTime", label: "End Time" },
];

const statusMessages = {
  create: "Period added successfully!",
  edit: "Period Updated successfully!",
  delete: "Period deleted successfully!",
};

export default async function PeriodsPage() {
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
          title="PERIODS MANAGEMENT"
          subTitle="Organize and Oversee Periods"
        />
        <DataTableComponent
          resource="periods"
          initialData={[]}
          columnsConfig={columnsConfig}
          formFields={formFields}
          token={token}
          createFormTitle="Add New Period"
          editFormTitle="Edit Period"
          deleteFormTitle="Delete Period"
          createSuccessMessage={statusMessages.create}
          editSuccessMessage={statusMessages.edit}
          deleteSuccessMessage={statusMessages.delete}
          filterConfig={filterConfig}
          limit={20}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading periods:", error.message);
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
