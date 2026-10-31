import ErrorPage from "@/components/ErrorPage";
import Dashboard from "@/components/Dashboard";
import StudentDashboard from "@/components/StudentDashboard";
import { fetchData, WEEKDAYS, getISTDateString } from "@/lib/utils";
import { cookies, headers } from "next/headers";
import FestDashboard from "@/components/FestDashboard";
import SparkDashboardClient from "./spark/SparkDashboardClient";
import { getSparkStats } from "@/libservices/spark-services";

const getApiEndpoints = (dateStr) => [
  {
    pathname: "classes",
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
    const activeRole = cookieStore.get("active-role")?.value;
    const apiKey = process.env.API_KEY;

    if (["Program Committee", "Program Leader"].includes(activeRole)) {
      const headersList = headers();
      const user = headersList.get("x-user") ? JSON.parse(headersList.get("x-user")) : null;
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

    if (activeRole === "Student") {
      const headersList = headers();
      const user = JSON.parse(headersList.get("x-user"));
      const userId = user._id || user.id;
      
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const debtsRaw = await fetch(`${baseUrl}/api/debtors?studentId=${userId}`)
        .then(r => r.json())
        .catch(() => ({ debts: [] }));

      const debtBalances = (debtsRaw.debts || [])
        .filter(d => (d.totalAmount - (d.payments || []).reduce((s, p) => s + p.amount, 0)) > 0)
        .map(d => ({
          category: d.category,
          year: d.year,
          balance: d.totalAmount - (d.payments || []).reduce((s, p) => s + p.amount, 0),
        }));

      const updates = Array.isArray(updatesData) ? updatesData : updatesData?.updates || [];
      return <StudentDashboard user={user} apiKey={apiKey} classes={classes} batches={batches} updates={updates} debtBalances={debtBalances} />;
    }

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
