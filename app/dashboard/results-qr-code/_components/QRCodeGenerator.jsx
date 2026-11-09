// app/dashboard/results-qr-code/_components/QRCodeGenerator.jsx
"use client";

import { useRef, useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, Download, Printer, Share2 } from "lucide-react";
import PrintHeader from "@/components/PrintHeader";
import { useReactToPrint } from "react-to-print";
import { createPrintHandler } from "@/lib/qr-code/print-handler";
import { downloadQRCode } from "@/lib/qr-code/download-handler";
import { toast } from "sonner";

export function QRCodeGenerator({
  resultsUrl,
  qrOptions,
  printRef: externalPrintRef,
  apiKey,
  festivalName,
  organizationName = "SCOFIST",
  festivalLogo,
}) {
  const localPrintRef = useRef(null);
  const printRef = externalPrintRef || localPrintRef;

  const [tintedLogo, setTintedLogo] = useState(null);

  useEffect(() => {
    if (!festivalLogo) {
      setTintedLogo(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      // Use original resolution for crispness, but cap size to prevent memory issues if image is huge
      const maxDim = 500;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h);
        w *= ratio;
        h *= ratio;
      }
      canvas.width = w;
      canvas.height = h;
      
      const ctx = canvas.getContext("2d");
      
      // Draw white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      
      ctx.drawImage(img, 0, 0, w, h);

      const targetColorHex = qrOptions?.color?.dark || "#1d4ed8";
      const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 29, g: 78, b: 216 };
      };
      
      const targetColor = hexToRgb(targetColorHex);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < data.data.length; i += 4) {
        const r = data.data[i];
        const g = data.data[i+1];
        const b = data.data[i+2];
        const a = data.data[i+3];

        if (a > 0) {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          data.data[i] = targetColor.r + (255 - targetColor.r) * (gray / 255);
          data.data[i+1] = targetColor.g + (255 - targetColor.g) * (gray / 255);
          data.data[i+2] = targetColor.b + (255 - targetColor.b) * (gray / 255);
        }
      }
      ctx.putImageData(data, 0, 0);
      setTintedLogo(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      setTintedLogo(null);
    };
    img.src = festivalLogo;
  }, [festivalLogo, qrOptions?.color?.dark]);

  // Print handler
  const handlePrint = useReactToPrint(
    createPrintHandler(printRef, {
      organizationName: festivalName || organizationName,
    })
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
          toast.error(
            "Sharing files is not supported on this device. Try downloading instead."
          );
        }
      });
    } catch (error) {
      toast.error("An error occurred while sharing the QR Code");
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Festival Results QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col items-center justify-between pt-0 space-y-4">
        {/* Printable Canvas Section */}
        <div
          ref={printRef}
          id="qr-code-canvas"
          className="w-full flex-1 flex flex-col items-center justify-center py-2 space-y-3 print:bg-white print:p-6"
        >
          <div className="w-full">
            <PrintHeader apiKey={apiKey} isFestival={true} />
          </div>

          <div className="w-[300px] h-[300px] max-w-full aspect-square mx-auto rounded-2xl overflow-hidden shadow-md bg-white flex items-center justify-center">
            <QRCodeCanvas
              value={resultsUrl}
              size={300}
              level={qrOptions?.level || "H"}
              marginSize={0}
              bgColor={qrOptions?.color?.light || "#ffffff"}
              fgColor={qrOptions?.color?.dark || "#1d4ed8"}
              style={{ width: "100%", height: "100%", display: "block" }}
              imageSettings={festivalLogo ? {
                src: tintedLogo || festivalLogo,
                x: undefined,
                y: undefined,
                height: 60,
                width: 60,
                excavate: false,
              } : undefined}
            />
          </div>
          <p className="text-xs text-center text-muted-foreground truncate max-w-full px-2 font-mono">
            Scan to view {festivalName ? `${festivalName.toUpperCase()} ` : ""}festival results
          </p>
        </div>

        {/* Buttons under QR code: Download, Print, Share */}
        <div className="w-full space-y-2.5 pt-2 mt-auto">
          <Button onClick={handleDownload} className="w-full" variant="default">
            <Download className="mr-2 h-4 w-4" />
            Download QR Code
          </Button>

          <Button onClick={handlePrint} className="w-full bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 border-0 btn-print">
            <Printer className="mr-2 h-4 w-4" />
            Print QR Code
          </Button>

          <Button onClick={handleShareQRCode} className="w-full" variant="outline">
            <Share2 className="mr-2 h-4 w-4" />
            Share QR Code
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
