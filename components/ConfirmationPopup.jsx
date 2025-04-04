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
} from "@/components/ui/dialog";

import { Loader2, Trash } from "lucide-react";
import { capitalize } from "lodash";

export default function ConfirmationPopup({
  loading = false,
  action,
  title,
  onClick,
}) {
  const [open, setOpen] = React.useState(false);

  const handleClick = React.useCallback(async () => {
    try {
      await onClick();
      setOpen(false);
    } catch (error) {
      console.error(error.message);
    }
  }, [onClick]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Trash />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[80vw] max-w-[425px] mx-auto rounded-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Are you sure you want to {action.toLowerCase()} this?
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="outline"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/80 hover:text-destructive-foreground"
            onClick={handleClick}
          >
            {loading ? (
              <Loader2 className="animate-spin mr-2" />
            ) : (
              capitalize(action)
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
