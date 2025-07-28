import ErrorPage from "@/components/ErrorPage";
import Dashboard from "@/components/Dashboard";
import { cookies } from "next/headers";

export default async function DashboardPage() {
  try {
    const cookieStore = await cookies();
    const activeRole = cookieStore.get("active-role")?.value;
    const apiKey = process.env.API_KEY;

    return <Dashboard apiKey={apiKey} activeRole={activeRole} />;
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

export const revalidate = 60;
