import DataTableComponent from "@/components/DataTableComponent";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { baseURL } from "@/lib/utils";
import { cookies } from "next/headers";

const page = async () => {
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
    const batchesResponse = await fetch(`${baseURL}/api/batches?limit=20`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "api-key": token,
      },
      next: { revalidate: 0 },
    });
    const { batches } = await batchesResponse.json();

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
      { accessorKey: "_id", header: "Batch ID" },
      { accessorKey: "name", header: "Name" },
      {
        accessorKey: "academicYear",
        header: "Academic Year",
        type: ["sortable"],
      },
      { accessorKey: "status", header: "Status", type: ["badge"] },
    ];

    const formFields = [
      {
        name: "_id",
        label: "Batch ID",
        type: "text",
        placeholder: "Batch ID",
        required: true,
        validators: {
          minLength: 3,
          minLengthMessage: "Butch ID must be at least 3 characters long",
        },
      },
      {
        name: "name",
        label: "Name",
        type: "text",
        placeholder: "Batch name",
        required: true,
        validators: {
          minLength: 3,
          minLengthMessage: "Name must be at least 3 characters long",
        },
      },
      {
        name: "startYear",
        label: "Academic Start Year",
        type: "number",
        placeholder: "2024",
        required: true,
        validators: {
          min: 2000,
          minMessage: "Start year cannot be before 2000",
          max: new Date().getFullYear() + 2,
          maxMessage: "Start year cannot be more than 2 years in future",
          compareWith: [
            {
              field: "endYear",
              operator: "<",
              message: "Start year must be before end year",
              errorPath: "startYear",
            },
          ],
        },
      },
      {
        name: "endYear",
        label: "Academic End Year",
        type: "number",
        placeholder: "2025",
        required: true,
        validators: {
          compareWith: [
            {
              field: "startYear",
              operator: ">",
              message: "End year must be after start year",
              errorPath: "endYear",
            },
          ],
        },
      },
      {
        name: "status",
        label: "Status",
        type: "text",
        inputType: "select",
        defaultValue: "Active",
        required: true,
        options: [
          {
            label: "Active",
            value: "Active",
          },
          {
            label: "Graduated",
            value: "Graduated",
          },
        ],
      },
    ];

    const filterConfig = [
      {
        id: "name",
        label: "Name",
      },
      {
        id: "academicYear",
        label: "Academic Year",
      },
      {
        id: "status",
        label: "Status",
        inputType: "select",
        options: [
          {
            label: "Active",
            value: "Active",
          },
          {
            label: "Graduated",
            value: "Graduated",
          },
        ],
      },
    ];

    return (
      <>
        <Header
          title="BATCHES MANAGEMENT"
          subTitle="Organize and Oversee Batches"
        />
        <DataTableComponent
          resource="batches"
          initialData={batches}
          columnsConfig={columnsConfig}
          formFields={formFields}
          token={token}
          createFormTitle="Add New Batch"
          editFormTitle="Edit Batch"
          deleteFormTitle="Delete Batch"
          createSuccessMessage="Batch added successfully!"
          editSuccessMessage="Batch updated successfully!"
          deleteSuccessMessage="Batch deleted successfully!"
          filterConfig={filterConfig}
          limit={batches.length || 20}
        />
      </>
    );
  } catch (error) {
    console.log(error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
};

export default page;
export const revalidate = 0;
