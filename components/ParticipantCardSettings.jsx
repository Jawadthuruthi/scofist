"use client";

import React, { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import FormComponent from "@/components/FormComponent";
import { useRouter } from "next/navigation";

const participantsCardFormField = [
  {
    name: "participantsCard",
    label: "Participants Card Background",
    inputType: "image",
    type: "object",
    className: "col-span-2",
    maxFileSize: 2 * 1024 * 1024,
    allowedTypes: ["image/svg+xml", "image/png", "image/jpeg", "image/jpg"],
    defaultValue: {},
    aspectRatio: "1:1.4",
    minWidth: 600,
    minHeight: 840,
  },
  {
    name: "textColor",
    label: "Text Color",
    type: "color",
    className: "col-span-1",
  },
  {
    name: "top",
    label: "Top Margin",
    type: "number",
    validators: {
      min: 0,
      max: 100,
    },
    className: "col-span-1",
  },
  {
    name: "bottom",
    label: "Bottom Margin",
    type: "number",
    validators: {
      min: 0,
      max: 100,
    },
    className: "col-span-1",
  },
  {
    name: "left",
    label: "Left Margin",
    type: "number",
    validators: {
      min: 0,
      max: 100,
    },
    className: "col-span-1",
  },
  {
    name: "right",
    label: "Right Margin",
    type: "number",
    validators: {
      min: 0,
      max: 100,
    },
    className: "col-span-1",
  },
  {
    name: "saveButton",
    label: "\u00A0",
    inputType: "submit",
    buttonText: "Save Changes",
    className: "col-span-1",
  },
];

export default function ParticipantCardSettings({ festivalSettings, apiKey }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Extract settings for the form
  const formData = {
    participantsCard: festivalSettings?.participantsCard?.backgroundImage || {},
    textColor: festivalSettings?.participantsCard?.textColor || "#000000",
    top: festivalSettings?.participantsCard?.textPositions?.top || 0,
    right: festivalSettings?.participantsCard?.textPositions?.right || 0,
    bottom: festivalSettings?.participantsCard?.textPositions?.bottom || 0,
    left: festivalSettings?.participantsCard?.textPositions?.left || 0,
  };

  const handleSuccess = () => {
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden rounded-2xl">
        <div className="flex items-center gap-3 px-5 py-4 border-b bg-blue-500/10 dark:bg-blue-500/20">
          <div className="p-2 rounded-lg bg-blue-500/20 dark:bg-blue-500/30">
            <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <DialogTitle className="font-semibold text-lg flex-1 m-0 text-foreground">
            Participant Card Settings
          </DialogTitle>
        </div>
        <div className="p-5 overflow-y-auto max-h-[70vh]">
          <FormComponent
            formFields={participantsCardFormField}
            apiKey={apiKey}
            data={formData}
            resource="settings"
            removeCardWrapper={true}
            onSuccess={handleSuccess}
            hideDefaultSubmit={true}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
