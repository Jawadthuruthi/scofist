import ErrorPage from "@/components/ErrorPage";
import Dashboard from "@/components/Dashboard";
import StudentDashboard from "@/components/StudentDashboard";
import { fetchData, WEEKDAYS, getISTDateString } from "@/lib/utils";
import { cookies, headers } from "next/headers";
import FestDashboard from "@/components/FestDashboard";
import SparkDashboardClient from "./spark/SparkDashboardClient";
import { getSparkStats } from "@/libservices/spark-services";
import connectToDB from "@/lib/db";
import User from "@/models/User";

const getApiEndpoints = (dateStr) => [
  {
    pathname: "classes",
    searchParams: "status=Active&projection=_id,name,shortname,batchId,teacherId,section,status,coreSubjects,majorSubjects",
  },
  {
    pathname: "batches",
  },
  {
    pathname: "users",
    searchParams:
      "projection=_id,name,email,profilePic,contactNumber,dateOfBirth,address,teacherSpecificField.status&roles=Teacher&status=Active,Principal,Guest",
    revalidate: 0,
  },

  {
    pathname: "periods",
    searchParams: `date=${dateStr}`,
    revalidate: 0,
  },
  {
    pathname: "attendances",
    searchParams: `date=${dateStr}`,
  },
  {
    pathname: "settings",
    revalidate: 0,
  },
  {
    pathname: "leave-records",
    searchParams: "isArrived=false",
    key: "leave-records",
  },
  {
    pathname: "teachers-leave-record",
    searchParams: `date=${dateStr}`,
    key: "teachersLeaveRecord",
  },
  {
    pathname: "updates",
    searchParams: "limit=10",
    key: "updates",
  },
];

export default async function DashboardPage({ searchParams }) {
  try {
    const query = await searchParams;
    const dateParam = query?.date;
    const todayIST = getISTDateString();
    const dateStr = dateParam || todayIST;

    const cookieStore = await cookies();
    const headersList = await headers();
    const userHeader = headersList.get("x-user");
    const user = userHeader && userHeader !== "undefined" ? JSON.parse(userHeader) : null;
    const activeRole = cookieStore.get("active-role")?.value || headersList.get("active-role") || user?.roles?.[0];
    const apiKey = process.env.API_KEY;

    if (["Program Committee", "Program Leader"].includes(activeRole)) {
      return <FestDashboard activeRole={activeRole} apiKey={apiKey} user={user} />;
    }

    if (activeRole === "Spark Admin") {
      try {
        const stats = await getSparkStats();
        return <SparkDashboardClient {...stats} />;
      } catch (error) {
        console.error("Error loading spark stats:", error);
        // Fallback or better error handling if needed, 
        // but error boundary should catch it.
      }
    }

    if (activeRole === "Student") {
      const userId = user?._id || user?.id;

      await connectToDB();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const [classes, batches, updatesData, debtsRaw, fullStudent] = await Promise.all([
        fetchData("classes", "status=Active&projection=_id,name,shortname,batchId,status"),
        fetchData("batches"),
        fetchData("updates", "limit=10", 60, "updates"),
        fetch(`${baseUrl}/api/debtors?studentId=${userId}`)
          .then(r => r.json())
          .catch(() => ({ debts: [] })),
        userId ? User.findById(userId).lean() : null,
      ]);

      const debtBalances = (debtsRaw.debts || [])
        .filter(d => (d.totalAmount - (d.payments || []).reduce((s, p) => s + p.amount, 0)) > 0)
        .map(d => ({
          category: d.category,
          year: d.year,
          balance: d.totalAmount - (d.payments || []).reduce((s, p) => s + p.amount, 0),
        }));

      const updates = Array.isArray(updatesData) ? updatesData : updatesData?.updates || [];
      const hydratedStudent = fullStudent ? { ...user, ...fullStudent, _id: fullStudent._id?.toString() } : user;
      return <StudentDashboard user={hydratedStudent} apiKey={apiKey} classes={classes} batches={batches} updates={updates} debtBalances={debtBalances} showKinship={true} />;
    }

    const [
      classes,
      batches,
      teachers,
      periods,
      attendances,
      settings,
      leaveRecords,
      teachersLeaveRecord,
      updatesData,
    ] = await Promise.all(
      getApiEndpoints(dateStr).map((endpoint) =>
        fetchData(
          endpoint.pathname,
          endpoint.searchParams,
          endpoint.revalidate,
          endpoint.key
        )
      )
    );

    const filteredLeaveRecords = leaveRecords.filter(
      (record) => record.studentStatus === "Active"
    );

    return (
      <Dashboard
        apiKey={apiKey}
        classes={classes}
        batches={batches}
        teachers={teachers}
        periods={periods}
        attendances={attendances}
        settings={settings}
        activeRole={activeRole}
        leaveRecords={filteredLeaveRecords}
        teachersLeaveRecord={teachersLeaveRecord}
      />
    );
  } catch (error) {
    console.error("Error loading batches:", error.message);
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
