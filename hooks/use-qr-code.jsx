// hooks/use-qr-code.js
"use client";

import { useState, useMemo, useEffect } from "react";

export function useQRCodeConfig(activeYear) {
  const [size, setSize] = useState(300);

  const [resultsUrl, setResultsUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      let url = `${window.location.origin}/results`;
      if (activeYear) {
        const year = activeYear.split(" ")[0];
        url += `/${year}`;
      } else {
        url += `/2025`;
      }
      setResultsUrl(url);
    }
  }, [activeYear]);

  const qrOptions = useMemo(
    () => ({
      level: "H",
      margin: 1,
      scale: 4,
      width: size,
      color: {
        dark: "#1d4ed8",
        light: "#ffffff",
      },
    }),
    [size]
  );

  return {
    resultsUrl,
    qrOptions,
    size,
    setSize,
  };
}
