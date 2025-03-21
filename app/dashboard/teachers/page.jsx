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
    accessorKey: "profilePic",
    header: "Image",
    type: ["avatar"],
    width: 70,
    maxWidth: 70,
    minWidth: 70,
  },
  {
    accessorKey: "serialNo",
    header: "Sl.No",
    type: ["serialNo"],
    width: 60,
    maxWidth: 60,
    minWidth: 60,
  },
  { accessorKey: "_id", header: "Teacher ID" },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "roles", header: "Roles", type: ["array"] },
  { accessorKey: "contactNumber", header: "Contact Number" },
  { accessorKey: "alternativeNumber", header: "Alternative Number" },
  { accessorKey: "address", header: "Address", type: ["nested"] },
  { accessorKey: "dateOfBirth", header: "Date Of Birth", type: ["date"] },
  { accessorKey: "dateOfJoining", header: "Date Of Joining", type: ["date"] },
  { accessorKey: "status", header: "Status", type: ["badge"] },
];

const formFields = [
  {
    name: "_id",
    label: "Teacher ID",
    type: "text",
    placeholder: "Teacher ID",
    required: true,
    validators: {
      minLength: 3,
      minLengthMessage: "Teacher ID must be at least 3 characters long",
    },
  },
  {
    name: "name",
    label: "Name",
    type: "text",
    placeholder: "Teacher name",
    required: true,
    validators: {
      minLength: 3,
      minLengthMessage: "Name must be at least 3 characters long",
    },
  },
  {
    name: "email",
    label: "Email",
    type: "email",
    placeholder: "abcd@gmaill.com",
    required: true,
  },
  {
    name: "contactNumber",
    label: "Contact Number",
    type: "number",
    placeholder: "Contact Number",
    required: true,
  },
  {
    name: "houseName",
    label: "House Name",
    type: "text",
    placeholder: "House Name",
  },
  {
    name: "place",
    label: "Place",
    type: "text",
    placeholder: "Place",
    required: true,
  },
  {
    name: "postOffice",
    label: "Post Office",
    type: "text",
    placeholder: "Post Office",
  },
  {
    name: "district",
    label: "District",
    type: "text",
    placeholder: "District",
    required: true,
  },
  {
    name: "state",
    label: "State",
    type: "text",
    placeholder: "District",
    required: true,
  },
  {
    name: "pin",
    label: "Pin Code",
    type: "number",
    placeholder: "Pin Code",
  },
  {
    name: "alternativeNumber",
    label: "Alternative Number",
    type: "number",
    placeholder: "Alternative Number",
    required: true,
  },
  {
    name: "dateOfBirth",
    label: "Date Of Birth",
    type: "date",
    placeholder: "Date Of Birth",
    required: true,
  },
  {
    name: "dateOfJoining",
    label: "Date Of Joining",
    type: "date",
    placeholder: "Date Of Joining",
    required: true,
  },
  {
    name: "roles",
    label: "Roles",
    type: "text",
    inputType: "multiSelect",
    defaultValue: ["Teacher"],
    required: true,
    options: [
      { label: "College Admin", value: "College Admin" },
      { label: "Org Admin", value: "Org Admin" },
      { label: "Teacher", value: "Teacher" },
    ],
  },
  {
    name: "status",
    label: "Status",
    type: "text",
    inputType: "select",
    defaultValue: "Active",
    required: true,
    options: [
      { label: "Active", value: "Active" },
      { label: "Graduated", value: "Graduated" },
    ],
  },
];

const filterConfig = [
  { id: "name", label: "Name" },
  {
    id: "status",
    label: "Status",
    inputType: "select",
    options: [
      { label: "Active", value: "Active" },
      { label: "Graduated", value: "Graduated" },
    ],
  },
];

const statusMessages = {
  create: "Teacher added successfully!",
  edit: "Teacher updated successfully!",
  delete: "Teacher deleted successfully!",
};

const apiFilters = {
  roles: ["Teacher"],
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
          title="TEACHERS MANAGEMENT"
          subTitle="Organize and Oversee Teachers"
        />
        <DataTableComponent
          resource="users"
          initialData={[]}
          columnsConfig={columnsConfig}
          formFields={formFields}
          token={token}
          createFormTitle="Add New Teacher"
          editFormTitle="Edit Teacher"
          deleteFormTitle="Delete Teacher"
          createSuccessMessage={statusMessages.create}
          editSuccessMessage={statusMessages.edit}
          deleteSuccessMessage={statusMessages.delete}
          filterConfig={filterConfig}
          limit={20}
          apiFilters={apiFilters}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading teachers:", error.message);
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
