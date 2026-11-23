"use client";

import React from "react";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { ScanBarcode, X, Loader2 } from "lucide-react";

const BarcodeScanner = dynamic(() => import("@/components/BarcodeScanner"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center p-8 space-y-3">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Loading camera scanner...</p>
    </div>
  ),
});

export default function BarcodeScannerModal({
  open,
  onOpenChange,
  title = "Scan Barcode",
  description = "Position student card or barcode in camera view",
  icon,
  onScan,
  onClose,
  onError,
  hint,
}) {
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
    if (onOpenChange) {
      onOpenChange(false);
    }
  };

  const handleOpenChange = (newOpen) => {
    if (!newOpen && onClose) {
      onClose();
    }
    if (onOpenChange) {
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-md p-0 gap-0 overflow-y-auto rounded-2xl max-h-[85vh] sm:max-h-[90vh] flex flex-col [&>button.absolute]:hidden border shadow-2xl">
        <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-background/95 dark:bg-background/95 backdrop-blur-md sticky top-0 z-20 shrink-0">
          <div className="p-2 rounded-lg bg-blue-500/20 dark:bg-blue-500/30 text-blue-600 dark:text-blue-400 shrink-0">
            {icon || <ScanBarcode className="w-5 h-5" />}
          </div>
          <div className="flex-1 text-left space-y-0.5 min-w-0">
            <DialogTitle className="text-xl font-bold m-0 text-foreground">
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription asChild>
                <div className="text-sm text-muted-foreground m-0">
                  {description}
                </div>
              </DialogDescription>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <DialogClose asChild>
              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 -mr-1.5 ml-1 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer"
                aria-label="Close scanner"
              >
                <X className="h-5 w-5" />
              </button>
            </DialogClose>
          </div>
        </DialogHeader>
        <div className="p-5">
          {open && (
            <BarcodeScanner
              onScan={(result) => {
                if (onScan) {
                  onScan(result);
                }
              }}
              onClose={handleClose}
              onError={onError}
              hint={hint}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
