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
  initialFestivalLogo = "",
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

  const { festivalName, festivalLogo, festivalNameImage } = useMemo(() => {
    const settings = fetchSettingsQuery.data?.settings;
    if (!settings) {
      return {
        festivalName: initialFestivalName,
        festivalLogo: initialFestivalLogo,
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
    const logo =
      matchingFestival?.festivalLogo?.url ||
      settings.festival?.festivalLogo?.url ||
      settings.festivals?.find((f) => f.festivalLogo?.url)?.festivalLogo?.url ||
      initialFestivalLogo;
    const nameImage =
      matchingFestival?.festivalNameImage?.url ||
      settings.festival?.festivalNameImage?.url ||
      settings.festivals?.find((f) => f.festivalNameImage?.url)
        ?.festivalNameImage?.url ||
      initialFestivalNameImage;

    return {
      festivalName: name,
      festivalLogo: logo,
      festivalNameImage: nameImage,
    };
  }, [
    fetchSettingsQuery.data,
    activeYear,
    initialFestivalName,
    initialFestivalLogo,
    initialFestivalNameImage,
  ]);

  return (
    <div className="space-y-6">
      <Header
        title="RESULTS QR CODE"
        subTitle="Generate and share festival results instantly"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-full">
          <QRCodeGenerator
            resultsUrl={resultsUrl}
            qrOptions={qrOptions}
            printRef={printRef}
            apiKey={apiKey}
            festivalName={festivalName}
            organizationName="SCOFIST"
            festivalLogo={festivalLogo}
          />
        </div>

        {/* Sharable Preview & Actions */}
        <div className="h-full">
          <QRCodeActions
            resultsUrl={resultsUrl}
            organizationName="SCOFIST"
            festivalName={festivalName}
            festivalLogo={festivalLogo}
            festivalNameImage={festivalNameImage}
            activeYear={activeYear}
          />
        </div>
      </div>
    </div>
  );
}
