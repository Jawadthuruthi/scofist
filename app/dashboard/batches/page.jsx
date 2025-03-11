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
    const batchesResponse = await fetch(`${baseURL}/api/batches`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "api-key": token,
      },
    });
    const { batches } = await batchesResponse.json();

    const columnConfig = [
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
      { accessorKey: "name", header: "Name" },
      {
        accessorKey: "graduationYear",
        header: "Graduation Year",
        type: ["sortable"],
      },
      { accessorKey: "status", header: "Status", type: ["badge"] },
    ];

    const formFields = [
      { name: "name", label: "Name", type: "text", placeholder: "Batch name" },
      {
        name: "startYear",
        label: "Academic Start Year",
        type: "text",
        placeholder: "2024",
      },
      {
        name: "endYear",
        label: "Academic End Year",
        type: "text",
        placeholder: "2025",
      },
      {
        name: "status",
        label: "Status",
        type: "text",
        inputType: "multiSelect",
        options: ["Active", "Graduated"],
      },
    ];

    return (
      <>
        <Header
          title="BATCHES MANAGEMENT"
          subTitle="Organize and Oversee Batches"
        />
        <DataTableComponent
          initialData={batches}
          columnConfig={columnConfig}
          formFields={formFields}
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
