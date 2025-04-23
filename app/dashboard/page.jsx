import { cookies } from "next/headers";
import ErrorPage from "@/components/ErrorPage";
import Dashboard from "@/components/Dashboard";

export default async function DashboardPage() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;
    const activeRole = cookieStore.get("active-role")?.value;

    if (!token) {
      return (
        <ErrorPage
          statusCode={403}
          title="Access Denied"
          description="You don't have permission to access this resource."
        />
      );
    }

    return <Dashboard token={token} role={activeRole} />;
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

export const revalidate = 30;
