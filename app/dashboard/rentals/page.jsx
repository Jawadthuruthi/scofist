import { fetchData } from "@/lib/utils";
import LibraryDashboard from "@/components/LibraryDashboard";

export default async function Page() {
    const initialRentals = await fetchData("rental", "", 0, "data");
    const initialPendingRequests = await fetchData("library/requests", "", 0, "data");
    const classes = await fetchData("classes", "", 0);

    return <LibraryDashboard view="rentals" initialRentals={initialRentals} initialPendingRequests={initialPendingRequests} classes={classes} />;
}
