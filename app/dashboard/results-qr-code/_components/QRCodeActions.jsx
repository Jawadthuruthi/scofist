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

// Helper to draw an image in pure white on canvas
function drawWhiteImage(ctx, img, x, y, w, h) {
  const rw = Math.round(w);
  const rh = Math.round(h);
  const rx = Math.round(x);
  const ry = Math.round(y);

  try {
    const offCanvas = document.createElement("canvas");
    offCanvas.width = rw;
    offCanvas.height = rh;
    const offCtx = offCanvas.getContext("2d");
    if (offCtx) {
      offCtx.drawImage(img, 0, 0, rw, rh);
      offCtx.globalCompositeOperation = "source-in";
      offCtx.fillStyle = "#ffffff";
      offCtx.fillRect(0, 0, rw, rh);
      ctx.drawImage(offCanvas, rx, ry);
      return;
    }
  } catch (e) {
    console.warn("Offscreen canvas white fill error:", e);
  }

  ctx.save();
  ctx.filter = "brightness(0) invert(1)";
  ctx.drawImage(img, rx, ry, rw, rh);
  ctx.restore();
}

// Helper to generate square blue background image with white logo and festival name (75% size, no URL)
async function generateSquareShareImage(logoUrl, nameImageUrl) {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // 1. Blue background
    ctx.fillStyle = "#2563eb";
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

    // Logo size reduced to 60% (648px on 1080px canvas)
    const logoSize = 648;
    const maxNameW = 648;
    const maxNameH = 110;
    const gap = 12;

    let nameW = 0;
    let nameH = 0;
    if (nameImg) {
      const ratio = Math.min(
        maxNameW / nameImg.width,
        maxNameH / nameImg.height,
        1
      );
      nameW = nameImg.width * ratio;
      nameH = nameImg.height * ratio;
    }

    let totalContentHeight = 0;
    if (logoImg && nameImg) {
      totalContentHeight = logoSize + gap + nameH;
    } else if (logoImg) {
      totalContentHeight = logoSize;
    } else if (nameImg) {
      totalContentHeight = nameH;
    }

    const startY = (1080 - totalContentHeight) / 2;

    if (logoImg) {
      const logoX = (1080 - logoSize) / 2;
      const logoY = startY;
      drawWhiteImage(ctx, logoImg, logoX, logoY, logoSize, logoSize);
    }

    if (nameImg) {
      const nameX = (1080 - nameW) / 2;
      const nameY = logoImg ? startY + logoSize + gap : startY;
      drawWhiteImage(ctx, nameImg, nameX, nameY, nameW, nameH);
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
    const shareText = `Check out ${displayName} festival results:`;

    try {
      if (navigator.share) {
        let shared = false;
        let blob = null;

        // 1. Try fetching the square OG image from the server
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
            festivalNameImage
          );
        }

        // 3. Share with the square image file attachment
        if (blob) {
          const safeName = displayName.toLowerCase().replace(/\s+/g, "-");
          const file = new File([blob], `${safeName}-results.png`, {
            type: "image/png",
          });

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            // Try sharing file + title + text + url (URL is provided once via url field)
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

            // Fallback to file + text with URL appended only if url field failed/unsupported
            if (!shared) {
              try {
                await navigator.share({
                  title: shareTitle,
                  text: `${shareText} ${resultsUrl}`,
                  files: [file],
                });
                shared = true;
              } catch (shareErr) {
                if (shareErr.name === "AbortError") throw shareErr;
              }
            }
          }
        }

        // 4. Fallback to standard share if file wasn't shared (single URL via url field)
        if (!shared) {
          await navigator.share({
            title: shareTitle,
            text: shareText,
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

        {/* 4. Sharable URL Card (Blue background square with white logo & festival name image, 60% size, no URL) */}
        <div className="py-2 space-y-1.5">
          <div className="w-full max-w-[210px] aspect-square mx-auto bg-blue-600 rounded-2xl border border-blue-500 shadow-md shadow-blue-500/20 p-2.5 flex flex-col items-center justify-center text-center select-none">
            {/* Festival Logo & Festival Name Image in White (60% scale) */}
            <div className="flex flex-col items-center justify-center gap-1.5 w-full">
              {festivalLogo ? (
                <img
                  src={festivalLogo}
                  alt={festivalName || "Festival Logo"}
                  className="w-32 h-32 object-contain brightness-0 invert"
                  style={{ filter: "brightness(0) invert(1)" }}
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-blue-500/40 flex items-center justify-center text-white">
                  <QrCode className="w-10 h-10 text-white" />
                </div>
              )}

              {festivalNameImage ? (
                <img
                  src={festivalNameImage}
                  alt={festivalName || "Festival Name"}
                  className="max-h-7 w-auto max-w-[126px] object-contain brightness-0 invert"
                  style={{ filter: "brightness(0) invert(1)" }}
                />
              ) : festivalName ? (
                <span className="text-white text-xs font-bold uppercase tracking-wider">
                  {festivalName}
                </span>
              ) : null}
            </div>
          </div>
          {resultsUrl && (
            <p className="text-[11px] text-muted-foreground text-center truncate px-2 font-mono">
              {resultsUrl}
            </p>
          )}
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
