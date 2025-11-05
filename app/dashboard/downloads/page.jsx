import ErrorPage from "@/components/ErrorPage";
import Downloads from "@/components/Downloads";
import { fetchData, parseUser } from "@/lib/utils";
import { cookies, headers } from "next/headers";

const DownloadsPage = async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const user = parseUser(headerStore);

  const activeRole = cookieStore.get("active-role")?.value;
  const apiKey = process.env.API_KEY;

  try {
    const downloads = await fetchData("downloads");

    return (
      <Downloads
        initialDownloads={downloads.downloads}
        role={activeRole}
        apiKey={apiKey}
      />
    );
  } catch (error) {
    console.error("Error loading downloads:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Something went wrong"
        description="We encountered an unexpected error. Our team has been notified and is working to resolve the issue."
      />
    );
  }
};

export default DownloadsPage;

export const revalidate = 60;
