import { cookies } from "next/headers";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import FormComponent from "@/components/FormComponent";
import { fetchData } from "@/lib/utils";

const formFields = [
  {
    name: "logo",
    label: "Institution Logo",
    inputType: "image",
    type: "object",
    section: "Institution Identity",
    className: "col-span-2",
    maxFileSize: 2 * 1024 * 1024,
    allowedTypes: ["image/jpeg", "image/png", "image/svg+xml"],
    aspectRatio: 1,
    defaultValue: {},
  },
  {
    name: "name",
    label: "Institution Name",
    placeholder: "Enter institution name",
    section: "Institution Identity",
    required: true,
  },
  {
    name: "shortName",
    label: "Short Name",
    placeholder: "Enter institution short name",
    section: "Institution Identity",
  },
  {
    name: "tagline",
    label: "Tagline",
    placeholder: "Enter institution tagline",
    section: "Institution Identity",
    className: "col-span-2 md:col-span-1",
  },

  {
    name: "establishedYear",
    label: "Established Year",
    placeholder: "Enter established year",
    type: "number",
    section: "Institution Identity",
  },
  {
    name: "line1",
    label: "Address Line 1",
    placeholder: "Enter address line 1",
    section: "Contact Information",
  },
  {
    name: "line2",
    label: "Address Line 2",
    placeholder: "Enter address line 2",
    section: "Contact Information",
  },
  {
    name: "city",
    label: "City",
    placeholder: "Enter city",
    section: "Contact Information",
  },
  {
    name: "state",
    label: "State",
    placeholder: "Enter state",
    section: "Contact Information",
  },
  {
    name: "pinCode",
    label: "Pin Code",
    placeholder: "Enter pin code",
    section: "Contact Information",
  },
  {
    name: "country",
    label: "Country",
    placeholder: "Enter country",
    section: "Contact Information",
    defaultValue: "India",
  },
  {
    name: "primaryPhone",
    label: "Primary Phone",
    placeholder: "Enter primary phone",
    section: "Contact Information",
  },
  {
    name: "secondaryPhone",
    label: "Secondary Phone",
    placeholder: "Enter secondary phone",
    section: "Contact Information",
  },
  {
    name: "email",
    label: "Email",
    placeholder: "Enter email address",
    type: "email",
    section: "Contact Information",
  },
  {
    name: "website",
    label: "Website",
    placeholder: "Enter website URL",
    section: "Contact Information",
  },
];

export default async function SettingsPage() {
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

    const data = await fetchData("settings", token);
    const settings = {
      ...data.institution,
      ...data.institution.address,
      ...data.institution.contact,
    };

    return (
      <>
        <Header
          title="GENERAL SETTINGS"
          subTitle="Customize General System Behavior"
        />
        <FormComponent
          formFields={formFields}
          token={token}
          data={settings}
          resource="settings"
          title="Institution Settings"
          description="Configure Your Institution Details"
        />
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

export const revalidate = 30;
