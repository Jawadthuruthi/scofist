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

  { accessorKey: "name", header: "Name" },
  { accessorKey: "status", header: "Status", type: ["badge"] },
  {
    accessorKey: "/dashboard/applications",
    header: "",
    endpointKey: "_id",
    type: ["externalLink"],
    width: 50,
    minWidth: 50,
    maxWidth: 50,
    searchParams: `apiKey=${process.env.API_KEY}`,
  },
];

const statusMessages = {
  create: "Application submitted successfully!",
  edit: "Application Updated successfully!",
  delete: "Application deleted successfully!",
};

export default async function ApplicationsPage() {
  try {
    const apiKey = process.env.API_KEY;

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
        name: "name",
        label: "Name",
        type: "text",
        placeholder: "Applicant name",
        required: true,
        validators: {
          minLength: 3,
          minLengthMessage: "Name must be at least 3 characters long",
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
        name: "guardianContactNumber",
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
        name: "guardianAlternativeNumber",
        label: "Alternative Number",
        type: "text",
        placeholder: "Alternative Number",
        validators: {
          pattern: "^(\\+?\\d{1,3}[-.\\s]?)?\\d{10}$",
          patternMessage: "Invalid alternative number format",
        },
      },

      // Address Details Section
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

      // Academic Information Section

      {
        name: "admissionClass",
        label: "Admission Class",
        type: "text",
        placeholder: "Admission Class",
        inputType: "select",
        required: true,
        freeSolo: true,
        options: [
          {
            label: "8",
            value: "8",
          },
          {
            label: "+1",
            value: "+1",
          },
        ],
      },
      {
        name: "sslcRegistrationNumber",
        label: "SSLC Registration Number",
        type: "number",
        placeholder: "Registration Number",
        conditionalRender: {
          dependentField: "admissionClass",
          expectedValue: "+1",
        },
      },
      {
        name: "sslcGraduationYear",
        label: "SSLC Graduation Year",
        type: "number",
        placeholder: "Graduation Year",
        conditionalRender: {
          dependentField: "admissionClass",
          expectedValue: "+1",
        },
      },
      {
        name: "academicStream",
        label: "Academic Stream",
        type: "text",
        placeholder: "Academic Stream",
        inputType: "select",
        required: true,
        options: [
          {
            label: "Commerce",
            value: "Commerce",
          },
          {
            label: "Science",
            value: "Science",
          },
          {
            label: "Humanities",
            value: "Humanities",
          },
        ],
        conditionalRender: {
          dependentField: "admissionClass",
          expectedValue: "+1",
        },
      },

      {
        name: "islamicEducationQualification",
        label: "Islamic Qualification",
        type: "text",
        placeholder: "Islamic Qualification",
      },
      {
        name: "academicEducationQualification",
        label: "Academic Qualification",
        type: "text",
        placeholder: "Academic Qualification",
      },
    ];

    const filterConfig = [{ id: "name", label: "Name" }];

    return (
      <>
        <Header
          title="APPLICATIONS MANAGEMENT"
          subTitle="Manage Students Applications"
        />
        <DataTableComponent
          resource="applications"
          initialData={[]}
          columnsConfig={columnsConfig}
          formFields={formFields}
          apiKey={apiKey}
          createFormTitle="Add New Application"
          editFormTitle="Edit Application"
          deleteFormTitle="Delete Application"
          createSuccessMessage={statusMessages.create}
          editSuccessMessage={statusMessages.edit}
          deleteSuccessMessage={statusMessages.delete}
          filterConfig={filterConfig}
          limit={20}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading applications:", error.message);
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
