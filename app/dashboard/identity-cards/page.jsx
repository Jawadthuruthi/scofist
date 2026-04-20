import ErrorPage from "@/components/ErrorPage";
import IdentityCards from "@/components/IdentityCards";
import { fetchData } from "@/lib/utils";
import { headers } from "next/headers";

export const revalidate = 60;
const identityCardsPage = async () => {
  try {
    const headersList = headers();
    const userHeader = headersList.get("x-user");
    const user = userHeader ? JSON.parse(userHeader) : null;
    const activeRole = headersList.get("x-active-role") || (user?.roles?.[0]);

    const [students, settings, classes, teachers] = await Promise.all([
      fetchData("users", "roles=Student&status=Active"),
      fetchData("settings"),
      fetchData("classes"),
      fetchData("users", "roles=Teacher"),
    ]);

    return (
      <IdentityCards
        apiKey={process.env.API_KEY}
        students={students}
        settings={settings}
        institution={settings.institution}
        idCardBackgroundImageUrl={settings.idCard?.backgroundImage?.url}
        classes={classes}
        teachers={teachers}
        userRole={activeRole}
        allRoles={user?.roles || []}
        userId={user?._id}
      />
    );
  } catch (error) {
    console.error("Error loading identity card:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
};

export default identityCardsPage;
