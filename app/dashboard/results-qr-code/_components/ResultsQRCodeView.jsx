// app/dashboard/results-qr-code/_components/ResultsQRCodeView.jsx
"use client";

import { useRef, useMemo } from "react";
import { QRCodeGenerator } from "./QRCodeGenerator";
import { QRCodeActions } from "./QRCodeActions";

import { useQRCodeConfig } from "@/hooks/use-qr-code";
import useCrud from "@/hooks/use-crud";
import Header from "@/components/Header";

export default function ResultsQRCodeView({
  activeYear,
  apiKey,
  initialFestivalName = "SCOFIST",
  initialFestivalNameImage = "",
}) {
  const printRef = useRef(null);
  const { resultsUrl, qrOptions } = useQRCodeConfig(activeYear);

  const { useFetchItems } = useCrud("settings", apiKey);
  const fetchSettingsQuery = useFetchItems(
    0,
    0,
    {},
    {
      enabled: !!apiKey,
    }
  );

  const { festivalName, festivalNameImage } = useMemo(() => {
    const settings = fetchSettingsQuery.data?.settings;
    if (!settings) {
      return {
        festivalName: initialFestivalName,
        festivalNameImage: initialFestivalNameImage,
      };
    }

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
    const name =
      festivalInfo.name || matchingFestival?.name || initialFestivalName;
    const nameImage =
      matchingFestival?.festivalNameImage?.url ||
      settings.festival?.festivalNameImage?.url ||
      settings.festivals?.find((f) => f.festivalNameImage?.url)
        ?.festivalNameImage?.url ||
      initialFestivalNameImage;

    return {
      festivalName: name,
      festivalNameImage: nameImage,
    };
  }, [
    fetchSettingsQuery.data,
    activeYear,
    initialFestivalName,
    initialFestivalNameImage,
  ]);

  return (
    <div className="space-y-6">
      <Header
        title="RESULTS QR CODE"
        subTitle="Generate and share festival results instantly"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 h-full">
          <QRCodeGenerator
            resultsUrl={resultsUrl}
            qrOptions={qrOptions}
            printRef={printRef}
            apiKey={apiKey}
            festivalName={festivalName}
            festivalNameImage={festivalNameImage}
          />
        </div>

        {/* Sidebar */}
        <div className="h-full">
          <QRCodeActions
            resultsUrl={resultsUrl}
            organizationName="SCOFIST"
            festivalName={festivalName}
            festivalNameImage={festivalNameImage}
            printRef={printRef}
          />
        </div>
      </div>
    </div>
  );
}
