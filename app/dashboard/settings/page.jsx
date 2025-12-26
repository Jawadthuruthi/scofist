import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import FormComponent from "@/components/FormComponent";
import { fetchData } from "@/lib/utils";
import { cookies } from "next/headers";
import { validators } from "tailwind-merge";

const generalFormField = [
  {
    name: "isWorkingDay",
    label: "Enable/Disable Working Day",
    required: true,
    type: "boolean",
    inputType: "toggle",
    defaultValue: true,
    hideLabel: true,
    className: "col-span-2",
  },
  {
    name: "occasion",
    label: "Occasion",
    required: true,
    conditionalRender: {
      dependentField: "isWorkingDay",
      expectedValue: false,
    },
  },
];

const institutionFormField = [
  {
    name: "logo",
    label: "Organisation Logo",
    inputType: "image",
    type: "object",
    className: "col-span-2",
    maxFileSize: 2 * 1024 * 1024,
    allowedTypes: ["image/jpeg", "image/png", "image/svg+xml"],
    defaultValue: {},
  },
  {
    name: "name",
    label: "Organisation Name",
    placeholder: "Enter organisation name",
    required: true,
  },
  {
    name: "fullName",
    label: "Full Name",
    placeholder: "Enter full name",
  },
  {
    name: "tagline",
    label: "Tagline",
    placeholder: "Enter organisation tagline",
    className: "col-span-2 md:col-span-1",
  },
  {
    name: "address",
    label: "Address",
    placeholder: "Enter address",
  },

  {
    name: "primaryPhone",
    label: "Primary Phone",
    placeholder: "Enter primary phone",
  },
  {
    name: "secondaryPhone",
    label: "Secondary Phone",
    placeholder: "Enter secondary phone",
  },
  {
    name: "email",
    label: "Email",
    placeholder: "Enter email address",
    type: "email",
  },
  {
    name: "website",
    label: "Website",
    placeholder: "Enter website URL",
  },
];

const idCardFormField = [
  {
    name: "backgroundImage",
    label: "ID Card Background",
    inputType: "image",
    type: "object",
    className: "col-span-2",
    maxFileSize: 2 * 1024 * 1024,
    allowedTypes: ["image/jpeg", "image/jpg", "image/png"],
    aspectRatio: "2:3",
    defaultValue: {},
  },
];

const festivalFormField = [
  {
    name: "printHeader",
    label: "Print Header",
    inputType: "image",
    type: "object",
    className: "col-span-2",
    maxFileSize: 2 * 1024 * 1024,
    allowedTypes: ["image/png"],
    defaultValue: {},
    minWidth: 2480,
    minHeight: 310,
  },
  {
    name: "participantsCard",
    label: "Participants Card",
    inputType: "image",
    type: "object",
    className: "col-span-2",
    maxFileSize: 2 * 1024 * 1024,
    allowedTypes: ["image/svg+xml", "image/png", "image/jpeg", "image/jpg"],
    defaultValue: {},
    aspectRatio: "1:1.4",
    minWidth: 600,
    minHeight: 840,
  },
  {
    name: "textColor",
    label: "Text Color",
    type: "color",
    className: "col-span-1",
  },

  {
    name: "right",
    label: "Right Position",
    type: "number",
    validators: {
      min: 0,
      max: 100,
    },
    className: "col-span-1",
  },
  {
    name: "bottom",
    label: "Bottom Position",
    type: "number",
    validators: {
      min: 0,
      max: 100,
    },
    className: "col-span-1",
  },
  {
    name: "left",
    label: "Left Position",
    type: "number",
    validators: {
      min: 0,
      max: 100,
    },
    className: "col-span-1",
  },

  {
    name: "registrationDeadline",
    label: "Registration Deadline",
    type: "date",
    required: true,
  },
];

export default async function SettingsPage() {
  try {
    const cookiesStore = await cookies();
    const activeRole = cookiesStore.get("active-role")?.value;
    const apiKey = process.env.API_KEY;

    const data = await fetchData("settings", "", 0);

    const general = {
      ...data.general,
    };

    const institution = {
      ...data.institution,
      ...data.institution.contact,
    };

    const festival = {
      ...data.festival,
      participantsCard: data.festival.participantsCard.backgroundImage || {},
      textColor: data.festival.participantsCard.textColor || "#000000",
      right: data.festival.participantsCard.textPositions.right || 0,
      bottom: data.festival.participantsCard.textPositions.bottom || 0,
      left: data.festival.participantsCard.textPositions.left || 0,
    };

    const idCard = {
      ...data.idCard,
    };

    const spark = {
      spark_name: data.spark?.name,
      spark_fullName: data.spark?.fullName,
      spark_tagline: data.spark?.tagline,
      spark_address: data.spark?.address,
      spark_primaryPhone: data.spark?.contact?.primaryPhone,
      spark_secondaryPhone: data.spark?.contact?.secondaryPhone,
      spark_email: data.spark?.contact?.email,
      spark_website: data.spark?.contact?.website,
      spark_logo: data.spark?.logo || {},
    };

    const sparkFormField = [
      {
        name: "spark_logo",
        label: "Organisation Logo",
        inputType: "image",
        type: "object",
        className: "col-span-2",
        maxFileSize: 2 * 1024 * 1024,
        allowedTypes: ["image/jpeg", "image/png", "image/svg+xml"],
        defaultValue: {},
      },
      {
        name: "spark_name",
        label: "Organisation Name",
        placeholder: "Enter organisation name",
        required: true,
      },
      {
        name: "spark_fullName",
        label: "Full Name",
        placeholder: "Enter full name",
      },
      {
        name: "spark_tagline",
        label: "Tagline",
        placeholder: "Enter organisation tagline",
        className: "col-span-2 md:col-span-1",
      },
      {
        name: "spark_address",
        label: "Address",
        placeholder: "Enter address",
      },
      {
        name: "spark_primaryPhone",
        label: "Primary Phone",
        placeholder: "Enter primary phone",
      },
      {
        name: "spark_secondaryPhone",
        label: "Secondary Phone",
        placeholder: "Enter secondary phone",
      },
      {
        name: "spark_email",
        label: "Email",
        placeholder: "Enter email address",
        type: "email",
      },
      {
        name: "spark_website",
        label: "Website",
        placeholder: "Enter website URL",
      },
    ];

    return (
      <>
        <Header title="SETTINGS" subTitle="Customize System Behavior" />
        <div className="space-y-8">
          {activeRole === "College Admin" && (
            <>
              <FormComponent
                formFields={generalFormField}
                apiKey={apiKey}
                data={general}
                resource="settings"
                title="General"
                description="Customize Your System Settings"
              />
              <FormComponent
                formFields={institutionFormField}
                apiKey={apiKey}
                data={institution}
                resource="settings"
                title="Institution Profile"
                description="Configure Your Institution Details"
              />
              <FormComponent
                formFields={idCardFormField}
                apiKey={apiKey}
                data={idCard}
                resource="settings"
                title="ID Card"
                description="Set Your ID Card Background"
              />
            </>
          )}
          {activeRole === "Program Committee" && (
            <FormComponent
              formFields={festivalFormField}
              apiKey={apiKey}
              data={festival}
              resource="settings"
              title="Festival Settings"
              description="Configure Festival Details"
            />
          )}
          {activeRole === "Spark Admin" && (
            <FormComponent
              formFields={sparkFormField}
              apiKey={apiKey}
              data={spark}
              resource="settings"
              title="Institution Profile"
              description="Configure Your Institution Details"
            />
          )}
        </div>
      </>
    );
  } catch (error) {
    console.error("Error loading settings:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
}

export const revalidate = 0;
