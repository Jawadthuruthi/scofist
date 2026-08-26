import JudgesManagement from "@/components/JudgesManagement";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { fetchData, parseUser } from "@/lib/utils";
import { cookies, headers } from "next/headers";

export default async function JudgesPage() {
  try {
    const headerStore = await headers();
    const cookiesStore = await cookies();
    const user = parseUser(headerStore);
    const activeRole = cookiesStore.get("active-role")?.value;
    const activeYear = cookiesStore.get("active-year")?.value;
    const yearParam = activeYear ? `year=${encodeURIComponent(activeYear)}&` : "";
    const apiKey = process.env.API_KEY;

    if (activeRole !== "Program Committee") {
      throw new Error("Unauthorized access - Only Program Committee can manage judges");
    }

    const [programs, divisions, judgesData] = await Promise.all([
      fetchData(
        "programs",
        `${yearParam}projection=_id,name,type,category,divisionId`,
        0
      ),
      fetchData("divisions", `${yearParam}projection=_id,name`, 0),
      fetchData("users", `roles=Judge&projection=_id,name&limit=1000`, 0, "users"),
    ]);

    const sortedPrograms = programs?.sort((a, b) => a.name?.localeCompare(b.name));

    return (
      <>
        <Header
          title="JUDGES"
          subTitle="Assign programs to judges for mark entry"
        />
        <div className="pt-4">
          <JudgesManagement
            programs={sortedPrograms}
            divisions={divisions}
            judges={judgesData || []}
            apiKey={apiKey}
            activeYear={activeYear}
            userId={user?.userId}
          />
        </div>
      </>
    );
  } catch (error) {
    console.error("Error loading judges page:", error?.message);
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
