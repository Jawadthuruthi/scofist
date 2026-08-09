import ErrorPage from "@/components/ErrorPage";
import FormComponent from "@/components/FormComponent";
import Header from "@/components/Header";
import { fetchData } from "@/lib/utils";

export default async function IndividualRemarkPage({ params }) {
  const { studentId } = await params;
  try {
    const apiKey = process.env.API_KEY;

    const API_ENDPOINTS = [
      {
        pathname: "remarks",
        searchParams: `studentId=${studentId}`,
        revalidate: 0,
        key: "remarks",
      },
      {
        pathname: "users",
        searchParams: `_id=${studentId}&role=Student&projection=_id,name,studentSpecificField.classId`,
      },
    ];

    const [remarks, student] = await Promise.all(
      API_ENDPOINTS.map((endpoint) =>
        fetchData(
          endpoint.pathname,
          endpoint.searchParams,
          endpoint.revalidate,
          endpoint.key
        )
      )
    );

    const formFields = [
      {
        name: "studentId",
        label: "Student",
        type: "text",
        placeholder: "Student",
        required: true,
        defaultValue: student?.[0]?._id || "",
        inputType: "select",
        options:
          student?.map((s) => ({
            value: s._id,
            label: s.name,
          })) || [],
        readOnly: true,
      },

      {
        name: "classId",
        label: "Class",
        type: "text",
        placeholder: "Class",
        required: true,
        defaultValue: student?.[0]?.classId || "",
        inputType: "select",
        options: (() => {
          const optMap = new Map();
          if (student?.[0]?.classId) {
            optMap.set(student[0].classId, student[0].className || "Unknown Class");
          }
          if (Array.isArray(remarks)) {
            remarks.forEach((r) => {
              if (r.classId) optMap.set(r.classId, r.className || "Unknown Class");
            });
          }
          return Array.from(optMap, ([value, label]) => ({ value, label }));
        })(),
        readOnly: true,
      },

      {
        name: "date",
        label: "Date",
        type: "date",
        placeholder: "Date",
        required: true,
      },
      {
        name: "comments",
        label: "Comments",
        type: "text",
        placeholder: "Comments",
        required: true,
      },
      {
        name: "status",
        label: "Status",
        type: "text",
        inputType: "select",
        required: true,
        options: [
          { value: "good", label: "Good" },
          { value: "bad", label: "Bad" },
          { value: "pending", label: "Pending" },
        ],
        placeholder: "Select a status",
      },
    ];

    return (
      <>
        <Header
          title="INDIVIDUAL REMARKS"
          subTitle="Manage Individual Remarks"
        />
        <FormComponent
          formFields={formFields}
          apiKey={apiKey}
          data={remarks || []}
          resource="remarks"
          title=""
          description=""
          returnBack={true}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading remarks:", error.message);
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
