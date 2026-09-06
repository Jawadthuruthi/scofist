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

export function QRCodeActions({
  resultsUrl,
  organizationName = "SCOFIST",
  festivalName,
  festivalNameImage,
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

        // If festivalNameImage exists, try sharing with the image file
        if (festivalNameImage) {
          try {
            const response = await fetch(festivalNameImage);
            if (response.ok) {
              const blob = await response.blob();
              const ext = blob.type.split("/")[1] || "png";
              const safeName = displayName.toLowerCase().replace(/\s+/g, "-");
              const file = new File([blob], `${safeName}-name.${ext}`, {
                type: blob.type || "image/png",
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

                // If combined files+url was not supported/failed, try files + text (text contains resultsUrl)
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
          } catch (fetchErr) {
            if (fetchErr.name === "AbortError") throw fetchErr;
            console.warn(
              "Could not attach festival name image for share:",
              fetchErr
            );
          }
        }

        // Fallback to standard share if file wasn't shared
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

        {/* 4. Result URL (Text display & Festival Image preview) */}
        <div className="py-2">
          <div className="p-3 bg-muted rounded-lg border text-center space-y-2">
            {festivalNameImage && (
              <div className="flex justify-center items-center py-1">
                <img
                  src={festivalNameImage}
                  alt={festivalName || organizationName}
                  className="max-h-12 w-auto max-w-[200px] object-contain"
                />
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-foreground">
                {festivalName
                  ? `${festivalName.charAt(0).toUpperCase() + festivalName.slice(1)} Results URL:`
                  : "Results URL:"}
              </p>
              <p className="text-xs text-muted-foreground break-all mt-0.5">
                {resultsUrl}
              </p>
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
