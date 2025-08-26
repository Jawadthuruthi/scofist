"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import useCrud from "@/hooks/use-crud";

export default function PrintHeader({
  title,
  apiKey,
  hidePrintLogo = false,
  displayOnScreen = false,
  isFestival = false,
}) {
  const [data, setData] = useState({});
  const { useFetchItems } = useCrud("settings", apiKey);
  const fetchSettingsQuery = useFetchItems(
    0,
    0,
    {},
    {
      enabled: !!apiKey && !hidePrintLogo,
    }
  );

  useEffect(() => {
    if (fetchSettingsQuery.data) {
      if (isFestival) {
        setData(fetchSettingsQuery.data?.settings?.festival || {});
      } else {
        setData(fetchSettingsQuery.data?.settings?.institution || {});
      }
    }
  }, [fetchSettingsQuery.data]);

  if (isFestival) {
    return (
      <div
        className={`w-full border-0 print:block ${displayOnScreen ? "" : "hidden"}`}
      >
        <div>
          <div className="flex flex-col max-w-full overflow-x-auto">
            {/* Header with festival print header */}
            {data.printHeader?.url && (
              <div className="flex items-center justify-center w-full max-h-20 bg-white mb-1 aspect-[2480/310]">
                <Image
                  src={data.printHeader.url}
                  alt="Festival Print Header"
                  width={2480}
                  height={300}
                  className="object-contain w-full h-full"
                  priority
                  unoptimized
                />
              </div>
            )}

            {/* Optional Title Below Header */}
            {title && title.length > 0 && (
              <div className="bg-black text-white py-1 text-center">
                <h2 className="text-lg font-medium">
                  {title.charAt(0).toUpperCase() + title.slice(1)}
                </h2>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  } else {
    return (
      <Card
        className={`w-full border-0 print:block mb-4 ${displayOnScreen ? "" : "hidden"}`}
      >
        <CardContent className="p-0">
          <div className="flex flex-col max-w-full overflow-x-auto">
            {/* Header with logo and data info */}
            {!hidePrintLogo && (
              <div className="flex items-center min-w-[560px] justify-center bg-gradient-to-b from-white to-gray-50 border-b border-gray-200 mb-1">
                {/* Left side - Logo */}
                <div className="flex-shrink-0 w-28 h-28 mr-4">
                  {data.logo && data.logo.url ? (
                    <Image
                      src={data.logo.url}
                      alt="Institution Logo"
                      width={112}
                      height={112}
                      className="object-contain"
                      unoptimized
                      priority
                    />
                  ) : (
                    <div className="w-28 h-28 bg-gray-50 flex items-center justify-center rounded-md border border-gray-200">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-gray-400"
                      >
                        <rect width="18" height="18" x="3" y="3" rx="2" />
                        <circle cx="9" cy="9" r="2" />
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Center - Institution details - Properly centered */}
                <div className=" text-center flex flex-col justify-center space-y-0 leading-tight max-w-md">
                  <h1 className="text-lg font-bold mb-0 text-gray-800">
                    {data.name || "INSTITUTION NAME"}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {data.tagline && <span>({data.tagline})</span>}
                  </p>
                  <p className="text-sm text-gray-600">{data.address || ""}</p>
                  <p className="text-sm text-gray-600">
                    {data.contact?.primaryPhone &&
                      `Phone: ${data.contact.primaryPhone}`}
                    {data.contact?.secondaryPhone &&
                      `, ${data.contact.secondaryPhone}`}
                  </p>
                  <p className="text-sm text-gray-600">
                    {data.contact?.email && `Email: ${data.contact.email}`}
                    {data.contact?.website && ` | Web: ${data.contact.website}`}
                  </p>
                </div>
              </div>
            )}

            {/* Black strip for document title */}
            {title && title.length > 0 && (
              <div className="bg-black text-white py-1 text-center">
                <h2 className="text-lg font-medium">
                  {title.charAt(0).toUpperCase() + title.slice(1)}
                </h2>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
}
