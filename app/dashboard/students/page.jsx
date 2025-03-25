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
  {
    accessorKey: "profilePic",
    header: "Image",
    type: ["avatar"],
    width: 70,
    maxWidth: 70,
    minWidth: 70,
  },
  { accessorKey: "_id", header: "Student ID" },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "contactNumber", header: "Contact Number" },
  { accessorKey: "alternativeNumber", header: "Alternative Number" },
  { accessorKey: "dateOfBirth", header: "Date Of Birth", type: ["date"] },
  { accessorKey: "roles", header: "Roles", type: ["array"] },
  { accessorKey: "address", header: "Address", type: ["nested"] },
  { accessorKey: "status", header: "Status", type: ["badge"] },
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
      { label: "Dropped Out", value: "Dropped Out" },
    ],
  },
];

const statusMessages = {
  create: "Student added successfully!",
  edit: "Student updated successfully!",
  delete: "Student deleted successfully!",
};

const apiFilters = {
  role: ["Student"],
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

    const batchesResponse = await fetch(
      `${baseURL}/api/batches?projection=_id,name`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "api-key": token,
        },
        next: { revalidate: 60 },
      }
    );
    const batchesData = await batchesResponse.json();
    const batches = batchesData.batches;

    const classesResponse = await fetch(
      `${baseURL}/api/classes?projection=_id,name`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "api-key": token,
        },
        next: { revalidate: 60 },
      }
    );
    const classesData = await classesResponse.json();
    const classes = classesData.classes;

    const formattedBatches = batches.map((batch) => ({
      value: batch._id,
      label: batch.name,
    }));

    const formattedClasses = classes.map((batch) => ({
      value: batch._id,
      label: batch.name,
    }));

    const formFields = [
      {
        name: "profilePic",
        label: "Add Profile",
        type: "object",
        inputType: "image",
        placeholder: "Profile Pic",
        defaultValue: {},
        className: "md:col-span-2",
        maxFileSize: 2 * 1024 * 1024, // 2MB in bytes
      },
      {
        name: "_id",
        label: "Student ID",
        type: "text",
        placeholder: "Student ID",
        required: true,
        validators: {
          minLength: 3,
          minLengthMessage: "Student ID must be at least 3 characters long",
          pattern: "^[A-Za-z0-9-]+$",
          patternMessage:
            "Student ID can only contain letters, numbers, and hyphens",
        },
        hideOnEdit: true,
      },
      {
        name: "name",
        label: "Name",
        type: "text",
        placeholder: "Student name",
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
        type: "text",
        placeholder: "Contact Number",
        required: true,
        validators: {
          pattern: "^(\\+?\\d{1,3}[-.\\s]?)?\\d{10}$",
          patternMessage: "Invalid contact number format",
        },
      },
      {
        name: "alternativeNumber",
        label: "Alternative Number",
        type: "text",
        placeholder: "Alternative Number",
        validators: {
          pattern: "^(\\+?\\d{1,3}[-.\\s]?)?\\d{10}$",
          patternMessage: "Invalid contact number format",
        },
      },
      {
        name: "dateOfBirth",
        label: "Date Of Birth",
        type: "date",
        placeholder: "Date Of Birth",
        required: true,
        validators: {
          maxDate: new Date().toISOString().split("T")[0],
          maxDateMessage: "Date of birth cannot be in the future",
        },
      },
      {
        name: "classId",
        label: "Assign Class",
        type: "text",
        inputType: "select",
        options: formattedClasses,
        validators: {
          minLength: 1,
          minLengthMessage: "Please select at least one class",
        },
        required: true,
      },
      {
        name: "batchId",
        label: "Assign Batch",
        type: "text",
        inputType: "select",
        options: formattedBatches,
        validators: {
          minLength: 1,
          minLengthMessage: "Please select at least one batch",
        },
        required: true,
      },
      {
        name: "admissionClassId",
        label: "Admission Class",
        type: "text",
        inputType: "select",
        options: formattedClasses,
        validators: {
          minLength: 1,
          minLengthMessage: "Please select at least one class",
        },
      },
      {
        name: "admissionDate",
        label: "Admission Date",
        type: "date",
        placeholder: "Admission Date",
        validators: {
          maxDate: new Date().toISOString().split("T")[0],
          maxDateMessage: "Admission date cannot be in the future",
        },
      },
      {
        name: "aadharNo",
        label: "Aadhar Number",
        type: "text",
        placeholder: "Aadhar Number",
        validators: {
          pattern: "^[0-9]{12}$",
          patternMessage: "Invalid Aadhar number format",
        },
      },
      {
        name: "bloodGroup",
        label: "Blood Group",
        type: "text",
        placeholder: "Blood Group",
      },
      {
        name: "guardianName",
        label: "Guardian Name",
        type: "text",
        placeholder: "Guardian Name",
        required: true,
        validators: {
          minLength: 3,
          minLengthMessage: "Guardian name must be at least 3 characters long",
        },
      },
      {
        name: "guardianContactNumber",
        label: "Guardian Contact Number",
        type: "text",
        placeholder: "Guardian Contact Number",
        required: true,
        validators: {
          pattern: "^(\\+?\\d{1,3}[-.\\s]?)?\\d{10}$",
          patternMessage: "Invalid contact number format",
        },
      },
      {
        name: "relationship",
        label: "Guardian Relationship",
        type: "text",
        placeholder: "Guardian Relationship",
        required: true,
        validators: {
          minLength: 3,
          minLengthMessage:
            "Guardian relationship must be at least 3 characters long",
        },
      },
      {
        name: "islamicQualification",
        label: "Islamic Qualification",
        type: "text",
        placeholder: "Islamic Qualification",
      },
      {
        name: "academicQualification",
        label: "Academic Qualification",
        type: "text",
        placeholder: "Academic Qualification",
      },
      {
        name: "droppedOutDate",
        label: "Dropped Out Date",
        type: "date",
        placeholder: "Dropped Out Date",
        validators: {
          maxDate: new Date().toISOString().split("T")[0],
          maxDateMessage: "Dropped out date cannot be in the future",
          conditionalRequired: {
            dependentField: "status",
            expectedValue: "Dropped Out",
            message: "Dropped out date is required",
          },
        },
      },
      {
        name: "droppedOutClass",
        label: "Dropped Out Class",
        type: "array",
        inputType: "select",
        options: formattedClasses,
        validators: {
          minLength: 1,
          minLengthMessage: "Please select at least one class",
          conditionalRequired: {
            dependentField: "status",
            expectedValue: "Dropped Out",
            message: "Dropped out class is required",
          },
        },
      },
      {
        name: "droppedOutReason",
        label: "Dropped Out Reason",
        type: "text",
        placeholder: "Dropped Out Reason",
        validators: {
          minLength: 3,
          minLengthMessage:
            "Dropped out reason must be at least 3 characters long",
          conditionalRequired: {
            dependentField: "status",
            expectedValue: "Dropped Out",
            message: "Dropped out reason is required",
          },
        },
      },
      {
        name: "graduatedYear",
        label: "Graduated Year",
        type: "number",
        placeholder: "Graduated Year",
        validators: {
          pattern: "^\\d{4}$",
          patternMessage: "Graduation year must be a 4-digit number",
          max: new Date().getFullYear(),
          maxMessage: "Graduation year cannot be in the future",
          min: 2000,
          minMessage: "Graduation year must be at least 2000",
          conditionalRequired: {
            dependentField: "status",
            expectedValue: "Graduated",
            message: "Graduation year is required",
          },
        },
      },
      {
        name: "roles",
        label: "Roles",
        type: "text",
        inputType: "multiSelect",
        defaultValue: ["Student"],
        required: true,
        options: [{ label: "Student", value: "Student" }],
        validators: {
          minLength: 1,
          minLengthMessage: "Please select at least one role",
        },
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
        placeholder: "State",
        required: true,
      },
      {
        name: "pin",
        label: "Pin Code",
        type: "text",
        placeholder: "Pin Code",
        validators: {
          pattern: "^\\d{6}$",
          patternMessage: "Pin Code must be a 6-digit number",
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
          { label: "Active", value: "Active" },
          { label: "Graduated", value: "Graduated" },
          { label: "Dropped Out", value: "Dropped Out" },
        ],
      },
    ];

    return (
      <>
        <Header
          title="STUDENTS MANAGEMENT"
          subTitle="Organize and Oversee Students"
        />
        <DataTableComponent
          resource="users"
          initialData={[]}
          columnsConfig={columnsConfig}
          formFields={formFields}
          token={token}
          createFormTitle="Add New Student"
          editFormTitle="Edit Student"
          deleteFormTitle="Delete Student"
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
    console.error("Error loading students:", error.message);
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
