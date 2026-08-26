import IndividualResultsComponent from "@/components/IndividualResultsComponent";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { fetchData } from "@/lib/utils";
import { cookies } from "next/headers";

export default async function IndividualResultsPage() {
  try {
    const apiKey = process.env.API_KEY;
    const cookiesStore = await cookies();
    const activeYear = cookiesStore.get("active-year")?.value;
    const yearParam = activeYear ? `year=${encodeURIComponent(activeYear)}&` : "";

    let divisions;

    // Fetch required data
    divisions = await fetchData("divisions", `${yearParam}projection=_id,name,type`, 0);

    // Sort divisions alphabetically
    const sortedDivisions = divisions?.sort((a, b) =>
      a.name?.localeCompare(b.name)
    );

    return (
      <>
        <Header
          title="INDIVIDUAL RESULTS"
          subTitle="View Individual Participant Results"
        />
        <div className="pt-4">
          <IndividualResultsComponent
            divisions={sortedDivisions}
            apiKey={apiKey}
          />
        </div>
      </>
    );
  } catch (error) {
    console.error("Error loading individual results page:", error?.message);
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
