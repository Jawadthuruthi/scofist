// app/dashboard/results-qr-code/page.jsx
import { Suspense } from "react";
import ResultsQRCodeView from "./_components/ResultsQRCodeView";
import { QRCodeSkeleton } from "./_components/QRCodeSkeleton";
import ErrorPage from "@/components/ErrorPage";
import { cookies } from "next/headers";

import connectToDB from "@/lib/db";
import Settings from "@/models/Settings";

export default async function ResultsQRCodePage() {
  try {
    const cookiesStore = await cookies();
    const activeYear = cookiesStore.get("active-year")?.value;
    const apiKey = process.env.API_KEY;

    let initialFestivalName = "SCOFIST";
    let initialFestivalNameImage = "";

    try {
      await connectToDB();
      const settings = await Settings.findOne({}).lean();
      if (settings) {
        const matchingFestival =
          settings.festival ||
          settings.festivals?.find(
            (f) =>
              f.year?.toString().toLowerCase().includes(activeYear?.toString().toLowerCase()) ||
              f.festivalInfo?.year?.toString() === activeYear?.toString()
          ) ||
          settings.festivals?.[0];

        const festivalInfo =
          matchingFestival?.festivalInfo || settings.festival?.festivalInfo || {};
        initialFestivalName =
          festivalInfo.name || matchingFestival?.name || "SCOFIST";
        initialFestivalNameImage =
          matchingFestival?.festivalNameImage?.url ||
          settings.festival?.festivalNameImage?.url ||
          settings.festivals?.find((f) => f.festivalNameImage?.url)
            ?.festivalNameImage?.url ||
          "";
      }
    } catch (dbErr) {
      console.warn(
        "Could not load settings on server for results-qr-code:",
        dbErr.message
      );
    }

    return (
      <Suspense fallback={<QRCodeSkeleton />}>
        <ResultsQRCodeView
          activeYear={activeYear}
          apiKey={apiKey}
          initialFestivalName={initialFestivalName}
          initialFestivalNameImage={initialFestivalNameImage}
        />
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
