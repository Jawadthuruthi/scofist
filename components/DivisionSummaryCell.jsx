"use client";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Info, X } from "lucide-react";
import { useDownloadPopup } from "@/hooks/useDownloadPopup";

export default function DivisionSummaryCell({ division }) {
  const [open, setOpen] = useState(false);
  const popupRef = useRef(null);
  const { handleDownload } = useDownloadPopup(popupRef, `Division_Summary_${division?._id}.jpeg`);

  if (!division) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-primary hover:underline font-medium text-left">
          {division._id}
        </button>
      </DialogTrigger>
      <DialogContent 
        ref={popupRef} 
        data-html2canvas-popup="true" 
        className="sm:max-w-md flex flex-col p-0 gap-0 overflow-hidden [&>button.absolute]:hidden"
      >
        <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-primary/5 dark:bg-primary/10 sticky top-0 z-20 backdrop-blur-md shrink-0 text-left">
          <button 
            type="button"
            className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors focus:outline-none cursor-pointer shrink-0"
            onClick={handleDownload}
            title="Download Image"
            data-html2canvas-ignore="true"
          >
            <Info className="h-5 w-5 text-primary" />
          </button>
          <div className="flex-1 text-left space-y-0.5">
            <DialogTitle className="text-xl font-bold m-0 text-foreground">
              Division Summary: <span className="text-primary">{division.name}</span>
            </DialogTitle>
          </div>
          <DialogClose 
            className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none" 
            onClick={() => setOpen(false)} 
            data-html2canvas-ignore="true"
          >
            <X className="h-5 w-5" />
          </DialogClose>
        </DialogHeader>
        <div className="space-y-4 px-5 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Division ID</p>
              <p className="font-medium">{division._id}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Type</p>
              <Badge variant={division.type === "Primary" ? "default" : "secondary"}>
                {division.type}
              </Badge>
            </div>
          </div>
          
          <Separator />
          
          {division.type === "Primary" ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Stage Events</p>
                <p className="font-medium">{division.stageEvents || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Off-Stage Events</p>
                <p className="font-medium">{division.offStageEvents || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Chest No. Starts At</p>
                <p className="font-medium">
                  {division.chestNumberRange?.from 
                    ? `${division.chestNumberRange.from} - ${division.chestNumberRange.to}`
                    : division.chestNumberStartsAt || "-"}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Sub Divisions</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {division.subDivisionsName?.length > 0 ? (
                  division.subDivisionsName.map((sub, i) => (
                    <Badge key={i} variant="outline">{sub}</Badge>
                  ))
                ) : (
                  <span className="text-sm font-medium">-</span>
                )}
              </div>
            </div>
          )}

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Participants</p>
              <p className="font-medium text-lg">{division.participantsCount || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Programs</p>
              <p className="font-medium text-lg">{division.programsCount || 0}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
