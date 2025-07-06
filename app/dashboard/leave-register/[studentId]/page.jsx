import ErrorPage from "@/components/ErrorPage";
import FormComponent from "@/components/FormComponent";
import Header from "@/components/Header";
import { fetchData } from "@/lib/utils";

export default async function IndividualLeaveRegisterPage({ params }) {
  const { studentId } = await params;
  try {
    const apiKey = process.env.API_KEY;

    const API_ENDPOINTS = [
      {
        pathname: "leave-records",
        searchParams: `studentId=${studentId}&isArrived=false`,
        revalidate: 0,
        key: "leaveRecords",
      },
      {
        pathname: "users",
        searchParams: `_id=${studentId}&role=Student&projection=_id,name`,
      },
    ];

    const [leaveRecord, student] = await Promise.all(
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
        label: "Student ID",
        type: "text",
        placeholder: "Student ID",
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
        label: "Class ID",
        type: "text",
        placeholder: "Class ID",
        required: true,
        defaultValue: student?.[0]?.classId || "",
        inputType: "select",
        options: student?.[0]?.classId
          ? [
              {
                value: student[0].classId,
                label: student[0].className || "Unknown Class",
              },
            ]
          : [],
        readOnly: true,
      },

      {
        name: "dateOfLeave",
        label: "Date of Leave",
        type: "date",
        placeholder: "Date of Leave",
        required: true,
        validators: {
          maxDate: new Date().toISOString().split("T")[0],
          maxDateMessage: "Date cannot be in the future",
        },
      },
      {
        name: "leaveReason",
        label: "Leave Reason",
        type: "text",
        placeholder: "Reason for Leave",
        required: true,
      },
      {
        name: "dateOfArrival",
        label: "Date of Arrival",
        type: "date",
        placeholder: "Date of Arrival",
        required: true,
        validators: {
          minDate: new Date().toISOString().split("T")[0],
          minDateMessage: "Arrival date cannot be earlier than the leave date",
        },
      },
      {
        name: "arrivedDate",
        label: "Arrived Date",
        type: "date",
        placeholder: "Arrived Date (optional)",
      },
      {
        name: "lateReason",
        label: "Late Reason",
        type: "text",
        placeholder: "Reason for being late (optional)",
      },
      {
        name: "remark",
        label: "Remark",
        type: "text",
        inputType: "select",
        options: [
          { value: "Very Good", label: "Very Good" },
          { value: "Good", label: "Good" },
          { value: "Acceptable", label: "Acceptable" },
          { value: "Bad", label: "Bad" },
          { value: "Very Bad", label: "Very Bad" },
        ],
        placeholder: "Any additional remarks (optional)",
      },
    ];

    return (
      <>
        <Header
          title="INDIVIDUAL LEAVE REGISTER MANAGEMENT"
          subTitle="Organize and Oversee Individual Leave Register"
        />
        <FormComponent
          formFields={formFields}
          apiKey={apiKey}
          data={leaveRecord?.[0] || null}
          resource="leave-records"
          title=""
          description=""
        />
      </>
    );
  } catch (error) {
    console.error("Error loading leave records:", error.message);
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
