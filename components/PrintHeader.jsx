"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import useCrud from "@/hooks/use-crud";

export default function PrintHeader({
  title,
  subTitle,
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
              <div className="flex items-center justify-center w-full max-h-10 max-w-xl mx-auto bg-white mb-1 ">
                <Image
                  src={data.printHeader.url}
                  alt="Festival Print Header"
                  width={2480}
                  height={300}
                  className=" w-full h-full aspect-[8/1]"
                  priority
                  unoptimized
                />
              </div>
            )}

            {/* Optional Title Below Header */}
            {title && (
              <div className="bg-accent text-accent-foreground py-1 text-center">
                {typeof title === 'string' ? (
                  <h2 className="text-xl font-bold uppercase">
                    {title.charAt(0).toUpperCase() + title.slice(1)}
                  </h2>
                ) : (
                  title
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  } else {
    return (
      <Card
        className={`w-full border-0 shadow-none print:shadow-none print:border-0 print:m-0 print:p-0 mb-4 ${displayOnScreen ? "" : "hidden print:block"}`}
      >
        <CardContent className="p-0">
          <div className="flex flex-col max-w-full overflow-x-auto print:overflow-visible">
            {/* Header with logo and data info */}
            {!hidePrintLogo && (
              <div className="flex flex-col sm:flex-row items-center sm:justify-between w-full min-w-0 px-4 sm:px-8 py-4 sm:py-4 bg-gradient-to-b from-white to-gray-50 border-b border-gray-200 gap-4 sm:gap-0">
                {/* Left side - Logo and Name side-by-side */}
                <div className="flex flex-row items-center gap-3 sm:gap-6 text-left">
                  <div className="flex-shrink-0 w-14 h-14 sm:w-24 sm:h-24">
                    {data.logo && data.logo.url ? (
                      <Image
                        src={data.logo.url}
                        alt="Institution Logo"
                        width={96}
                        height={96}
                        className="object-contain w-full h-full"
                        unoptimized
                        priority
                      />
                    ) : (
                      <div className="w-14 h-14 sm:w-24 sm:h-24 bg-gray-50 flex items-center justify-center rounded-md border border-gray-200">
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
                  <div className="flex flex-col leading-tight">
                    <h1 className="text-sm sm:text-xl font-bold mb-0 text-gray-800 leading-tight">
                      {data.name || "INSTITUTION NAME"}
                    </h1>
                    <p className="text-[10px] sm:text-sm text-gray-600 italic leading-tight mt-0.5">
                      {data.tagline && <span>{data.tagline}</span>}
                    </p>
                  </div>
                </div>

                {/* Right side - Contact details */}
                <div className="text-center sm:text-right flex flex-col justify-center space-y-0.5 text-[10px] sm:text-xs text-gray-600 w-full sm:max-w-xs mt-2 sm:mt-0">
                  <p className="font-medium">{data.address || ""}</p>
                  <p>
                    {data.contact?.primaryPhone &&
                      `Phone: ${data.contact.primaryPhone}`}
                    {data.contact?.secondaryPhone &&
                      `, ${data.contact.secondaryPhone}`}
                  </p>
                  <p>
                    {data.contact?.email && `Email: ${data.contact.email}`}
                  </p>
                  <p>
                    {data.contact?.website && `Web: ${data.contact.website}`}
                  </p>
                </div>
              </div>
            )}

            {/* Black strip for document title */}
            {title && (
              <div className="bg-black text-white py-1 text-center">
                {typeof title === 'string' ? (
                  <h2 className="text-lg font-medium">{title}</h2>
                ) : (
                  title
                )}
              </div>
            )}

            {/* Gray strip for subTitle (Date Range) */}
            {subTitle && (
              <div className="bg-gray-100 text-black py-1 text-center border-b border-gray-300">
                <p className="text-sm font-semibold m-0">{subTitle}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
}
