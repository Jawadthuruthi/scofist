import JudgePortal from "@/components/JudgePortal";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { parseUser } from "@/lib/utils";
import { cookies, headers } from "next/headers";

export default async function JudgePortalPage() {
  try {
    const headerStore = await headers();
    const cookiesStore = await cookies();
    const user = parseUser(headerStore);
    const activeRole = cookiesStore.get("active-role")?.value;
    const activeYear = cookiesStore.get("active-year")?.value;
    const apiKey = process.env.API_KEY;

    if (activeRole !== "Judge") {
      throw new Error("Unauthorized access - Only Judges can access this portal");
    }

    if (!user?.userId) {
      throw new Error("User not authenticated");
    }

    return (
      <>
        <Header
          title="MARK ENTRY PORTAL"
          subTitle="Enter marks for your assigned program."
        />
        <JudgePortal
          judgeId={user.userId}
          activeYear={activeYear}
          apiKey={apiKey}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading judge portal:", error?.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Access Error"
        description={
          error?.message ||
          "An unexpected error occurred while processing your request."
        }
      />
    );
  }
}

export const dynamic = "force-dynamic";
