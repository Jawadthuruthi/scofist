// app/dashboard/results-qr-code/page.jsx
import { Suspense } from "react";
import ResultsQRCodeView from "./_components/ResultsQRCodeView";
import { QRCodeSkeleton } from "./_components/QRCodeSkeleton";
import ErrorPage from "@/components/ErrorPage";
import { cookies } from "next/headers";

export default async function ResultsQRCodePage() {
  try {
    const cookiesStore = await cookies();
    const activeYear = cookiesStore.get("active-year")?.value;
    const apiKey = process.env.API_KEY;
    return (
      <Suspense fallback={<QRCodeSkeleton />}>
        <ResultsQRCodeView activeYear={activeYear} apiKey={apiKey} />
      </Suspense>
    );
  } catch (error) {
    console.error("Error loading QR code page:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while loading the QR code page."
      />
    );
  }
}

export const revalidate = 0;
