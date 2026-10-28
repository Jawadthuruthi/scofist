"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Printer,
  Download,
  Loader2,
  FileText,
  AlertCircle,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";

// Dynamically load PDF.js from public folder (served locally with zero external dependencies)
function loadPdfJs() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve(null);
    if (window.pdfjsLib) {
      return resolve(window.pdfjsLib);
    }
    const existingScript = document.getElementById("pdfjs-lib-script");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.pdfjsLib));
      existingScript.addEventListener("error", () => reject(new Error("Failed to load PDF.js script")));
      return;
    }
    const script = document.createElement("script");
    script.id = "pdfjs-lib-script";
    script.src = "/pdf.min.js";
    script.async = true;
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
      }
      resolve(window.pdfjsLib);
    };
    script.onerror = () => reject(new Error("Failed to load PDF.js script"));
    document.body.appendChild(script);
  });
}

// Single PDF page canvas renderer
function PdfPageItem({ doc, pageNum, zoom, containerWidth }) {
  const canvasRef = useRef(null);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    let renderTask = null;

    const render = async () => {
      if (!doc || !canvasRef.current) return;
      try {
        setPageLoading(true);
        const page = await doc.getPage(pageNum);
        if (isCancelled) return;

        const unscaledViewport = page.getViewport({ scale: 1 });
        const availableWidth = Math.max(260, (containerWidth || 600) - 32);
        // Base fit-to-width scale
        const baseScale = availableWidth / unscaledViewport.width;
        const finalScale = Math.max(0.4, baseScale * zoom);

        const viewport = page.getViewport({ scale: finalScale });
        const dpr = window.devicePixelRatio || 1;

        const canvas = canvasRef.current;
        if (!canvas || isCancelled) return;

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const ctx = canvas.getContext("2d");
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);

        renderTask = page.render({
          canvasContext: ctx,
          viewport: viewport,
        });

        await renderTask.promise;
        if (!isCancelled) {
          setPageLoading(false);
        }
      } catch (err) {
        if (err?.name !== "RenderingCancelledException") {
          console.warn(`Error rendering page ${pageNum}:`, err);
        }
      }
    };

    render();

    return () => {
      isCancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch (e) {}
      }
    };
  }, [doc, pageNum, zoom, containerWidth]);

  return (
    <div className="relative flex flex-col items-center bg-card rounded-md shadow-md border overflow-hidden transition-shadow">
      {pageLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/30 z-10 min-h-[300px]">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
      <canvas ref={canvasRef} className="block max-w-full" />
      <div className="w-full text-center py-1 text-[11px] font-medium text-muted-foreground border-t bg-muted/40 select-none">
        Page {pageNum} of {doc.numPages}
      </div>
    </div>
  );
}

export default function DocumentPreviewDialog({ open, onOpenChange, item }) {
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [containerWidth, setContainerWidth] = useState(600);
  const [fallbackToIframe, setFallbackToIframe] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const containerRef = useRef(null);

  // Measure container width for responsive fit
  const updateWidth = useCallback(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth);
    }
  }, []);

  useEffect(() => {
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [updateWidth, open]);

  const rawUrl = item?.url || "";
  const title = item?.title || "Document Preview";
  const filename = item?.filename || `${title.replace(/[/\\?%*:|"<>]/g, "_")}.pdf`;

  const isImage = /\.(jpe?g|png|webp|gif|svg)$/i.test(rawUrl) || /\.(jpe?g|png|webp|gif|svg)$/i.test(filename);
  const isOfficeDoc = /\.(docx?|pptx?|xlsx?)$/i.test(rawUrl) || /\.(docx?|pptx?|xlsx?)$/i.test(filename);
  const isPdf = !isImage && !isOfficeDoc;

  const previewProxyUrl = `/api/download-file?url=${encodeURIComponent(rawUrl)}&filename=${encodeURIComponent(filename)}&inline=true`;
  const officeViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(rawUrl)}&embedded=true`;
  const downloadUrl = `/api/download-file?url=${encodeURIComponent(rawUrl)}&filename=${encodeURIComponent(filename)}`;

  const directPreviewUrl = isOfficeDoc ? officeViewerUrl : previewProxyUrl;

  // Load PDF when dialog opens
  useEffect(() => {
    if (!open || !rawUrl) {
      setPdfDoc(null);
      setLoading(true);
      setHasError(false);
      setFallbackToIframe(false);
      setZoom(1);
      return;
    }

    if (isImage) {
      setLoading(false);
      setHasError(false);
      return;
    }

    if (isOfficeDoc) {
      setLoading(false);
      setHasError(false);
      return;
    }

    // PDF direct loading via PDF.js for 100% native mobile & desktop rendering
    let cancelled = false;
    setLoading(true);
    setHasError(false);

    loadPdfJs()
      .then((pdfjs) => {
        if (cancelled || !pdfjs) return;

        // Fetch via proxy route or direct URL
        const loadingTask = pdfjs.getDocument({
          url: previewProxyUrl,
          withCredentials: false,
        });

        return loadingTask.promise;
      })
      .then((loadedDoc) => {
        if (cancelled || !loadedDoc) return;
        setPdfDoc(loadedDoc);
        setLoading(false);
        updateWidth();
      })
      .catch((err) => {
        console.warn("PDF.js direct view error, falling back:", err);
        if (!cancelled) {
          // Graceful fallback to iframe preview if PDF.js fails
          setFallbackToIframe(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, rawUrl, isImage, isOfficeDoc, previewProxyUrl, updateWidth]);

  const handlePrint = () => {
    setIsPrinting(true);
    try {
      if (isImage) {
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>${title}</title>
                <style>
                  body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
                  img { max-width: 100%; height: auto; }
                  @page { margin: 10mm; }
                </style>
              </head>
              <body>
                <img src="${rawUrl}" onload="window.print(); window.close();" />
              </body>
            </html>
          `);
          printWindow.document.close();
        }
        setIsPrinting(false);
        return;
      }

      // Load file into a hidden iframe and trigger system print dialog
      const printUrl = previewProxyUrl;
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.src = printUrl;

      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.warn("Direct iframe print blocked, opening in new window to print:", e);
            window.open(printUrl, "_blank")?.print();
          } finally {
            setIsPrinting(false);
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
            }, 60000);
          }
        }, 500);
      };

      iframe.onerror = () => {
        setIsPrinting(false);
        window.open(printUrl, "_blank")?.print();
      };

      document.body.appendChild(iframe);
    } catch (err) {
      console.error("Print error:", err);
      setIsPrinting(false);
      window.open(previewProxyUrl, "_blank");
    }
  };

  if (!rawUrl) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[88vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl [&>button.absolute]:hidden [&>button:has(.sr-only)]:hidden">
        {/* Top Header */}
        <DialogHeader className="px-3 sm:px-4 py-2.5 sm:py-3 border-b shrink-0 flex flex-row items-center justify-between gap-2 sm:gap-3 bg-muted/40">
          {/* File Title and Icon */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <DialogTitle className="text-xs sm:text-base font-semibold truncate text-foreground leading-tight">
              {title}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Preview document {title}
            </DialogDescription>
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Print Button */}
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs px-2.5"
              onClick={handlePrint}
              disabled={isPrinting}
              title="Print Document"
            >
              {isPrinting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Printer className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">Print</span>
            </Button>

            {/* Download Button */}
            <Button
              size="sm"
              variant="default"
              className="h-8 gap-1.5 text-xs px-2.5"
              asChild
            >
              <a href={downloadUrl} download={filename}>
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Download</span>
              </a>
            </Button>

            {/* Close Button: in same row, exactly same size as download button in mobile view */}
            <DialogClose asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs px-2.5"
                title="Close Preview"
              >
                <X className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Close</span>
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        {/* Preview Content Area */}
        <div
          ref={containerRef}
          className="relative flex-1 w-full min-h-0 bg-muted/10 overflow-y-auto overflow-x-hidden flex flex-col items-center"
        >
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground font-medium">
                Loading document preview...
              </p>
            </div>
          )}

          {hasError ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center gap-3">
              <div className="p-3 rounded-full bg-destructive/10 text-destructive">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h3 className="font-semibold text-base">Preview not available</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Your browser or file format does not support direct inline preview. You can download the file to view it on your device.
              </p>
              <Button asChild className="mt-2 gap-2" size="sm">
                <a href={downloadUrl} download={filename}>
                  <Download className="h-4 w-4" />
                  Download File
                </a>
              </Button>
            </div>
          ) : isImage ? (
            /* Direct Image Preview */
            <div className="flex-1 w-full h-full flex items-center justify-center p-4">
              <img
                src={rawUrl}
                alt={title}
                className="max-w-full max-h-[75vh] object-contain rounded-md shadow-md border bg-card"
                onLoad={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setHasError(true);
                }}
              />
            </div>
          ) : pdfDoc ? (
            /* Direct Native PDF Preview (Mobile & Desktop) */
            <div className="w-full flex flex-col items-center py-4 px-2 sm:px-4 space-y-4">
              {/* Zoom Toolbar */}
              <div className="sticky top-2 z-20 flex items-center gap-1 bg-background/90 backdrop-blur border shadow-md rounded-full px-2.5 py-1 text-xs select-none">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full"
                  onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.2).toFixed(1))))}
                  disabled={zoom <= 0.6}
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <span className="text-[11px] font-semibold px-1 min-w-[2.8rem] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full"
                  onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.2).toFixed(1))))}
                  disabled={zoom >= 2.2}
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <div className="h-3.5 w-[1px] bg-border mx-0.5" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px] rounded-full gap-1"
                  onClick={() => setZoom(1)}
                  title="Reset Zoom"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Fit</span>
                </Button>
                <div className="h-3.5 w-[1px] bg-border mx-0.5" />
                <span className="text-[11px] text-muted-foreground px-1">
                  {pdfDoc.numPages} {pdfDoc.numPages === 1 ? "page" : "pages"}
                </span>
              </div>

              {/* Render All Pages */}
              {Array.from({ length: pdfDoc.numPages }, (_, idx) => (
                <PdfPageItem
                  key={idx + 1}
                  doc={pdfDoc}
                  pageNum={idx + 1}
                  zoom={zoom}
                  containerWidth={containerWidth}
                />
              ))}
            </div>
          ) : fallbackToIframe || isOfficeDoc ? (
            /* Fallback or Office Docs Iframe Preview */
            <iframe
              src={directPreviewUrl}
              className="w-full h-full border-0"
              title={title}
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setHasError(true);
              }}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
