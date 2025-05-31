import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import FormComponent from "@/components/FormComponent";
import { fetchData } from "@/lib/utils";

const institutionFormField = [
  {
    name: "logo",
    label: "Institution Logo",
    inputType: "image",
    type: "object",
    className: "col-span-2",
    maxFileSize: 2 * 1024 * 1024,
    allowedTypes: ["image/jpeg", "image/png", "image/svg+xml"],
    defaultValue: {},
  },
  {
    name: "name",
    label: "Institution Name",
    placeholder: "Enter institution name",
    required: true,
  },
  {
    name: "tagline",
    label: "Tagline",
    placeholder: "Enter institution tagline",
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

export default async function SettingsPage() {
  try {
    const apiKey = process.env.API_KEY;

    const data = await fetchData("settings", "", 0);
    const settings = {
      ...data.institution,
      ...data.institution.contact,
      ...data.idCard,
    };

    return (
      <>
        <Header title="SETTINGS" subTitle="Customize System Behavior" />
        <div className="space-y-8">
          <FormComponent
            formFields={institutionFormField}
            apiKey={apiKey}
            data={settings}
            resource="settings"
            title="Institution Profile"
            description="Configure Your Institution Details"
          />
          <FormComponent
            formFields={idCardFormField}
            apiKey={apiKey}
            data={settings}
            resource="settings"
            title="ID Card"
            description="Set Your ID Card Background"
          />
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
