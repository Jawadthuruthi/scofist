import { cookies } from "next/headers";
import DataTableComponent from "@/components/DataTableComponent";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { fetchData, formatOptions } from "@/lib/utils";

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
  { accessorKey: "aadharNo", header: "Aadhar Number" },
  { accessorKey: "batchName", header: "Batch" },
  { accessorKey: "className", header: "Class" },
  { accessorKey: "admissionClassName", header: "Admission Class" },
  { accessorKey: "admissionDate", header: "Admission Date", type: ["date"] },
  { accessorKey: "dateOfBirth", header: "Date Of Birth", type: ["date"] },
  { accessorKey: "bloodGroup", header: "Blood Group" },
  { accessorKey: "roles", header: "Roles", type: ["array"] },
  { accessorKey: "address", header: "Address", type: ["nestedObject"] },
  { accessorKey: "guardianName", header: "Guardian Name" },
  { accessorKey: "relationship", header: "Guardian Relationship" },
  { accessorKey: "guardianContactNumber", header: "Guardian Contact Number" },
  {
    accessorKey: "guardianAlternativeNumber",
    header: "Guardian Alternative Number",
  },

  { accessorKey: "status", header: "Status", type: ["badge"] },
];

const statusMessages = {
  create: "Student added successfully!",
  edit: "Student Updated successfully!",
  delete: "Student deleted successfully!",
};

const apiFilters = {
  roles: ["Student"],
};

const API_ENDPOINTS = [
  {
    pathname: "batches",
    searchParams: "projection=_id,name",
  },
  {
    pathname: "classes",
    searchParams: "projection=_id,name",
  },
];
const SEMESTERS = [
  { label: "1st", value: "1st" },
  { label: "2nd", value: "2nd" },
  { label: "3rd", value: "3rd" },
  { label: "4th", value: "4th" },
  { label: "5th", value: "5th" },
];
export default async function BatchesPage() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;
    const activeRole = cookieStore.get("active-role")?.value;

    if (!token) {
      return (
        <ErrorPage
          statusCode={403}
          title="Access Denied"
          description="You don't have permission to access this resource."
        />
      );
    }

    const [batches, classes] = await Promise.all(
      API_ENDPOINTS.map((endpoint) =>
        fetchData(endpoint.pathname, token, endpoint.searchParams)
      )
    );

    const formFields = [
      // Personal Details Section
      {
        section: "Personal Details",
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
        section: "Personal Details",
        name: "_id",
        label: "Student ID",
        type: "text",
        placeholder: "Student ID",
        required: true,
        validators: {
          minLength: 3,
          minLengthMessage: "Student ID must be at least 3 characters long",
          pattern: "^[A-Z0-9-]+$",
          patternMessage:
            "Student ID can only contain letters, numbers, and hyphens",
        },
        hideOnEdit: true,
      },
      {
        section: "Personal Details",
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
        section: "Personal Details",
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
        section: "Personal Details",
        name: "bloodGroup",
        label: "Blood Group",
        type: "text",
        inputType: "select",
        options: [
          { label: "A+", value: "A+" },
          { label: "A-", value: "A-" },
          { label: "B+", value: "B+" },
          { label: "B-", value: "B-" },
          { label: "O+", value: "O+" },
          { label: "O-", value: "O-" },
          { label: "AB+", value: "AB+" },
          { label: "AB-", value: "AB-" },
        ],
      },
      {
        section: "Personal Details",
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
        section: "Personal Details",
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

      // Contact Information Section
      {
        section: "Contact Information",
        name: "email",
        label: "Email",
        type: "email",
        placeholder: "abcd@gmaill.com",
      },
      {
        section: "Contact Information",
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
        section: "Contact Information",
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
        section: "Contact Information",
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
        section: "Contact Information",
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
        section: "Contact Information",
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
        section: "Contact Information",
        name: "guardianAlternativeNumber",
        label: "Guardian Alternative Number",
        type: "text",
        placeholder: "Guardian Alternative Number",
        validators: {
          pattern: "^(\\+?\\d{1,3}[-.\\s]?)?\\d{10}$",
          patternMessage: "Invalid alternative number format",
        },
      },

      // Address Details Section
      {
        section: "Address Details",
        name: "houseName",
        label: "House Name",
        type: "text",
        placeholder: "House Name",
      },
      {
        section: "Address Details",
        name: "place",
        label: "Place",
        type: "text",
        placeholder: "Place",
        required: true,
      },
      {
        section: "Address Details",
        name: "postOffice",
        label: "Post Office",
        type: "text",
        placeholder: "Post Office",
      },
      {
        section: "Address Details",
        name: "district",
        label: "District",
        type: "text",
        placeholder: "District",
        required: true,
      },
      {
        section: "Address Details",
        name: "state",
        label: "State",
        type: "text",
        placeholder: "State",
        required: true,
      },
      {
        section: "Address Details",
        name: "pin",
        label: "Pin Code",
        type: "text",
        placeholder: "Pin Code",
        validators: {
          pattern: "^\\d{6}$",
          patternMessage: "Pin Code must be a 6-digit number",
        },
      },

      // Academic Information Section
      {
        section: "Academic Information",
        name: "batchId",
        label: "Assign Batch",
        type: "text",
        inputType: "select",
        options: formatOptions(batches),
        validators: {
          minLength: 1,
          minLengthMessage: "Please select at least one batch",
        },
        required: true,
      },

      {
        section: "Academic Information",
        name: "admissionClassId",
        label: "Admission Class",
        type: "text",
        inputType: "select",
        options: formatOptions(classes),
        validators: {
          minLength: 1,
          minLengthMessage: "Please select at least one class",
        },
      },
      {
        section: "Academic Information",
        name: "admissionDate",
        label: "Admission Date",
        type: "date",
        placeholder: "Admission Date",
        validators: {
          maxDate: new Date().toISOString().split("T")[0],
          maxDateMessage: "Admission date cannot be in the future",
        },
      },

      // Status Section
      {
        section: "Status",
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
      {
        section: "Status",
        name: "droppedOutDate",
        label: "Dropped Out Date",
        type: "date",
        placeholder: "Dropped Out Date",
        validators: {
          maxDate: new Date().toISOString().split("T")[0],
          maxDateMessage: "Dropped out date cannot be in the future",
        },
        conditionalRender: {
          dependentField: "status",
          expectedValue: "Dropped Out",
        },
      },
      {
        section: "Status",
        name: "droppedOutClass",
        label: "Dropped Out Class",
        type: "array",
        inputType: "select",
        options: formatOptions(classes),
        validators: {
          minLength: 1,
          minLengthMessage: "Please select at least one class",
        },
        conditionalRender: {
          dependentField: "status",
          expectedValue: "Dropped Out",
        },
      },
      {
        section: "Status",
        name: "droppedOutReason",
        label: "Dropped Out Reason",
        type: "text",
        placeholder: "Dropped Out Reason",
        validators: {
          minLength: 3,
          minLengthMessage:
            "Dropped out reason must be at least 3 characters long",
        },
        conditionalRender: {
          dependentField: "status",
          expectedValue: "Dropped Out",
        },
      },
      {
        section: "Status",
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
        },
        conditionalRender: {
          dependentField: "status",
          expectedValue: "Graduated",
        },
      },
      {
        section: "Status",
        name: "islamicQualification",
        label: "Islamic Qualification",
        type: "text",
        placeholder: "Islamic Qualification",
        conditionalRender: {
          dependentField: "status",
          expectedValue: "Graduated",
        },
      },
      {
        section: "Status",
        name: "academicQualification",
        label: "Academic Qualification",
        type: "text",
        placeholder: "Academic Qualification",
        conditionalRender: {
          dependentField: "status",
          expectedValue: "Graduated",
        },
      },
      // Course Section

      {
        section: "Islamic Course Information",
        name: "islamicCourseName",
        label: "Course Name",
        type: "text",
        placeholder: "Course Name",
        conditionalRender: {
          dependentField: "status",
          expectedValue: "Active",
        },
      },
      {
        section: "Islamic Course Information",
        name: "islamicUniversity",
        label: "University/Board Name",
        type: "text",
        placeholder: "University/Board Name",
        conditionalRender: {
          dependentField: "status",
          expectedValue: "Active",
        },
      },
      {
        section: "Islamic Course Information",
        name: "islamicCourseRegisterNumber",
        label: "Register Number",
        type: "text",
        placeholder: "Register Number",
        conditionalRender: {
          dependentField: "status",
          expectedValue: "Active",
        },
      },
      {
        section: "Islamic Course Information",
        name: "islamicCourseYear",
        label: "Year",
        type: "text",
        placeholder: "Year",
        conditionalRender: {
          dependentField: "status",
          expectedValue: "Active",
        },
        inputType: "select",
        options: SEMESTERS,
      },
      {
        section: "Islamic Course Information",
        name: "islamicCourseSemester",
        label: "Semester",
        type: "text",
        placeholder: "Semester",
        conditionalRender: {
          dependentField: "status",
          expectedValue: "Active",
        },
        inputType: "select",
        options: SEMESTERS,
      },
      {
        section: "General Course Information",
        name: "academicCourseName",
        label: "Course Name",
        type: "text",
        placeholder: "Course Name",
        conditionalRender: {
          dependentField: "status",
          expectedValue: "Active",
        },
      },
      {
        section: "General Course Information",
        name: "generalUniversity",
        label: "University/Board Name",
        type: "text",
        placeholder: "University/Board Name",
        conditionalRender: {
          dependentField: "status",
          expectedValue: "Active",
        },
      },
      {
        section: "General Course Information",
        name: "generalCourseRegisterNumber",
        label: "Register Number",
        type: "text",
        placeholder: "Register Number",
        conditionalRender: {
          dependentField: "status",
          expectedValue: "Active",
        },
      },
      {
        section: "General Course Information",
        name: "generalCourseYear",
        label: "Year",
        type: "text",
        placeholder: "Year",
        conditionalRender: {
          dependentField: "status",
          expectedValue: "Active",
        },
        inputType: "select",
        options: SEMESTERS,
      },
      {
        section: "General Course Information",
        name: "generalCourseSemester",
        label: "Semester",
        type: "text",
        placeholder: "Semester",
        conditionalRender: {
          dependentField: "status",
          expectedValue: "Active",
        },
        inputType: "select",
        options: SEMESTERS,
      },
    ];

    const filterConfig = [
      { id: "name", label: "Name" },
      { id: "_id", label: "ID" },
      {
        id: "classId",
        label: "Class",
        inputType: "select",
        options: formatOptions(classes),
      },
      {
        id: "batchId",
        label: "Batch",
        inputType: "select",
        options: formatOptions(batches),
      },
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

    const filteredColumnsConfig = columnsConfig.filter((column) => {
      if (activeRole !== "College Admin") {
        return column.header !== "Select";
      }
      return true;
    });

    return (
      <>
        <Header
          title={
            activeRole !== "College Admin"
              ? "STUDENTS DETAILS"
              : "STUDENTS MANAGEMENT"
          }
          subTitle="Organize and Oversee Students"
        />
        <DataTableComponent
          resource="users"
          initialData={[]}
          columnsConfig={filteredColumnsConfig}
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
          filterTitle="Students"
          printTitle={"Students"}
          filterType="api"
          readOnly={activeRole !== "College Admin"}
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

export const revalidate = 30;
