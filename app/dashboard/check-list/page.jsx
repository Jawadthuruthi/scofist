import { cookies } from "next/headers";
import { fetchData } from "@/lib/utils";
import CheckListClient from "./CheckListClient";
import ErrorPage from "@/components/ErrorPage";

const CheckListPage = async () => {
    try {
        const cookieStore = await cookies();
        const activeRole = cookieStore.get("active-role")?.value;
        const activeYear = cookieStore.get("active-year")?.value;
        const apiKey = process.env.API_KEY;

        if (activeRole !== "Program Committee") {
            return (
                <ErrorPage
                    statusCode={403}
                    title="Access Denied"
                    description="You do not have permission to view this page."
                />
            );
        }

        const yearParam = activeYear ? `year=${encodeURIComponent(activeYear)}&` : "";

        const [teams, divisions] = await Promise.all([
            fetchData("teams", `${yearParam}projection=_id,name`),
            fetchData("divisions", `${yearParam}projection=_id,name,stageEvents,offStageEvents`),
        ]);

        return (
            <CheckListClient
                teams={teams || []}
                divisions={divisions || []}
                apiKey={apiKey}
            />
        );
    } catch (error) {
        console.error("Error in CheckListPage:", error);
        return (
            <ErrorPage
                statusCode={500}
                title="Internal Server Error"
                description="An unexpected error occurred while loading the check list page."
            />
        );
    }
};

export default CheckListPage;
export const revalidate = 0;
