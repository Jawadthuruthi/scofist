export const dynamic = "force-dynamic";
import { fetchData } from "@/lib/utils";
import PublicLibraryClient from "@/components/PublicLibraryClient";
import PublicHeader from "@/components/PublicHeader"; // Assuming this exists, if not we can use a basic nav or remove it

export const metadata = {
    title: "Library Catalog | Scofist",
    description: "Browse and search our public library catalog.",
};

export default async function Page() {
    // Fetch books publically
    const books = await fetchData("library/books", "", 0, "data");

    return (
        <div className="min-h-screen bg-gray-50/50">
            {/* If there's a PublicHeader in the project, we can render it. Let's just wrap it cleanly */}
            <PublicLibraryClient initialBooks={books || []} />
        </div>
    );
}
