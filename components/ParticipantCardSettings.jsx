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
import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";

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
    name: "top",
    label: "Top Margin (%)",
    inputType: "number-nav",
    type: "number",
    validators: {
      min: 0,
      max: 100,
    },
    className: "col-span-1",
  },
  {
    name: "bottom",
    label: "Bottom Margin (%)",
    inputType: "number-nav",
    type: "number",
    validators: {
      min: 0,
      max: 100,
    },
    className: "col-span-1",
  },
  {
    name: "left",
    label: "Left Margin (%)",
    inputType: "number-nav",
    type: "number",
    validators: {
      min: 0,
      max: 100,
    },
    className: "col-span-1",
  },
  {
    name: "right",
    label: "Right Margin (%)",
    inputType: "number-nav",
    type: "number",
    validators: {
      min: 0,
      max: 100,
    },
    className: "col-span-1",
  },
  {
    name: "textColor",
    label: "Text Color",
    type: "color",
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

  const renderPreview = (formValues) => {
    // Merge form values with initial values to ensure preview always works
    const bgUrl = formValues?.participantsCard?.url ?? formData.participantsCard?.url ?? "";
    const textColor = formValues?.textColor ?? formData.textColor ?? "#000000";
    const left = formValues?.left ?? formData.left ?? 0;
    const right = formValues?.right ?? formData.right ?? 0;
    const bottom = formValues?.bottom ?? formData.bottom ?? 0;
    const top = formValues?.top ?? formData.top;

    return (
      <div className="w-full max-w-[300px] flex-shrink-0 sticky top-0">
        <h3 className="text-sm font-semibold mb-3 text-center text-muted-foreground">Live Preview</h3>
        <div 
          className={`w-full aspect-[1/1.4] relative rounded-lg overflow-hidden shadow-lg border border-border z-0 ${!bgUrl ? 'bg-card' : ''}`}
        >
          {bgUrl && (
            <img
              src={bgUrl}
              alt="Background Preview"
              className="absolute inset-0 w-full h-full object-cover z-0"
            />
          )}
          
          {/* Participant Details */}
          <div
            className="absolute text-center z-10"
            style={{
              left: left !== "" && !isNaN(left) ? `${left}%` : "0%",
              right: right !== "" && !isNaN(right) ? `${right}%` : "0%",
              bottom: bottom !== "" && !isNaN(bottom) ? `${bottom}%` : "0%",
              ...(top !== "" && !isNaN(top) && top != 0 ? { top: `${top}%` } : {})
            }}
          >
            {/* Chest Number */}
            <div className="">
              <h2 
                className="text-lg font-bold" 
                style={{ 
                  color: textColor,
                  textShadow: '-2px -2px 0 rgba(0,0,0,0.8), 2px -2px 0 rgba(0,0,0,0.8), -2px 2px 0 rgba(0,0,0,0.8), 2px 2px 0 rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.8)'
                }}
              >
                101
              </h2>
            </div>
            
            {/* Participant Name */}
            <div className="">
              <h3 
                className="font-bold text-base" 
                style={{ 
                  color: textColor,
                  textShadow: '-2px -2px 0 rgba(0,0,0,0.8), 2px -2px 0 rgba(0,0,0,0.8), -2px 2px 0 rgba(0,0,0,0.8), 2px 2px 0 rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.8)'
                }}
              >
                John Doe
              </h3>
            </div>
            
            {/* Team and Division */}
            <div className="text-xs text-center flex flex-col items-center">
              <div className="backdrop-blur-[4px] saturate-[1.8]">
                <p 
                  className="font-semibold" 
                  style={{ 
                    color: textColor,
                    textShadow: '-2px -2px 0 rgba(0,0,0,0.8), 2px -2px 0 rgba(0,0,0,0.8), -2px 2px 0 rgba(0,0,0,0.8), 2px 2px 0 rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.8)'
                  }}
                >
                  TEAM: ALFA
                </p>
              </div>
              <div className="backdrop-blur-[4px] saturate-[1.8] mb-1">
                <p 
                  className="font-semibold" 
                  style={{ 
                    color: textColor,
                    textShadow: '-2px -2px 0 rgba(0,0,0,0.8), 2px -2px 0 rgba(0,0,0,0.8), -2px 2px 0 rgba(0,0,0,0.8), 2px 2px 0 rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.8)'
                  }}
                >
                  DIVISION: SENIOR
                </p>
              </div>
              {/* Barcode */}
              <div className="bg-white px-2 py-0.5 rounded shadow-sm inline-block">
                <Barcode
                  value="101"
                  width={1.2}
                  height={25}
                  displayValue={false}
                  margin={0}
                  background="transparent"
                />
              </div>
            </div>
          </div>
          
          {/* QR Codes mock */}
          <div className="absolute bottom-3 left-3 bg-white p-1 rounded shadow-md border border-gray-200 flex flex-col items-center z-10">
            <QRCodeSVG value="https://example.com/programs" size={45} />
            <span className="text-[9px] font-bold mt-0.5 text-gray-800 uppercase tracking-tight">Programs</span>
          </div>
          <div className="absolute bottom-3 right-3 bg-white p-1 rounded shadow-md border border-gray-200 flex flex-col items-center z-10">
            <QRCodeSVG value="https://example.com/results" size={45} />
            <span className="text-[9px] font-bold mt-0.5 text-gray-800 uppercase tracking-tight">Results</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] p-0 gap-0 overflow-hidden rounded-2xl">
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
            renderPreview={renderPreview}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
