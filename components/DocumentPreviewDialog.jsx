
"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Download, Loader2, FileText, AlertCircle } from "lucide-react";

export default function DocumentPreviewDialog({ open, onOpenChange, item }) {
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  React.useEffect(() => {
    if (open && item?.url) {
      setLoading(true);
      setHasError(false);

      // Timeout fallback in case document or browser plugin does not fire onLoad
      const timer = setTimeout(() => {
        setLoading(false);
      }, 7000);

      return () => clearTimeout(timer);
    }
  }, [open, item?.url]);

  if (!item?.url) return null;

  const title = item.title || "Document Preview";
  const rawUrl = item.url;

  // Clean filename for download and display
  const filename = item.filename || `${title.replace(/[/\\?%*:|"<>]/g, "_")}.pdf`;

  // Check if explicitly non-pdf (e.g. .docx, .doc, .ppt, .pptx)
  const isOfficeDoc = /\.(docx?|pptx?|xlsx?)$/i.test(rawUrl) || /\.(docx?|pptx?|xlsx?)$/i.test(filename);

  // Use internal proxy with inline=true for PDF / general files
  // For office files, use Google Docs viewer as fallback
  const previewUrl = isOfficeDoc
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(rawUrl)}&embedded=true`
    : `/api/download-file?url=${encodeURIComponent(rawUrl)}&filename=${encodeURIComponent(filename)}&inline=true`;

  const downloadUrl = `/api/download-file?url=${encodeURIComponent(rawUrl)}&filename=${encodeURIComponent(filename)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[88vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl">
        <DialogHeader className="px-4 py-3 border-b shrink-0 flex flex-row items-center justify-between gap-3 bg-muted/40 pr-12">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <DialogTitle className="text-sm sm:text-base font-semibold truncate text-foreground">
              {title}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Preview document {title}
            </DialogDescription>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs px-2.5"
              asChild
            >
              <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New Tab</span>
              </a>
            </Button>
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
          </div>
        </DialogHeader>

        <div className="relative flex-1 w-full min-h-0 bg-muted/10">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground font-medium">Loading preview...</p>
            </div>
          )}

          {hasError ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center gap-3">
              <div className="p-3 rounded-full bg-destructive/10 text-destructive">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h3 className="font-semibold text-base">Preview not available</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Your browser or file format does not support inline preview. You can download the file to view it on your device.
              </p>
              <Button asChild className="mt-2 gap-2" size="sm">
                <a href={downloadUrl} download={filename}>
                  <Download className="h-4 w-4" />
                  Download File
                </a>
              </Button>
            </div>
          ) : (
            <iframe
              src={previewUrl}
              className="w-full h-full border-0"
              title={title}
              onLoad={() => setLoading(false)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
