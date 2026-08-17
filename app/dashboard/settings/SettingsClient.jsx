"use client";
import dynamic from "next/dynamic";
import CommitteePostersSettings from "@/components/CommitteePostersSettings";
import SectionWorkingDayToggle from "@/components/SectionWorkingDayToggle";

const FormComponent = dynamic(() => import("@/components/FormComponent"), {
  ssr: false,
});

const appIconFormField = [
  {
    name: "appIcon",
    label: "App Icon (PWA)",
    inputType: "image",
    type: "object",
    className: "col-span-2",
    maxFileSize: 2 * 1024 * 1024,
    allowedTypes: ["image/jpeg", "image/png", "image/svg+xml"],
    defaultValue: {},
  },
];



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
    name: "institutionPhoto",
    label: "Institution Photo",
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
    name: "fullName",
    label: "Full Name",
    placeholder: "Enter full name",
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
  {
    name: "whatsappChannel",
    label: "WhatsApp Channel URL",
    placeholder: "Enter WhatsApp Channel URL",
  },
  {
    name: "youtube",
    label: "YouTube URL",
    placeholder: "Enter YouTube URL",
  },
  {
    name: "instagram",
    label: "Instagram URL",
    placeholder: "Enter Instagram URL",
  },
];

const yearAndLogoFormField = [
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
    className: "col-span-2",
  },
  {
    name: "festivalLogo",
    label: "Festival Square Logo",
    inputType: "image",
    type: "object",
    className: "col-span-2",
    maxFileSize: 2 * 1024 * 1024,
    allowedTypes: ["image/png", "image/jpeg", "image/svg+xml", "image/svg"],
    defaultValue: {},
    hasSubmitButton: true,
  },
];

const nameAndImageFormField = [
  {
    name: "festival_name",
    label: "Festival Name Text",
    placeholder: "e.g., esperanza",
    required: true,
    className: "col-span-2",
  },
  {
    name: "festivalNameImage",
    label: "Festival Name Image",
    inputType: "image",
    type: "object",
    className: "col-span-2",
    maxFileSize: 2 * 1024 * 1024,
    allowedTypes: ["image/png", "image/jpeg", "image/svg+xml", "image/svg"],
    defaultValue: {},
    hasSubmitButton: true,
  },
];

const themeFormField = [
  {
    name: "festival_theme",
    label: "Festival Theme Text",
    placeholder: "e.g., Recall the legacy, Reignite the light",
    className: "col-span-2",
  },
  {
    name: "festivalThemeImage",
    label: "Festival Theme Image",
    inputType: "image",
    type: "object",
    className: "col-span-2",
    maxFileSize: 2 * 1024 * 1024,
    allowedTypes: ["image/png", "image/jpeg", "image/svg+xml", "image/svg"],
    defaultValue: {},
    hasSubmitButton: true,
  },
];

const venueFormField = [
  {
    name: "festival_venue",
    label: "Festival Date & Venue Text",
    placeholder: "e.g., 2026 Nov 12 - 14 | Sa-adiya Da-awa College",
    className: "col-span-2",
  },
  {
    name: "festivalVenueImage",
    label: "Festival Venue Image",
    inputType: "image",
    type: "object",
    className: "col-span-2",
    maxFileSize: 2 * 1024 * 1024,
    allowedTypes: ["image/png", "image/jpeg", "image/svg+xml", "image/svg"],
    defaultValue: {},
    hasSubmitButton: true,
  },
];

const fullNameFormField = [
  {
    name: "festivalFullNameImage",
    label: "Festival Full Name Image",
    inputType: "image",
    type: "object",
    className: "col-span-2",
    maxFileSize: 2 * 1024 * 1024,
    allowedTypes: ["image/png", "image/jpeg", "image/svg+xml", "image/svg"],
    defaultValue: {},
    hasSubmitButton: true,
  },
];

const printHeaderOnlyFormField = [
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
    hasSubmitButton: true,
  },
];



const committeeContactsFormField = [
  {
    name: "chairmanName",
    label: "Chairman Name",
    placeholder: "Enter Chairman's Name",
    className: "col-span-1",
  },
  {
    name: "chairmanPhone",
    label: "Chairman Contact Number",
    placeholder: "Enter Chairman's Phone",
    className: "col-span-1",
  },
  {
    name: "chairmanWhatsapp",
    label: "Chairman WhatsApp Number",
    placeholder: "Enter Chairman's WhatsApp (with country code)",
    className: "col-span-1",
  },
  {
    name: "convenorName",
    label: "Convenor Name",
    placeholder: "Enter Convenor's Name",
    className: "col-span-1",
  },
  {
    name: "convenorPhone",
    label: "Convenor Contact Number",
    placeholder: "Enter Convenor's Phone",
    className: "col-span-1",
  },
  {
    name: "convenorWhatsapp",
    label: "Convenor WhatsApp Number",
    placeholder: "Enter Convenor's WhatsApp (with country code)",
    className: "col-span-1",
  },
];

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

export default function SettingsClient({
  activeRole,
  apiKey,
  general,
  institution,
  festival,
  idCard,
  spark,
  org,
}) {
  return (
    <div className="space-y-8">
      {activeRole === "College Admin" && (
        <>
          <SectionWorkingDayToggle
            apiKey={apiKey}
            general={general}
          />
          <FormComponent
            formFields={institutionFormField}
            apiKey={apiKey}
            data={institution}
            resource="settings"
            title="Institution Profile"
            description="Configure Your Institution Details"
          />
          <div className="mt-8">
            <FormComponent
              formFields={appIconFormField}
              apiKey={apiKey}
              data={general}
              resource="settings"
              title="App Icon"
              description="Configure the PWA App Icon"
            />
          </div>
        </>
      )}
      {activeRole === "Program Committee" && (
        <>
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormComponent
                formFields={yearAndLogoFormField}
                apiKey={apiKey}
                data={festival}
                resource="settings"
                title="Year and Logo"
                hideDefaultSubmit={true}
              />
              <FormComponent
                formFields={nameAndImageFormField}
                apiKey={apiKey}
                data={festival}
                resource="settings"
                title="Festival Name"
                hideDefaultSubmit={true}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormComponent
                formFields={themeFormField}
                apiKey={apiKey}
                data={festival}
                resource="settings"
                title="Theme"
                hideDefaultSubmit={true}
              />
              <FormComponent
                formFields={venueFormField}
                apiKey={apiKey}
                data={festival}
                resource="settings"
                title="Venue"
                hideDefaultSubmit={true}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormComponent
                formFields={fullNameFormField}
                apiKey={apiKey}
                data={festival}
                resource="settings"
                title="Full Name"
                hideDefaultSubmit={true}
              />
              <FormComponent
                formFields={printHeaderOnlyFormField}
                apiKey={apiKey}
                data={festival}
                resource="settings"
                title="Print Header"
                hideDefaultSubmit={true}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormComponent
                formFields={committeeContactsFormField}
                apiKey={apiKey}
                data={festival}
                resource="settings"
                title="Committee Contacts"
                description="Contact details for Chairman and Convenor"
              />
            </div>

          </div>
        </>
      )}
      {activeRole === "Spark Admin" && (
        <>
          <FormComponent
            data={spark}
            formFields={sparkFormField}
            title="Institution Profile"
            description="Manage your institution details"
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
  );
}
