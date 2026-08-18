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
} from "lucide-react";
import { toast } from "sonner";
import { useClipboard } from "@/hooks/use-clipboard";
import { createPrintHandler } from "@/lib/qr-code/print-handler";
import { downloadQRCode } from "@/lib/qr-code/download-handler";

export function QRCodeActions({
  resultsUrl,
  organizationName = "SCOFIST",
  printRef,
}) {
  const { isCopied, copyToClipboard } = useClipboard();

  // Print handler
  const handlePrint = useReactToPrint(
    createPrintHandler(printRef, { organizationName })
  );

  // Download handler
  const handleDownload = async () => {
    try {
      downloadQRCode(
        "#qr-code-canvas canvas",
        `Results-QR-${organizationName}`
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
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Festival Results",
          text: "Check out our festival results!",
          url: resultsUrl,
        });
        toast.success("Shared URL successfully!");
      } catch (error) {
        if (error.name !== "AbortError") {
          toast.error("Failed to share URL");
        }
      }
    } else {
      handleCopyUrl();
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
        
        const file = new File([blob], `Results-QR-${organizationName}.png`, { type: "image/png" });
        
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

        {/* 4. Result URL (Text display) */}
        <div className="py-2">
          <div className="p-3 bg-muted rounded-lg border text-center">
            <p className="text-xs font-medium mb-1">Results URL:</p>
            <p className="text-xs text-muted-foreground break-all">
              {resultsUrl}
            </p>
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
        <Button onClick={handleShareUrl} className="w-full" variant="outline">
          <Share2 className="mr-2 h-4 w-4" />
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
