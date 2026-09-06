// app/dashboard/results-qr-code/_components/QRCodeActions.jsx
"use client";

import { useState, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Copy,
  Printer,
  Download,
  ExternalLink,
  Share2,
  Check,
  QrCode,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useClipboard } from "@/hooks/use-clipboard";
import { createPrintHandler } from "@/lib/qr-code/print-handler";
import { downloadQRCode } from "@/lib/qr-code/download-handler";

// Helper to generate square white background image on canvas as fallback
async function generateSquareShareImage(logoUrl, nameImageUrl, resultsUrl) {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // 1. Pure white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 1080, 1080);

    const loadImage = (src) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });

    let logoImg = null;
    let nameImg = null;

    if (logoUrl) {
      try {
        logoImg = await loadImage(logoUrl);
      } catch (e) {}
    }
    if (nameImageUrl) {
      try {
        nameImg = await loadImage(nameImageUrl);
      } catch (e) {}
    }

    // 2. Draw Festival Logo in big
    if (logoImg) {
      const logoSize = 540;
      const logoX = (1080 - logoSize) / 2;
      const logoY = nameImg ? 90 : (1080 - logoSize) / 2;
      ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
    }

    // 3. Draw Festival Name Image under logo
    if (nameImg) {
      const maxWidth = 860;
      const maxHeight = 160;
      let w = nameImg.width;
      let h = nameImg.height;
      const ratio = Math.min(maxWidth / w, maxHeight / h, 1);
      w = w * ratio;
      h = h * ratio;
      const nameX = (1080 - w) / 2;
      const nameY = 640;
      ctx.drawImage(nameImg, nameX, nameY, w, h);
    }

    // 4. Draw URL in blue color under logo and image on white background
    if (resultsUrl) {
      ctx.fillStyle = "#2563eb";
      ctx.font = "bold 34px monospace, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(resultsUrl, 540, 940);
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  } catch (err) {
    console.warn("Canvas square image generation failed:", err);
    return null;
  }
}

export function QRCodeActions({
  resultsUrl,
  organizationName = "SCOFIST",
  festivalName,
  festivalLogo,
  festivalNameImage,
  activeYear,
  printRef,
}) {
  const { isCopied, copyToClipboard } = useClipboard();
  const [isSharingUrl, setIsSharingUrl] = useState(false);

  // Print handler
  const handlePrint = useReactToPrint(
    createPrintHandler(printRef, { organizationName: festivalName || organizationName })
  );

  // Download handler
  const handleDownload = async () => {
    try {
      downloadQRCode(
        "#qr-code-canvas canvas",
        `Results-QR-${festivalName || organizationName}`
      );
      toast.success("QR code downloaded!");
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Copy URL
  const handleCopyUrl = async () => {
    const success = await copyToClipboard(resultsUrl);
    if (success) {
      toast.success("URL copied to clipboard!");
    } else {
      toast.error("Failed to copy URL");
    }
  };

  // View results
  const handleViewResults = () => {
    window.open(resultsUrl, "_blank", "noopener,noreferrer");
  };

  // Share URL
  const handleShareUrl = async () => {
    setIsSharingUrl(true);
    const displayName = festivalName
      ? festivalName.charAt(0).toUpperCase() + festivalName.slice(1)
      : organizationName;
    const shareTitle = `${displayName} Results`;
    const shareText = `Check out ${displayName} festival results: ${resultsUrl}`;

    try {
      if (navigator.share) {
        let shared = false;
        let blob = null;

        // 1. Try fetching the square white background OG image from the server
        const year = activeYear ? activeYear.split(" ")[0] : "2026";
        try {
          const res = await fetch(`/api/og/results/${encodeURIComponent(year)}`);
          if (res.ok) {
            blob = await res.blob();
          }
        } catch (fetchErr) {
          console.warn("Could not fetch server square OG image:", fetchErr);
        }

        // 2. Fallback to canvas generator if server fetch was not available
        if (!blob && (festivalLogo || festivalNameImage)) {
          blob = await generateSquareShareImage(
            festivalLogo,
            festivalNameImage,
            resultsUrl
          );
        }

        // 3. Share with the square image file attachment
        if (blob) {
          const safeName = displayName.toLowerCase().replace(/\s+/g, "-");
          const file = new File([blob], `${safeName}-results.png`, {
            type: "image/png",
          });

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            // Try sharing file + title + text + url
            try {
              if (
                navigator.canShare({
                  files: [file],
                  title: shareTitle,
                  text: shareText,
                  url: resultsUrl,
                })
              ) {
                await navigator.share({
                  title: shareTitle,
                  text: shareText,
                  url: resultsUrl,
                  files: [file],
                });
                shared = true;
              }
            } catch (shareErr) {
              if (shareErr.name === "AbortError") throw shareErr;
            }

            // Fallback to file + text (contains resultsUrl)
            if (!shared) {
              try {
                await navigator.share({
                  title: shareTitle,
                  text: shareText,
                  files: [file],
                });
                shared = true;
              } catch (shareErr) {
                if (shareErr.name === "AbortError") throw shareErr;
              }
            }
          }
        }

        // 4. Fallback to standard share if file wasn't shared
        if (!shared) {
          await navigator.share({
            title: shareTitle,
            text: `Check out ${displayName} festival results!`,
            url: resultsUrl,
          });
        }
        toast.success("Shared URL successfully!");
      } else {
        await handleCopyUrl();
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        toast.error("Failed to share URL");
      }
    } finally {
      setIsSharingUrl(false);
    }
  };

  // Share QR Code Image
  const handleShareQRCode = async () => {
    try {
      const canvas = document.querySelector("#qr-code-canvas canvas");
      if (!canvas) {
        toast.error("QR Code not found");
        return;
      }
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error("Failed to process QR code");
          return;
        }
        
        const file = new File(
          [blob],
          `Results-QR-${festivalName || organizationName}.png`,
          { type: "image/png" }
        );
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: "QR Code",
              files: [file],
            });
            toast.success("QR Code shared successfully!");
          } catch (error) {
             if (error.name !== "AbortError") {
                toast.error("Failed to share QR Code");
             }
          }
        } else {
          toast.error("Sharing files is not supported on this device. Try downloading instead.");
        }
      });
    } catch (error) {
      toast.error("An error occurred while sharing the QR Code");
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {/* 1. Download QR Code */}
        <Button onClick={handleDownload} className="w-full" variant="default">
          <Download className="mr-2 h-4 w-4" />
          Download QR Code
        </Button>

        {/* 2. Print QR Code */}
        <Button onClick={handlePrint} className="w-full" variant="outline">
          <Printer className="mr-2 h-4 w-4" />
          Print QR Code
        </Button>

        {/* 3. Share QR Code */}
        <Button onClick={handleShareQRCode} className="w-full" variant="outline">
          <QrCode className="mr-2 h-4 w-4" />
          Share QR Code
        </Button>

        {/* 4. Sharable URL Card (White background square with big logo, name image, and blue URL) */}
        <div className="py-2">
          <div className="w-full max-w-[260px] aspect-square mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col items-center justify-between text-center select-none">
            {/* Upper: Festival Logo in big & Festival Name Image under logo */}
            <div className="flex-1 flex flex-col items-center justify-center gap-2 w-full">
              {festivalLogo ? (
                <img
                  src={festivalLogo}
                  alt={festivalName || "Festival Logo"}
                  className="w-32 h-32 sm:w-36 sm:h-36 object-contain"
                />
              ) : (
                <div className="w-24 h-24 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                  <QrCode className="w-12 h-12" />
                </div>
              )}

              {festivalNameImage && (
                <img
                  src={festivalNameImage}
                  alt={festivalName || "Festival Name"}
                  className="max-h-10 w-auto max-w-[180px] object-contain"
                />
              )}
            </div>

            {/* Bottom: URL in blue color under logo and name image on white background */}
            <div className="w-full pt-2 border-t border-gray-100">
              <a
                href={resultsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline break-all font-mono block"
              >
                {resultsUrl}
              </a>
            </div>
          </div>
        </div>

        {/* 5. Copy URL */}
        <Button onClick={handleCopyUrl} className="w-full" variant="outline">
          {isCopied ? (
            <Check className="mr-2 h-4 w-4" />
          ) : (
            <Copy className="mr-2 h-4 w-4" />
          )}
          {isCopied ? "Copied!" : "Copy URL"}
        </Button>

        {/* 6. Share URL */}
        <Button
          onClick={handleShareUrl}
          disabled={isSharingUrl}
          className="w-full"
          variant="outline"
        >
          {isSharingUrl ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Share2 className="mr-2 h-4 w-4" />
          )}
          Share URL
        </Button>

        {/* 7. View Results Page */}
        <Button
          onClick={handleViewResults}
          className="w-full"
          variant="outline"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          View Results Page
        </Button>
      </CardContent>
    </Card>
  );
}
