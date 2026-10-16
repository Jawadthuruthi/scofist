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
import { cn } from "@/lib/utils";

export default function ConfirmationPopup({
  loading = false,
  action = "delete",
  title = "Delete Confirmation",
  description,
  icon,
  onClick,
  triggerClass,
  triggerVariant,
  confirmText = "",
  disabled = false,
  contentClassName = "",
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  children,
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const [internalLoading, setInternalLoading] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = React.useCallback(
    (val) => {
      if (isControlled) {
        controlledOnOpenChange?.(val);
      } else {
        setUncontrolledOpen(val);
      }
      if (!val) setInputValue("");
    },
    [isControlled, controlledOnOpenChange]
  );

  const popupRef = React.useRef(null);
  const safeTitle = typeof title === "string" && title ? title : "confirmation";
  const { handleDownload } = useDownloadPopup(
    popupRef,
    `Confirmation_${safeTitle.replace(/\s+/g, "_")}.jpeg`
  );

  const handleClick = React.useCallback(async () => {
    try {
      setInternalLoading(true);
      await onClick?.();
      setOpen(false);
      setInputValue("");
    } catch (error) {
      console.error(error.message);
    } finally {
      setInternalLoading(false);
    }
  }, [onClick, setOpen]);

  const isConfirmDisabled = confirmText && inputValue !== confirmText;
  const isBusy = loading || internalLoading;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children ? (
        <DialogTrigger asChild disabled={disabled}>
          {children}
        </DialogTrigger>
      ) : !isControlled ? (
        <DialogTrigger asChild>
          <Button
            variant={triggerVariant || (triggerClass ? "default" : "outline")}
            className={triggerClass}
            disabled={disabled}
          >
            {icon || <Trash />}
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent
        ref={popupRef}
        data-html2canvas-popup="true"
        className={cn(
          "sm:max-w-lg flex flex-col p-0 gap-0 [&>button.absolute]:hidden overflow-hidden rounded-2xl",
          contentClassName
        )}
      >
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
          <div className="flex-1 text-left space-y-0.5 min-w-0">
            <DialogTitle className="text-xl font-bold m-0 text-foreground">
              {title}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-sm text-muted-foreground m-0">
                {description ||
                  `Are you sure you want to ${action ? action.toLowerCase() : "delete"} this?`}
              </div>
            </DialogDescription>
          </div>
          <div
            className="flex items-center gap-1 sm:gap-2"
            data-html2canvas-ignore="true"
          >
            <DialogClose
              onClick={() => setOpen(false)}
              className="p-1.5 -mr-1.5 ml-1 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none"
            >
              <X className="h-5 w-5" />
            </DialogClose>
          </div>
        </DialogHeader>
        <div className="p-5 flex flex-col gap-4">
          {confirmText && (
            <div className="space-y-2">
              <p className="text-foreground font-medium text-sm">
                Please type{" "}
                <span className="font-bold text-destructive select-none">
                  {confirmText}
                </span>{" "}
                to confirm.
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
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
              disabled={isBusy}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/80 hover:text-destructive-foreground flex-1"
              onClick={handleClick}
              disabled={isBusy || isConfirmDisabled}
            >
              {isBusy ? (
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
