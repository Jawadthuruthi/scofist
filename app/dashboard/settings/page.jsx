import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import FormComponent from "@/components/FormComponent";
import { fetchData } from "@/lib/utils";
import { cookies } from "next/headers";
import { validators } from "tailwind-merge";
import CommitteePostersSettings from "@/components/CommitteePostersSettings";

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
    name: "festival_name",
    label: "Festival Name",
    placeholder: "e.g., esperanza",
    required: true,
    className: "col-span-2 md:col-span-1",
  },
  {
    name: "festival_theme",
    label: "Festival Theme/Tagline",
    placeholder: "e.g., Recall the legacy, Reignite the light",
    className: "col-span-2 md:col-span-1",
  },
  {
    name: "festival_year",
    label: "Festival Year",
    type: "number",
    placeholder: new Date().getFullYear().toString(),
    required: true,
    validators: {
      min: 2020,
      max: 2100,
    },
    className: "col-span-2 md:col-span-1",
  },
  {
    name: "festival_venue",
    label: "Venue",
    placeholder: "e.g., Sa-adiya Da-awa College",
    className: "col-span-2 md:col-span-1",
  },
  {
    name: "festival_startDate",
    label: "Start Date",
    type: "date",
    className: "col-span-2 md:col-span-1",
  },
  {
    name: "festival_endDate",
    label: "End Date",
    type: "date",
    className: "col-span-2 md:col-span-1",
  },

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
    console.log("Settings Page Data - Spark Posters:", data.spark?.committeePosters?.length);
    console.log("Settings Page Data - Org Posters:", data.org?.committeePosters?.length);

    const general = {
      ...data.general,
    };

    const institution = {
      ...data.institution,
      ...data.institution.contact,
    };

    const festival = {
      festival_name: data.festival?.festivalInfo?.name || "",
      festival_theme: data.festival?.festivalInfo?.theme || "",
      festival_year:
        data.festival?.festivalInfo?.year || new Date().getFullYear(),
      festival_venue: data.festival?.festivalInfo?.venue || "",
      festival_startDate: data.festival?.festivalInfo?.dates?.startDate
        ? new Date(data.festival.festivalInfo.dates.startDate)
          .toISOString()
          .split("T")[0]
        : "",
      festival_endDate: data.festival?.festivalInfo?.dates?.endDate
        ? new Date(data.festival.festivalInfo.dates.endDate)
          .toISOString()
          .split("T")[0]
        : "",
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
      committeePosters: data.spark?.committeePosters || [],
    };

    const org = {
      org_name: data.org?.name,
      org_fullName: data.org?.fullName,
      org_tagline: data.org?.tagline,
      org_address: data.org?.address,
      org_primaryPhone: data.org?.contact?.primaryPhone,
      org_secondaryPhone: data.org?.contact?.secondaryPhone,
      org_email: data.org?.contact?.email,
      org_website: data.org?.contact?.website,
      org_logo: data.org?.logo || {},
      committeePosters: data.org?.committeePosters || [],
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

    const orgFormField = [
      {
        name: "org_logo",
        label: "Organisation Logo",
        inputType: "image",
        type: "object",
        className: "col-span-2",
        maxFileSize: 2 * 1024 * 1024,
        allowedTypes: ["image/jpeg", "image/png", "image/svg+xml"],
        defaultValue: {},
      },
      {
        name: "org_name",
        label: "Organisation Name",
        placeholder: "Enter organisation name",
        required: true,
      },
      {
        name: "org_fullName",
        label: "Full Name",
        placeholder: "Enter full name",
      },
      {
        name: "org_tagline",
        label: "Tagline",
        placeholder: "Enter organisation tagline",
        className: "col-span-2 md:col-span-1",
      },
      {
        name: "org_address",
        label: "Address",
        placeholder: "Enter address",
      },
      {
        name: "org_primaryPhone",
        label: "Primary Phone",
        placeholder: "Enter primary phone",
      },
      {
        name: "org_secondaryPhone",
        label: "Secondary Phone",
        placeholder: "Enter secondary phone",
      },
      {
        name: "org_email",
        label: "Email",
        placeholder: "Enter email address",
        type: "email",
      },
      {
        name: "org_website",
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
            <>
              <FormComponent
                data={spark}
                formFields={sparkFormField}
                title="Organisation Profile"
                description="Manage your organisation details"
                loading={false}
                apiKey={apiKey}
                resource="settings"
              />
              <div className="mt-8">
                <CommitteePostersSettings
                  initialPosters={spark.committeePosters}
                  apiKey={apiKey}
                  type="spark"
                />
              </div>
            </>
          )}
          {activeRole === "Org Admin" && (
            <>
              <FormComponent
                formFields={orgFormField}
                apiKey={apiKey}
                data={org}
                resource="settings"
                title="Institution Profile"
                description="Configure Your Institution Details"
              />
              <div className="mt-8">
                <CommitteePostersSettings
                  initialPosters={org.committeePosters}
                  apiKey={apiKey}
                />
              </div>
            </>
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
