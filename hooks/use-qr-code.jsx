// hooks/use-qr-code.js
"use client";

import { useState, useMemo, useEffect } from "react";

export function useQRCodeConfig(activeYear) {
  const [size, setSize] = useState(250);

  const [resultsUrl, setResultsUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      let url = `${window.location.origin}/results`;
      if (activeYear) {
        const year = activeYear.split(" ")[0];
        url += `/${year}`;
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
        dark: "#000000",
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
