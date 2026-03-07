import ErrorPage from "@/components/ErrorPage";
import StudentsFund from "@/components/StudentsFund";
import { fetchData, parseUser } from "@/lib/utils";
import { cookies, headers } from "next/headers";

const API_ENDPOINTS = [
  {
    pathname: "users",
    searchParams:
      "projection=_id,name,role,profilePic,studentSpecificField.batchId,studentSpecificField.admissionNumber&roles=Student",
  },
  {
    pathname: "batches",
    searchParams: "projection=_id,name,startYear,endYear",
  },
  {
    pathname: "classes",
    searchParams: "projection=_id,name,batchId",
  },
];
const StudentsFundPage = async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const user = parseUser(headerStore);

  const activeRole = cookieStore.get("active-role")?.value;
  const apiKey = process.env.API_KEY;

  try {
    const [students, batches, classes] = await Promise.all(
      API_ENDPOINTS.map((endpoint) =>
        fetchData(endpoint.pathname, endpoint.searchParams)
      )
    );

    const formattedBatches = batches
      ?.sort((a, b) => b.startYear - a.startYear)
      ?.map((batch) => {
        const cls = classes?.find((cls) => cls.batchId === batch._id);
        return {
          ...batch,
          name: cls ? `${batch.name} (${cls.name})` : batch.name,
        };
      });

    let department = null;
    if (activeRole === "Stationary") department = "Stationary";
    if (activeRole === "IT Lab") department = "IT Lab";

    return (
      <StudentsFund
        batches={formattedBatches}
        students={students}
        role={activeRole}
        teacherId={user?.userId}
        apiKey={apiKey}
        department={department}
      />
    );
  } catch (error) {
    console.error("Error loading batches:", error.message);
    <ErrorPage
      statusCode={500}
      title="Something went wrong"
      description="We encountered an unexpected error. Our team has been notified and is working to resolve the issue."
    />;
  }
};

export default StudentsFundPage;

export const revalidate = 60;
