"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import useCrud from "@/hooks/use-crud";

export default function PrintHeader({ title, apiKey, hidePrintLogo = false }) {
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
      setData(fetchSettingsQuery.data?.settings || {});
    }
  }, [fetchSettingsQuery.data]);

  const institution = data?.institution || {};

  return (
    <Card className="w-full border-0 hidden print:block">
      <CardContent className="p-0">
        <div className="flex flex-col w-full">
          {/* Header with logo and institution info */}
          {!hidePrintLogo && (
            <div className="flex items-center justify-center bg-gradient-to-b from-white to-gray-50 border-b border-gray-200">
              {/* Left side - Logo */}
              <div className="flex-shrink-0 w-28 h-28 mr-4">
                {institution.logo && institution.logo.url ? (
                  <Image
                    src={institution.logo.url}
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
              <div className="flex-grow text-center flex flex-col justify-center max-w-md">
                <h1 className="text-lg font-bold mb-0 text-gray-800">
                  {institution.name || "INSTITUTION NAME"}
                </h1>
                <p className="text-sm text-gray-600">
                  {institution.tagline && <span>({institution.tagline})</span>}
                </p>
                <p className="text-sm text-gray-600">
                  {institution.address || ""}
                </p>
                <p className="text-sm text-gray-600">
                  {institution.contact?.primaryPhone &&
                    `Phone: ${institution.contact.primaryPhone}`}
                  {institution.contact?.secondaryPhone &&
                    `, ${institution.contact.secondaryPhone}`}
                </p>
                <p className="text-sm text-gray-600">
                  {institution.contact?.email &&
                    `Email: ${institution.contact.email}`}
                  {institution.contact?.website &&
                    ` | Web: ${institution.contact.website}`}
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
