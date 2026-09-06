// app/dashboard/results-qr-code/_components/QRCodeActions.jsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Copy,
  ExternalLink,
  Share2,
  Check,
  QrCode,
  Loader2,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useClipboard } from "@/hooks/use-clipboard";

// Helper to trim transparent whitespace padding on Cloudinary assets
function getTrimmedImageUrl(url) {
  if (!url || typeof url !== "string") return url;
  if (url.includes("cloudinary.com") && url.includes("/upload/")) {
    if (!url.includes("e_trim")) {
      return url.replace("/upload/", "/upload/e_trim/");
    }
  }
  return url;
}

// Helper to draw an image in pure white on canvas
function drawWhiteImage(ctx, img, x, y, w, h) {
  const rw = Math.round(w);
  const rh = Math.round(h);
  const rx = Math.round(x);
  const ry = Math.round(y);

  try {
    ctx.save();
    ctx.filter = "brightness(0) invert(1)";
    ctx.drawImage(img, rx, ry, rw, rh);
    ctx.restore();
    return;
  } catch (e) {
    console.warn("Direct filter draw failed, trying offscreen canvas:", e);
  }

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
    }
  } catch (e) {
    console.warn("Offscreen canvas white fill error:", e);
  }
}

// Helper to generate square blue background image with white logo and festival name
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
      new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        const corsUrl = src.includes("?") ? `${src}&cors=1` : `${src}?cors=1`;
        img.onload = () => resolve(img);
        img.onerror = () => {
          const imgFallback = new Image();
          imgFallback.onload = () => resolve(imgFallback);
          imgFallback.onerror = () => resolve(null);
          imgFallback.src = src;
        };
        img.src = corsUrl;
      });

    const trimmedLogo = getTrimmedImageUrl(logoUrl);
    const trimmedName = getTrimmedImageUrl(nameImageUrl);

    let logoImg = null;
    let nameImg = null;

    if (trimmedLogo) {
      try {
        logoImg = await loadImage(trimmedLogo);
      } catch (e) {}
    }
    if (trimmedName) {
      try {
        nameImg = await loadImage(trimmedName);
      } catch (e) {}
    }

    // With trimmed images, actual logo mark fills the bounding box
    const maxLogoH = 660;
    const maxLogoW = 700;
    let logoW = 0;
    let logoH = 0;
    if (logoImg) {
      const ratio = Math.min(
        maxLogoW / logoImg.width,
        maxLogoH / logoImg.height,
        1
      );
      logoW = logoImg.width * ratio;
      logoH = logoImg.height * ratio;
    }

    const maxNameW = 840;
    const maxNameH = 160;
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

    const gap = 24;
    let totalContentHeight = 0;
    if (logoImg && nameImg) {
      totalContentHeight = logoH + gap + nameH;
    } else if (logoImg) {
      totalContentHeight = logoH;
    } else if (nameImg) {
      totalContentHeight = nameH;
    }

    const startY = (1080 - totalContentHeight) / 2;

    if (logoImg) {
      const logoX = (1080 - logoW) / 2;
      const logoY = startY;
      drawWhiteImage(ctx, logoImg, logoX, logoY, logoW, logoH);
    }

    if (nameImg) {
      const nameX = (1080 - nameW) / 2;
      const nameY = logoImg ? startY + logoH + gap : startY;
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
}) {
  const { isCopied, copyToClipboard } = useClipboard();
  const [isSharingUrl, setIsSharingUrl] = useState(false);
  const [shareBlob, setShareBlob] = useState(null);

  // Pre-load / pre-generate share image as soon as page loads so it is immediately ready when sharing
  useEffect(() => {
    let isMounted = true;
    async function loadShareImage() {
      const year = activeYear ? activeYear.split(" ")[0] : "2026";
      try {
        const res = await fetch(
          `/api/og/results/${encodeURIComponent(year)}?v=${Date.now()}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const b = await res.blob();
          if (isMounted) {
            setShareBlob(b);
            return;
          }
        }
      } catch (e) {
        console.warn("Pre-fetching OG share image failed:", e);
      }

      if (festivalLogo || festivalNameImage) {
        try {
          const b = await generateSquareShareImage(
            festivalLogo,
            festivalNameImage
          );
          if (isMounted && b) setShareBlob(b);
        } catch (e) {
          console.warn("Canvas share image fallback failed:", e);
        }
      }
    }

    loadShareImage();
    return () => {
      isMounted = false;
    };
  }, [activeYear, festivalLogo, festivalNameImage]);

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
    const year = activeYear ? activeYear.split(" ")[0] : "2026";
    const shareTitle = `${displayName} Results`;
    const shareText = `Check out ${displayName} festival results-${year}:`;

    try {
      if (navigator.share) {
        let shared = false;
        let blob = shareBlob;

        // 1. If not pre-fetched yet, fetch with cache-busting
        if (!blob) {
          try {
            const res = await fetch(
              `/api/og/results/${encodeURIComponent(year)}?v=${Date.now()}`,
              { cache: "no-store" }
            );
            if (res.ok) {
              blob = await res.blob();
              setShareBlob(blob);
            }
          } catch (fetchErr) {
            console.warn("Could not fetch server square OG image:", fetchErr);
          }
        }

        // 2. Fallback to canvas generator if server fetch was not available
        if (!blob && (festivalLogo || festivalNameImage)) {
          blob = await generateSquareShareImage(
            festivalLogo,
            festivalNameImage
          );
          if (blob) setShareBlob(blob);
        }

        // 3. Share with the square image file attachment
        if (blob) {
          const safeName = displayName.toLowerCase().replace(/\s+/g, "-");
          const file = new File([blob], `${safeName}-results.png`, {
            type: "image/png",
          });

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
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

        // 4. Fallback to standard share if file wasn't shared
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

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Sharable Image Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col items-center justify-between pt-0 space-y-4">
        {/* Sharable Image Preview (Blue background square with white logo & festival name) */}
        <div className="w-full flex-1 flex flex-col items-center justify-center py-2 space-y-3">
          <div className="w-[300px] h-[300px] max-w-full aspect-square mx-auto bg-blue-600 rounded-2xl border border-blue-500 shadow-md shadow-blue-500/20 p-4 flex flex-col items-center justify-center text-center select-none">
            {/* Festival Logo & Festival Name Image in White */}
            <div className="flex flex-col items-center justify-center gap-2 w-full">
              {getTrimmedImageUrl(festivalLogo) ? (
                <img
                  src={getTrimmedImageUrl(festivalLogo)}
                  alt={festivalName || "Festival Logo"}
                  className="h-36 sm:h-40 w-auto max-w-[200px] object-contain brightness-0 invert"
                  style={{ filter: "brightness(0) invert(1)" }}
                />
              ) : (
                <div className="w-28 h-28 rounded-xl bg-blue-500/40 flex items-center justify-center text-white">
                  <QrCode className="w-14 h-14 text-white" />
                </div>
              )}

              {getTrimmedImageUrl(festivalNameImage) ? (
                <img
                  src={getTrimmedImageUrl(festivalNameImage)}
                  alt={festivalName || "Festival Name"}
                  className="max-h-9 w-auto max-w-[200px] object-contain brightness-0 invert"
                  style={{ filter: "brightness(0) invert(1)" }}
                />
              ) : festivalName ? (
                <span className="text-white text-sm font-bold uppercase tracking-wider">
                  {festivalName}
                </span>
              ) : null}
            </div>
          </div>

          {resultsUrl && (
            <p className="text-xs text-muted-foreground text-center truncate max-w-full px-2 font-mono">
              {resultsUrl}
            </p>
          )}
        </div>

        {/* Buttons under preview: Share, Copy, View Result Page */}
        <div className="w-full space-y-2.5 pt-2 mt-auto">
          {/* Share URL */}
          <Button
            onClick={handleShareUrl}
            disabled={isSharingUrl}
            className="w-full"
            variant="default"
          >
            {isSharingUrl ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Share2 className="mr-2 h-4 w-4" />
            )}
            Share URL
          </Button>

          {/* Copy URL */}
          <Button onClick={handleCopyUrl} className="w-full" variant="outline">
            {isCopied ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            {isCopied ? "Copied!" : "Copy URL"}
          </Button>

          {/* View Results Page */}
          <Button
            onClick={handleViewResults}
            className="w-full"
            variant="outline"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View Results Page
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
