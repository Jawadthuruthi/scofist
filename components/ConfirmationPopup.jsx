"use client";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

import { Loader, Trash, AlertTriangle, X } from "lucide-react";
import { capitalize } from "lodash";
import { Input } from "./ui/input";
import { useDownloadPopup } from "@/hooks/useDownloadPopup";

export default function ConfirmationPopup({
  loading = false,
  action,
  title,
  icon,
  onClick,
  triggerClass,
  confirmText = "",
  disabled = false,
}) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const popupRef = React.useRef(null);
  const { handleDownload } = useDownloadPopup(popupRef, `Confirmation_${title.replace(/\s+/g, '_')}.jpeg`);

  const handleClick = React.useCallback(async () => {
    try {
      await onClick();
      setOpen(false);
      setInputValue("");
    } catch (error) {
      console.error(error.message);
    }
  }, [onClick]);

  const isConfirmDisabled = confirmText && inputValue !== confirmText;

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) setInputValue("");
    }}>
      <DialogTrigger asChild>
        <Button variant={triggerClass ? "default" : "outline"} className={triggerClass} disabled={disabled}>
          {icon || <Trash />}
        </Button>
      </DialogTrigger>
      <DialogContent ref={popupRef} data-html2canvas-popup="true" className="sm:max-w-lg flex flex-col p-0 gap-0 [&>button.absolute]:hidden overflow-hidden rounded-2xl">
        <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md shrink-0">
          <button 
            type="button"
            className="p-2 rounded-lg bg-destructive/10 shrink-0 hover:bg-destructive/20 transition-colors focus:outline-none cursor-pointer"
            onClick={handleDownload}
            title="Download Image"
            data-html2canvas-ignore="true"
          >
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </button>
          <div className="flex-1 text-left space-y-0.5">
            <DialogTitle className="text-xl font-bold m-0 text-foreground">
              {title}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-sm text-muted-foreground m-0">
                Are you sure you want to {action.toLowerCase()} this?
              </div>
            </DialogDescription>
          </div>
          <div className="flex items-center gap-1 sm:gap-2" data-html2canvas-ignore="true">
            <DialogClose className="p-1.5 -mr-1.5 ml-1 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none">
              <X className="h-5 w-5" />
            </DialogClose>
          </div>
        </DialogHeader>
        <div className="p-5 flex flex-col gap-4">
          {confirmText && (
            <div className="space-y-2">
              <p className="text-foreground font-medium text-sm">
                Please type <span className="font-bold text-destructive select-none">{confirmText}</span> to confirm.
              </p>
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={`Type ${confirmText} here`}
                className="border-destructive/30 focus-visible:ring-destructive"
                autoFocus
              />
            </div>
          )}
          <div className="flex justify-between gap-4 mt-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="outline"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/80 hover:text-destructive-foreground flex-1"
              onClick={handleClick}
              disabled={loading || isConfirmDisabled}
            >
              {loading ? (
                <Loader className="animate-spin mr-2" />
              ) : (
                capitalize(action)
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
