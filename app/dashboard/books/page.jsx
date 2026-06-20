import { fetchData } from "@/lib/utils";
import LibraryDashboard from "@/components/LibraryDashboard";
import { cookies } from "next/headers";

export default async function Page() {
    const initialBooks = await fetchData("library/books", "", 0, "data");
    const cookiesStore = await cookies();
    const activeRole = cookiesStore.get("active-role")?.value || "";

    return <LibraryDashboard view="books" initialBooks={initialBooks} activeRole={activeRole} />;
}
