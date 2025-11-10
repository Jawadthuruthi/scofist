import ErrorPage from "@/components/ErrorPage";
import Remarks from "@/components/Remarks";
import { parseUser } from "@/lib/utils";
import { cookies, headers } from "next/headers";

export default async function RemarksPage() {
  try {
    const apiKey = process.env.API_KEY;
    const headerStore = await headers();
    const cookiesStore = await cookies();
    const user = parseUser(headerStore);
    const activeRole = cookiesStore.get("active-role")?.value;

    return (
      <Remarks
        apiKey={apiKey}
        role={activeRole}
        teacherId={user?.userId}
      />
    );
  } catch (error) {
    console.error("Error loading remarks page:", error.message);
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
