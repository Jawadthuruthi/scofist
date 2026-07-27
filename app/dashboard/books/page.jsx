import { fetchData } from "@/lib/utils";
import LibraryDashboard from "@/components/LibraryDashboard";
import { cookies } from "next/headers";

export default async function Page() {
    const [initialBooks, initialPendingRequests, classes, cookiesStore] = await Promise.all([
        fetchData("library/books", "", 0, "data"),
        fetchData("library/requests", "", 0, "data"),
        fetchData("classes", "", 0),
        cookies()
    ]);
    const activeRole = cookiesStore.get("active-role")?.value || "";

    const apiKey = process.env.API_KEY || "";

    return <LibraryDashboard view="books" initialBooks={initialBooks} initialPendingRequests={initialPendingRequests} activeRole={activeRole} apiKey={apiKey} classes={classes} />;
}
