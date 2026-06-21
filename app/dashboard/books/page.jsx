import { fetchData } from "@/lib/utils";
import LibraryDashboard from "@/components/LibraryDashboard";
import { cookies } from "next/headers";

export default async function Page() {
    const initialBooks = await fetchData("library/books", "", 0, "data");
    const initialPendingRequests = await fetchData("library/requests", "", 0, "data");
    const cookiesStore = await cookies();
    const activeRole = cookiesStore.get("active-role")?.value || "";

    const apiKey = process.env.API_KEY || "";

    return <LibraryDashboard view="books" initialBooks={initialBooks} initialPendingRequests={initialPendingRequests} activeRole={activeRole} apiKey={apiKey} />;
}
