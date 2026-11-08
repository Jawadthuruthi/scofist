"use client";

import React, { useState, useRef, useEffect } from "react";
import { Settings, Save, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "next/navigation";
import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import ImageUploader from "./ImageUploader";

const FONT_OPTIONS = [
  { label: "Sans-serif", value: "sans-serif" },
  { label: "Serif", value: "serif" },
  { label: "Monospace", value: "monospace" },
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Montserrat", value: "'Montserrat', sans-serif" },
  { label: "Noto Sans Malayalam", value: "'Noto Sans Malayalam', sans-serif" },
];

const DEFAULT_LAYOUT = {
  chestNumber: { x: 50, y: 40, visible: true, fontSize: 24, fontFamily: "sans-serif", color: "#000000", fontWeight: "bold", textAlign: "center" },
  participantName: { x: 50, y: 50, visible: true, fontSize: 18, fontFamily: "sans-serif", color: "#000000", fontWeight: "bold", textAlign: "center" },
  team: { x: 50, y: 60, visible: true, fontSize: 12, fontFamily: "sans-serif", color: "#000000", fontWeight: "600", textAlign: "center" },
  division: { x: 50, y: 65, visible: true, fontSize: 12, fontFamily: "sans-serif", color: "#000000", fontWeight: "600", textAlign: "center" },
  programQR: { x: 15, y: 85, visible: true, size: 45 },
  resultQR: { x: 85, y: 85, visible: true, size: 45 },
  barcode: { x: 50, y: 75, visible: true, width: 1.2, height: 25 },
  festivalName: { x: 50, y: 10, visible: true, fontSize: 16, fontFamily: "sans-serif", color: "#000000", fontWeight: "bold", textAlign: "center" },
};

const ELEMENTS = [
  { id: "chestNumber", label: "Chest Number" },
  { id: "participantName", label: "Participant Name" },
  { id: "team", label: "Team" },
  { id: "division", label: "Division" },
  { id: "programQR", label: "Program QR Code" },
  { id: "resultQR", label: "Result QR Code" },
  { id: "barcode", label: "Barcode" },
  { id: "festivalName", label: "Festival Name" },
];

export default function ParticipantCardSettings({ festivalSettings, apiKey, teams = [], onSaveSuccess }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  
  const [isSaving, setIsSaving] = useState(false);
  const [activeElement, setActiveElement] = useState("chestNumber");
  
  const [backgroundImage, setBackgroundImage] = useState(
    festivalSettings?.participantsCard?.backgroundImage || {}
  );
  const [teamBackgrounds, setTeamBackgrounds] = useState(
    festivalSettings?.participantsCard?.teamBackgrounds || {}
  );
  const [selectedTeamBg, setSelectedTeamBg] = useState("default");
  
  const [layout, setLayout] = useState(() => {
    const savedLayout = festivalSettings?.participantsCard?.layout;
    if (savedLayout && Object.keys(savedLayout).length > 0) {
      return { ...DEFAULT_LAYOUT, ...savedLayout };
    }
    return DEFAULT_LAYOUT;
  });

  const previewRef = useRef(null);
  const [dragState, setDragState] = useState(null);

  useEffect(() => {
    if (open) {
      setBackgroundImage(festivalSettings?.participantsCard?.backgroundImage || {});
      setTeamBackgrounds(festivalSettings?.participantsCard?.teamBackgrounds || {});
      const savedLayout = festivalSettings?.participantsCard?.layout;
      setLayout(savedLayout && Object.keys(savedLayout).length > 0 ? { ...DEFAULT_LAYOUT, ...savedLayout } : DEFAULT_LAYOUT);
    }
  }, [open, festivalSettings]);

  const handleUpdateElement = (field, value, elementId = activeElement) => {
    setLayout(prev => ({
      ...prev,
      [elementId]: {
        ...prev[elementId],
        [field]: value
      }
    }));
  };

  const handleDragStart = (e, elementId) => {
    if (e.type === "mousedown" && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    setActiveElement(elementId);

    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    
    const clientX = e.type === "touchstart" ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === "touchstart" ? e.touches[0].clientY : e.clientY;

    setDragState({
      id: elementId,
      startX: clientX,
      startY: clientY,
      initialPercentX: layout[elementId].x,
      initialPercentY: layout[elementId].y,
      rectWidth: rect.width,
      rectHeight: rect.height
    });
  };

  useEffect(() => {
    const handleMove = (e) => {
      if (!dragState) return;

      const clientX = e.type === "touchmove" ? e.touches[0].clientX : e.clientX;
      const clientY = e.type === "touchmove" ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - dragState.startX;
      const deltaY = clientY - dragState.startY;

      const deltaPercentX = (deltaX / dragState.rectWidth) * 100;
      const deltaPercentY = (deltaY / dragState.rectHeight) * 100;

      let newX = Math.round(dragState.initialPercentX + deltaPercentX);
      let newY = Math.round(dragState.initialPercentY + deltaPercentY);

      newX = Math.max(0, Math.min(100, newX));
      newY = Math.max(0, Math.min(100, newY));

      setLayout(prev => ({
        ...prev,
        [dragState.id]: {
          ...prev[dragState.id],
          x: newX,
          y: newY
        }
      }));
    };

    const handleUp = () => {
      if (dragState) {
        setDragState(null);
      }
    };

    if (dragState) {
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
      window.addEventListener("touchmove", handleMove, { passive: false });
      window.addEventListener("touchend", handleUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
    };
  }, [dragState]);

  // Keyboard navigation for active element
  useEffect(() => {
    if (!open) return; // Only listen if dialog is open
    
    const handleKeyDown = (e) => {
      // Don't move if user is typing in an input
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") {
        return;
      }
      
      let deltaX = 0;
      let deltaY = 0;
      
      switch (e.key) {
        case "ArrowUp":
          deltaY = -1;
          break;
        case "ArrowDown":
          deltaY = 1;
          break;
        case "ArrowLeft":
          deltaX = -1;
          break;
        case "ArrowRight":
          deltaX = 1;
          break;
        default:
          return;
      }
      
      e.preventDefault(); // Prevent scrolling
      
      if (e.shiftKey) {
        deltaX *= 5;
        deltaY *= 5;
      }
      
      setLayout(prev => {
        const current = prev[activeElement];
        if (!current) return prev;
        
        let newX = Math.round(current.x + deltaX);
        let newY = Math.round(current.y + deltaY);
        
        newX = Math.max(0, Math.min(100, newX));
        newY = Math.max(0, Math.min(100, newY));
        
        return {
          ...prev,
          [activeElement]: {
            ...current,
            x: newX,
            y: newY
          }
        };
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeElement, open]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantsCard: backgroundImage,
          teamBackgrounds: teamBackgrounds,
          participantsCardLayout: layout
        }),
      });

      if (!response.ok) throw new Error("Failed to save settings");
      
      toast.success("Participant card settings saved!");
      setOpen(false);
      
      if (onSaveSuccess) {
        onSaveSuccess({
          backgroundImage,
          teamBackgrounds,
          layout
        });
      }
      
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Error saving settings");
    } finally {
      setIsSaving(false);
    }
  };

  const getElementStyle = (elementId) => {
    const isSelected = activeElement === elementId;
    return {
      left: `${layout[elementId].x}%`,
      top: `${layout[elementId].y}%`,
      cursor: "move",
      outline: isSelected ? "2px dashed #3b82f6" : "2px dashed transparent",
      outlineOffset: "2px",
      transition: dragState ? "none" : "outline 0.2s",
      zIndex: isSelected ? 20 : 10,
    };
  };

  const renderPreview = () => {
    let bgUrl = backgroundImage?.url;
    if (selectedTeamBg !== "default" && teamBackgrounds[selectedTeamBg]?.url) {
      bgUrl = teamBackgrounds[selectedTeamBg].url;
    }

    return (
      <div className="w-full max-w-[300px] flex-shrink-0 mx-auto">
        <div className="mb-3">
          <Select value={selectedTeamBg} onValueChange={setSelectedTeamBg}>
            <SelectTrigger className="w-full bg-white border-gray-200 dark:bg-neutral-950 dark:border-neutral-700">
              <SelectValue placeholder="Default Background" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default Background</SelectItem>
              {teams.map(t => (
                <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div 
          ref={previewRef}
          className={`w-full aspect-[1/1.4] relative rounded-lg overflow-hidden shadow-lg border border-border bg-white z-0 touch-none select-none`}
        >
          {bgUrl && (
            <img
              src={bgUrl}
              alt="Background Preview"
              className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
              draggable={false}
            />
          )}
          
          <div className="absolute inset-0 z-10 w-full h-full">
            {/* Festival Name */}
            {layout.festivalName.visible && (
              <div 
                onMouseDown={(e) => handleDragStart(e, "festivalName")}
                onTouchStart={(e) => handleDragStart(e, "festivalName")}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 whitespace-nowrap"
                style={{
                  ...getElementStyle("festivalName"),
                  fontSize: `${layout.festivalName.fontSize}px`,
                  fontFamily: layout.festivalName.fontFamily,
                  color: layout.festivalName.color,
                  fontWeight: layout.festivalName.fontWeight,
                  textAlign: layout.festivalName.textAlign,
                  textShadow: '-2px -2px 0 rgba(255,255,255,0.5), 2px -2px 0 rgba(255,255,255,0.5), -2px 2px 0 rgba(255,255,255,0.5), 2px 2px 0 rgba(255,255,255,0.5)',
                }}
              >
                ESPERANZA '25
              </div>
            )}
            
            {/* Chest Number */}
            {layout.chestNumber.visible && (
              <div 
                onMouseDown={(e) => handleDragStart(e, "chestNumber")}
                onTouchStart={(e) => handleDragStart(e, "chestNumber")}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 whitespace-nowrap"
                style={{
                  ...getElementStyle("chestNumber"),
                  fontSize: `${layout.chestNumber.fontSize}px`,
                  fontFamily: layout.chestNumber.fontFamily,
                  color: layout.chestNumber.color,
                  fontWeight: layout.chestNumber.fontWeight,
                  textAlign: layout.chestNumber.textAlign,
                }}
              >
                101
              </div>
            )}

            {/* Participant Name */}
            {layout.participantName.visible && (
              <div 
                onMouseDown={(e) => handleDragStart(e, "participantName")}
                onTouchStart={(e) => handleDragStart(e, "participantName")}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 w-[95%] whitespace-normal leading-tight break-words text-center"
                style={{
                  ...getElementStyle("participantName"),
                  fontSize: `${layout.participantName.fontSize}px`,
                  fontFamily: layout.participantName.fontFamily,
                  color: layout.participantName.color,
                  fontWeight: layout.participantName.fontWeight,
                  textAlign: layout.participantName.textAlign,
                }}
              >
                JOHN DOE
              </div>
            )}

            {/* Team */}
            {layout.team.visible && (
              <div 
                onMouseDown={(e) => handleDragStart(e, "team")}
                onTouchStart={(e) => handleDragStart(e, "team")}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 whitespace-nowrap"
                style={{
                  ...getElementStyle("team"),
                  fontSize: `${layout.team.fontSize}px`,
                  fontFamily: layout.team.fontFamily,
                  color: layout.team.color,
                  fontWeight: layout.team.fontWeight,
                  textAlign: layout.team.textAlign,
                }}
              >
                ALFA
              </div>
            )}

            {/* Division */}
            {layout.division.visible && (
              <div 
                onMouseDown={(e) => handleDragStart(e, "division")}
                onTouchStart={(e) => handleDragStart(e, "division")}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 whitespace-nowrap"
                style={{
                  ...getElementStyle("division"),
                  fontSize: `${layout.division.fontSize}px`,
                  fontFamily: layout.division.fontFamily,
                  color: layout.division.color,
                  fontWeight: layout.division.fontWeight,
                  textAlign: layout.division.textAlign,
                }}
              >
                SENIOR
              </div>
            )}

            {/* Barcode */}
            {layout.barcode.visible && (
              <div 
                onMouseDown={(e) => handleDragStart(e, "barcode")}
                onTouchStart={(e) => handleDragStart(e, "barcode")}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-white px-2 py-0.5 rounded shadow-sm inline-block"
                style={getElementStyle("barcode")}
              >
                <Barcode
                  value="101"
                  width={layout.barcode.width || 1.2}
                  height={layout.barcode.height || 25}
                  displayValue={false}
                  margin={0}
                  background="transparent"
                />
              </div>
            )}
            
            {/* Program QR */}
            {layout.programQR.visible && (
              <div 
                onMouseDown={(e) => handleDragStart(e, "programQR")}
                onTouchStart={(e) => handleDragStart(e, "programQR")}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-white p-1 rounded shadow-md border border-gray-200 flex flex-col items-center pointer-events-auto"
                style={getElementStyle("programQR")}
              >
                <QRCodeSVG value="https://example.com/programs" size={layout.programQR.size || 45} />
                <span className="text-[9px] font-bold mt-0.5 text-gray-800 uppercase tracking-tight" style={{ fontSize: (layout.programQR.size || 45) * 0.2 }}>Programs</span>
              </div>
            )}

            {/* Result QR */}
            {layout.resultQR.visible && (
              <div 
                onMouseDown={(e) => handleDragStart(e, "resultQR")}
                onTouchStart={(e) => handleDragStart(e, "resultQR")}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-white p-1 rounded shadow-md border border-gray-200 flex flex-col items-center pointer-events-auto"
                style={getElementStyle("resultQR")}
              >
                <QRCodeSVG value="https://example.com/results" size={layout.resultQR.size || 45} />
                <span className="text-[9px] font-bold mt-0.5 text-gray-800 uppercase tracking-tight" style={{ fontSize: (layout.resultQR.size || 45) * 0.2 }}>Results</span>
              </div>
            )}
          </div>
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="w-full gap-2 mt-5 bg-black hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </Button>
      </div>
    );
  };

  const activeLayout = layout[activeElement];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] p-0 gap-0 overflow-y-auto rounded-2xl max-h-[90dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b bg-blue-50/50 dark:bg-blue-500/10 shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
              <Settings className="w-5 h-5" />
            </div>
            <DialogTitle className="font-semibold text-lg m-0">
              Participant Card Settings
            </DialogTitle>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row h-full min-h-0 bg-gray-50 dark:bg-neutral-900">
          {/* Form Side */}
          <div className="flex-1 p-5 bg-white dark:bg-neutral-950 border-r border-gray-100 dark:border-border">
            <div className="space-y-4">
              
              {/* Element Configuration Panel (Merged) */}
              <div className="bg-gray-50 dark:bg-neutral-900 rounded-xl border border-gray-100 dark:border-border overflow-hidden">
                {/* Element Selector */}
                <div className="p-4 border-b border-gray-100 dark:border-border bg-gray-100/50 dark:bg-neutral-800/50">
                  <Label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">Select Element to Edit</Label>
                  <Select value={activeElement} onValueChange={setActiveElement}>
                    <SelectTrigger className="w-full bg-white border-gray-200 dark:bg-neutral-950 dark:border-neutral-700">
                      <SelectValue placeholder="Select an element" />
                    </SelectTrigger>
                    <SelectContent>
                      {ELEMENTS.map(el => (
                        <SelectItem key={el.id} value={el.id}>{el.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Element Properties */}
                {activeLayout && (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2">
                      <Label className="font-semibold text-gray-700 dark:text-gray-300">Visibility</Label>
                      <Switch 
                        checked={activeLayout.visible} 
                        onCheckedChange={(val) => handleUpdateElement('visible', val)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-1">
                      {/* Position Controls */}
                      <div className="col-span-2 space-y-4">
                        <div>
                          <div className="flex justify-between mb-2">
                            <Label className="text-xs text-muted-foreground">X Position (Left to Right)</Label>
                            <span className="text-xs font-medium bg-gray-200 dark:bg-neutral-800 px-1.5 rounded">{activeLayout.x}%</span>
                          </div>
                          <Slider
                            value={[activeLayout.x]}
                            min={0}
                            max={100}
                            step={1}
                            onValueChange={(vals) => handleUpdateElement('x', vals[0])}
                          />
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-2">
                            <Label className="text-xs text-muted-foreground">Y Position (Top to Bottom)</Label>
                            <span className="text-xs font-medium bg-gray-200 dark:bg-neutral-800 px-1.5 rounded">{activeLayout.y}%</span>
                          </div>
                          <Slider
                            value={[activeLayout.y]}
                            min={0}
                            max={100}
                            step={1}
                            onValueChange={(vals) => handleUpdateElement('y', vals[0])}
                          />
                        </div>
                      </div>

                      {/* Text specific controls */}
                      {activeLayout.fontSize !== undefined && (
                        <>
                          <div className="col-span-2 space-y-2">
                            <Label className="text-xs text-muted-foreground">Font Size (px)</Label>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" size="sm" className="h-8 w-8 px-0"
                                onClick={() => handleUpdateElement('fontSize', Math.max(8, activeLayout.fontSize - 1))}
                              >
                                -
                              </Button>
                              <div className="flex-1 text-center font-medium border h-8 rounded flex items-center justify-center bg-white dark:bg-neutral-950">
                                {activeLayout.fontSize}
                              </div>
                              <Button 
                                variant="outline" size="sm" className="h-8 w-8 px-0"
                                onClick={() => handleUpdateElement('fontSize', activeLayout.fontSize + 1)}
                              >
                                +
                              </Button>
                            </div>
                          </div>

                          <div className="col-span-2 space-y-2">
                            <Label className="text-xs text-muted-foreground">Color</Label>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="color"
                                value={activeLayout.color}
                                onChange={(e) => handleUpdateElement('color', e.target.value)}
                                className="h-8 w-full rounded cursor-pointer border p-0.5 bg-white dark:bg-neutral-950"
                              />
                              <div className="flex items-center justify-center bg-gray-100 dark:bg-neutral-800 px-3 h-8 rounded border border-gray-200 dark:border-neutral-700">
                                <span className="text-xs font-mono uppercase">
                                  {activeLayout.color}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="col-span-2 space-y-2">
                            <Label className="text-xs text-muted-foreground">Font Family</Label>
                            <Select 
                              value={activeLayout.fontFamily} 
                              onValueChange={(val) => handleUpdateElement('fontFamily', val)}
                            >
                              <SelectTrigger className="h-8 bg-white dark:bg-neutral-950 border-gray-200 dark:border-border">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {FONT_OPTIONS.map(f => (
                                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="col-span-2 space-y-2">
                            <Label className="text-xs text-muted-foreground">Font Weight</Label>
                            <Select 
                              value={activeLayout.fontWeight} 
                              onValueChange={(val) => handleUpdateElement('fontWeight', val)}
                            >
                              <SelectTrigger className="h-8 bg-white dark:bg-neutral-950 border-gray-200 dark:border-border">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="500">Medium (500)</SelectItem>
                                <SelectItem value="600">Semi Bold (600)</SelectItem>
                                <SelectItem value="bold">Bold (700)</SelectItem>
                                <SelectItem value="900">Black (900)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}

                      {/* QR specific controls */}
                      {activeLayout.size !== undefined && (
                        <div className="col-span-2 space-y-2">
                          <Label className="text-xs text-muted-foreground">QR Code Size (px)</Label>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" size="sm" className="h-8 w-8 px-0"
                              onClick={() => handleUpdateElement('size', Math.max(10, activeLayout.size - 5))}
                            >
                              -
                            </Button>
                            <div className="flex-1 text-center font-medium border h-8 rounded flex items-center justify-center bg-white dark:bg-neutral-950">
                              {activeLayout.size}
                            </div>
                            <Button 
                              variant="outline" size="sm" className="h-8 w-8 px-0"
                              onClick={() => handleUpdateElement('size', activeLayout.size + 5)}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {/* Barcode specific controls */}
                      {activeLayout.width !== undefined && (
                        <>
                          <div className="col-span-1 space-y-2">
                            <Label className="text-xs text-muted-foreground">Barcode Width</Label>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" size="sm" className="h-8 w-8 px-0"
                                onClick={() => handleUpdateElement('width', Math.max(0.5, +(activeLayout.width - 0.1).toFixed(1)))}
                              >
                                -
                              </Button>
                              <div className="flex-1 text-center font-medium border h-8 rounded flex items-center justify-center bg-white dark:bg-neutral-950">
                                {activeLayout.width}
                              </div>
                              <Button 
                                variant="outline" size="sm" className="h-8 w-8 px-0"
                                onClick={() => handleUpdateElement('width', +(activeLayout.width + 0.1).toFixed(1))}
                              >
                                +
                              </Button>
                            </div>
                          </div>
                          <div className="col-span-1 space-y-2">
                            <Label className="text-xs text-muted-foreground">Barcode Height</Label>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" size="sm" className="h-8 w-8 px-0"
                                onClick={() => handleUpdateElement('height', Math.max(10, activeLayout.height - 2))}
                              >
                                -
                              </Button>
                              <div className="flex-1 text-center font-medium border h-8 rounded flex items-center justify-center bg-white dark:bg-neutral-950">
                                {activeLayout.height}
                              </div>
                              <Button 
                                variant="outline" size="sm" className="h-8 w-8 px-0"
                                onClick={() => handleUpdateElement('height', activeLayout.height + 2)}
                              >
                                +
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Preview Side */}
          <div className="w-full md:w-[300px] lg:w-[340px] p-5 shrink-0 flex flex-col overflow-y-auto border-t md:border-t-0 md:border-l border-gray-100 dark:border-border bg-white dark:bg-neutral-950 md:sticky md:top-0">
            
            <div className="bg-gray-50 dark:bg-neutral-900 rounded-xl border border-gray-100 dark:border-border w-full flex flex-col overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-border bg-gray-100/50 dark:bg-neutral-800/50">
                <Label className="text-sm font-semibold flex items-center gap-2 mb-2 text-gray-700 dark:text-gray-300">
                  <ImageIcon className="w-4 h-4 text-blue-500" />
                  Background Image
                </Label>
                <ImageUploader
                  value={selectedTeamBg === "default" ? backgroundImage : (teamBackgrounds[selectedTeamBg] || {})}
                  onChange={(val) => {
                    if (selectedTeamBg === "default") {
                      setBackgroundImage(val);
                    } else {
                      setTeamBackgrounds(prev => ({ ...prev, [selectedTeamBg]: val }));
                    }
                  }}
                  apiKey={apiKey}
                  aspectRatio="1:1.4"
                  hidePreview={true}
                />
              </div>

              <div className="p-4 flex flex-col items-center justify-center flex-1">
                {renderPreview()}
              </div>
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
