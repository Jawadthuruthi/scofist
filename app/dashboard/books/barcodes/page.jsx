import { fetchData } from "@/lib/utils";
import BookBarcodesClient from "@/components/BookBarcodesClient";

export const metadata = {
    title: "Book Barcodes",
    description: "View, search, filter and print book barcodes",
};

export default async function Page() {
    const books = await fetchData("library/books", "", 0, "data");

    return <BookBarcodesClient initialBooks={books || []} />;
}
