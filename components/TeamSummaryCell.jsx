"use client";
import { useState, useRef } from "react";
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

export default function TeamSummaryCell({ team }) {
  const [open, setOpen] = useState(false);
  const popupRef = useRef(null);
  const { handleDownload } = useDownloadPopup(popupRef, `Team_Summary_${team?.name}.jpeg`);

  if (!team) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-primary hover:underline font-medium text-left">
          {team.name}
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
              Team Summary: <span className="text-primary">{team.name}</span>
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
              <p className="text-sm text-muted-foreground">Team ID</p>
              <p className="font-medium">{team._id}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Color</p>
              <div className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full border border-black/10 shadow-inner" 
                  style={{ backgroundColor: team.color || "#ccc" }} 
                />
                <span className="font-medium text-sm">{team.color || "None"}</span>
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Team Leader</p>
              <p className="font-medium">{team.leaderName || "-"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Members Count</p>
              <p className="font-medium">{team.membersCount || 0}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
