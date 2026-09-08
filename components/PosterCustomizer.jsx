// components/PosterCustomizer.jsx - COMPLETE WITH ALL CONTROLS
"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Type,
  Eye,
  EyeOff,
  Settings,
  Save,
  Info,
  Upload,
  Plus,
  Trash2,
  Loader,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Grid,
  Download,
} from "lucide-react";
import ColorInput from "@/components/ColorInput";
// ImageUploader replaced with inline compact background uploader
import { toast } from "sonner";
import { domToPng } from "modern-screenshot";

// Calculate responsive font
const calculateResponsiveFont = (
  baseSize,
  containerWidth,
  containerHeight,
  config
) => {
  let finalSize = baseSize;
  if (config.minFontSize) finalSize = Math.max(finalSize, config.minFontSize);
  if (config.maxFontSize) finalSize = Math.min(finalSize, config.maxFontSize);
  return Math.round(finalSize);
};

const calculateTextDimensions = (
  text,
  fontSize,
  fontWeight = "normal",
  maxWidth = 200
) => {
  if (typeof window === "undefined")
    return {
      width: 0,
      height: fontSize,
      suggestedFontSize: fontSize,
      requiresResize: false,
    };

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  context.font = `${fontWeight} ${fontSize}px Arial, sans-serif`;
  const metrics = context.measureText(text);
  const textWidth = metrics.width;

  if (textWidth > maxWidth && maxWidth > 0) {
    const suggestedSize = Math.floor((maxWidth / textWidth) * fontSize);
    return {
      width: textWidth,
      height: fontSize * 1.2,
      suggestedFontSize: Math.max(4, suggestedSize),
      requiresResize: true,
    };
  }

  return {
    width: textWidth,
    height: fontSize * 1.2,
    suggestedFontSize: fontSize,
    requiresResize: false,
  };
};

const truncateText = (text, maxLength) => {
  if (!maxLength || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
};

const createDefaultPoster = () => ({
  name: "Poster 1",
  backgroundImage: { url: "", publicId: "" },
  layout: {
    programInfo: {
      x: 50,
      y: 5,
      visible: true,
      fontSize: 14,
      responsiveSize: true,
      minFontSize: 4,
      maxFontSize: 32,
      color: "#000000",
      fontWeight: "bold",
      textAlign: "center",
      lineHeight: 1.1,
      textShadow: false,
      autoFit: true,
    },
    divisionInfo: {
      x: 50,
      y: 25,
      visible: true,
      fontSize: 10,
      responsiveSize: true,
      minFontSize: 4,
      maxFontSize: 24,
      color: "#333333",
      fontWeight: "normal",
      textAlign: "center",
      lineHeight: 1.2,
      textShadow: false,
      autoFit: true,
    },
    resultNumber: {
      x: 50,
      y: 12,
      visible: true,
      fontSize: 24,
      responsiveSize: true,
      minFontSize: 4,
      maxFontSize: 28,
      color: "#1a56db",
      fontWeight: "bold",
      textAlign: "left",
      lineHeight: 1.1,
      letterSpacing: 0,
      textShadow: false,
      prefix: "",
      autoFit: true,
    },
    firstPlace: {
      x: 50,
      y: 35,
      visible: true,
      fontSize: 12,
      responsiveSize: true,
      minFontSize: 4,
      maxFontSize: 24,
      color: "#FFD700",
      fontWeight: "normal",
      textAlign: "left",
      lineHeight: 1.2,
      letterSpacing: 0,
      nameSpacing: 8,
      maxNameLength: 25,
      textShadow: false,
      showRank: false,
      maxWinners: 1,
      autoFit: true,
      containerPadding: 15,
      teamNameSpacing: 0,
      showTeamName: true,
    },
    secondPlace: {
      x: 50,
      y: 60,
      visible: true,
      fontSize: 12,
      responsiveSize: true,
      minFontSize: 4,
      maxFontSize: 24,
      color: "#C0C0C0",
      fontWeight: "normal",
      textAlign: "left",
      lineHeight: 1.3,
      letterSpacing: 0,
      nameSpacing: 6,
      maxNameLength: 20,
      textShadow: false,
      showRank: false,
      maxWinners: 1,
      autoFit: true,
      containerPadding: 15,
      teamNameSpacing: 0,
      showTeamName: true,
    },
    thirdPlace: {
      x: 50,
      y: 80,
      visible: true,
      fontSize: 12,
      responsiveSize: true,
      minFontSize: 4,
      maxFontSize: 24,
      color: "#CD7F32",
      fontWeight: "normal",
      textAlign: "left",
      lineHeight: 1.3,
      letterSpacing: 0,
      nameSpacing: 6,
      maxNameLength: 20,
      textShadow: false,
      showRank: false,
      maxWinners: 1,
      autoFit: true,
      containerPadding: 15,
      teamNameSpacing: 0,
      showTeamName: true,
    },
  },
});

const PosterCustomizer = ({
  poster,
  onLayoutChange,
  onBackgroundChange,
  onSave,
  isPreview = false,
  initialSettings = null,
  tenantId = null,
  user = null,
  isFullPage = false,
}) => {
  const [currentSettings, setCurrentSettings] = useState(initialSettings);
  const [selectedPosterIndex, setSelectedPosterIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedElement, setSelectedElement] = useState("programInfo");
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({
    width: 300,
    height: 300,
  });
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileControls, setShowMobileControls] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [bgUploading, setBgUploading] = useState(false);
  const bgFileInputRef = useRef(null);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [presetTemplates] = useState([
    { name: "Centered Layout", value: "centered" },
    { name: "Vertical Stack", value: "vertical" },
    { name: "Traditional", value: "traditional" },
  ]);

  const canvasRef = useRef(null);
  const posterRef = useRef(null);

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      const mobile = width < 768;
      setIsMobile(mobile);
      setShowMobileControls(mobile);
    };
    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  useEffect(() => {
    if (
      isFullPage &&
      (!currentSettings?.resultPosters ||
        currentSettings.resultPosters.length === 0)
    ) {
      setCurrentSettings((prev) => ({
        ...prev,
        resultPosters: [createDefaultPoster()],
      }));
    }
  }, [isFullPage, currentSettings]);

  useEffect(() => {
    setContainerSize({ width: 300, height: 300 });
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.body.style.overflow = "hidden";
      document.body.style.width = "100%";
    } else {
      document.body.style.overflow = "";
      document.body.style.width = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.width = "";
    };
  }, [isDragging]);

  const getCurrentPoster = () => {
    if (isFullPage && currentSettings?.resultPosters) {
      return currentSettings.resultPosters[selectedPosterIndex];
    }
    return poster;
  };

  const handleFullPageLayoutChange = (elementKey, updates) => {
    if (!isFullPage) {
      onLayoutChange?.(elementKey, updates);
      return;
    }

    setCurrentSettings((prev) => ({
      ...prev,
      resultPosters: prev.resultPosters.map((p, index) =>
        index === selectedPosterIndex
          ? {
              ...p,
              layout: {
                ...p.layout,
                [elementKey]: {
                  ...p.layout[elementKey],
                  ...updates,
                },
              },
            }
          : p
      ),
    }));
  };

  const handleFullPageBackgroundChange = (imageData) => {
    if (!isFullPage) {
      onBackgroundChange?.(imageData);
      return;
    }

    setCurrentSettings((prev) => ({
      ...prev,
      resultPosters: prev.resultPosters.map((p, index) =>
        index === selectedPosterIndex ? { ...p, backgroundImage: imageData } : p
      ),
    }));
  };

  const handleMouseDown = (e, elementKey) => {
    if (isPreview) return;
    e.preventDefault();
    e.stopPropagation();

    setSelectedElement(elementKey);
    setIsDragging(true);

    const rect = canvasRef.current.getBoundingClientRect();
    const initialX = ((e.clientX - rect.left) / rect.width) * 100;
    const initialY = ((e.clientY - rect.top) / rect.height) * 100;

    setDragStart({
      x: initialX,
      y: initialY,
      elementX: getCurrentPoster()?.layout?.[elementKey]?.x || 0,
      elementY: getCurrentPoster()?.layout?.[elementKey]?.y || 0,
    });
  };

  const handleTouchStart = (e, elementKey) => {
    if (isPreview) return;
    e.preventDefault();
    e.stopPropagation();

    setSelectedElement(elementKey);
    setIsDragging(true);

    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const initialX = ((touch.clientX - rect.left) / rect.width) * 100;
    const initialY = ((touch.clientY - rect.top) / rect.height) * 100;

    setDragStart({
      x: initialX,
      y: initialY,
      elementX: getCurrentPoster()?.layout?.[elementKey]?.x || 0,
      elementY: getCurrentPoster()?.layout?.[elementKey]?.y || 0,
    });
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging || !selectedElement || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const clientX = e.clientX ?? e.touches?.[0]?.clientX;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY;

      if (!clientX || !clientY) return;

      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;
      const clampedX = Math.max(0, Math.min(100, x));
      const clampedY = Math.max(0, Math.min(100, y));

      if (isFullPage) {
        handleFullPageLayoutChange(selectedElement, {
          x: clampedX,
          y: clampedY,
        });
      } else {
        onLayoutChange?.(selectedElement, { x: clampedX, y: clampedY });
      }
    },
    [isDragging, selectedElement, isFullPage]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    const handleMove = (e) => {
      if (e.type === "mousemove") {
        handleMouseMove(e);
      } else if (e.type === "touchmove") {
        e.preventDefault();
        handleMouseMove(e);
      }
    };

    const handleEnd = () => handleMouseUp();

    if (isDragging) {
      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleEnd);
      document.addEventListener("touchmove", handleMove, { passive: false });
      document.addEventListener("touchend", handleEnd);

      return () => {
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleEnd);
        document.removeEventListener("touchmove", handleMove);
        document.removeEventListener("touchend", handleEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleFullPageSave = async () => {
    if (!isFullPage) {
      onSave?.();
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch("/api/settings", {
        method: currentSettings.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...currentSettings,
          tenantId: tenantId,
          updatedBy: user?.id,
          updatedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save settings");
      }

      const result = await response.json();
      setCurrentSettings(result.data);
      toast.success("Poster layout saved successfully!");
    } catch (error) {
      console.error("Error saving poster layout:", error);
      toast.error(error.message || "Failed to save poster layout");
    } finally {
      setIsSaving(false);
    }
  };

  const addNewPoster = () => {
    if (!isFullPage) return;

    const newPoster = createDefaultPoster();
    newPoster.name = `Poster ${(currentSettings?.resultPosters?.length || 0) + 1}`;

    setCurrentSettings((prev) => ({
      ...prev,
      resultPosters: [...(prev.resultPosters || []), newPoster],
    }));

    setSelectedPosterIndex(currentSettings?.resultPosters?.length || 0);
  };

  const updatePosterName = (name) => {
    if (!isFullPage) return;

    setCurrentSettings((prev) => ({
      ...prev,
      resultPosters: prev.resultPosters.map((p, index) =>
        index === selectedPosterIndex ? { ...p, name } : p
      ),
    }));
  };

  const removePoster = (indexToRemove) => {
    if (!isFullPage || currentSettings.resultPosters.length <= 1) {
      toast.error("Cannot remove the last poster");
      return;
    }

    setCurrentSettings((prev) => ({
      ...prev,
      resultPosters: prev.resultPosters.filter(
        (_, index) => index !== indexToRemove
      ),
    }));

    if (selectedPosterIndex >= indexToRemove && selectedPosterIndex > 0) {
      setSelectedPosterIndex(selectedPosterIndex - 1);
    }
  };

  const applyPresetTemplate = (templateType) => {
    const currentPoster = getCurrentPoster();
    if (!currentPoster) return;

    let newLayout;
    switch (templateType) {
      case "centered":
        newLayout = {
          ...currentPoster.layout,
          resultNumber: {
            ...currentPoster.layout.resultNumber,
            x: 50,
            y: 12,
            textAlign: "left",
          },
          firstPlace: {
            ...currentPoster.layout.firstPlace,
            x: 50,
            y: 35,
            textAlign: "left",
          },
          secondPlace: {
            ...currentPoster.layout.secondPlace,
            x: 50,
            y: 55,
            textAlign: "left",
          },
          thirdPlace: {
            ...currentPoster.layout.thirdPlace,
            x: 50,
            y: 75,
            textAlign: "left",
          },
        };
        break;
      case "vertical":
        newLayout = {
          ...currentPoster.layout,
          resultNumber: {
            ...currentPoster.layout.resultNumber,
            x: 50,
            y: 10,
            textAlign: "left",
          },
          firstPlace: {
            ...currentPoster.layout.firstPlace,
            x: 50,
            y: 25,
            textAlign: "left",
          },
          secondPlace: {
            ...currentPoster.layout.secondPlace,
            x: 50,
            y: 45,
            textAlign: "left",
          },
          thirdPlace: {
            ...currentPoster.layout.thirdPlace,
            x: 50,
            y: 65,
            textAlign: "left",
          },
        };
        break;
      case "traditional":
        newLayout = {
          ...currentPoster.layout,
          resultNumber: {
            ...currentPoster.layout.resultNumber,
            x: 50,
            y: 15,
            textAlign: "left",
          },
          firstPlace: {
            ...currentPoster.layout.firstPlace,
            x: 50,
            y: 40,
            textAlign: "left",
            fontSize: 20,
          },
          secondPlace: {
            ...currentPoster.layout.secondPlace,
            x: 25,
            y: 65,
            textAlign: "left",
          },
          thirdPlace: {
            ...currentPoster.layout.thirdPlace,
            x: 75,
            y: 65,
            textAlign: "left",
          },
        };
        break;
      default:
        return;
    }

    if (isFullPage) {
      setCurrentSettings((prev) => ({
        ...prev,
        resultPosters: prev.resultPosters.map((p, index) =>
          index === selectedPosterIndex ? { ...p, layout: newLayout } : p
        ),
      }));
    } else {
      Object.keys(newLayout).forEach((elementKey) => {
        onLayoutChange?.(elementKey, newLayout[elementKey]);
      });
    }

    toast.success(`Applied ${templateType} template`);
  };

  const renderProgramInfo = (config, isDraggable = false) => {
    if (!config?.visible) return null;

    const fallback = "SPEECH ENGLISH";
    const value = (config.text ?? "").trim() || fallback;
    const baseFontSize = calculateResponsiveFont(
      config.fontSize,
      containerSize.width,
      containerSize.height,
      config
    );
    const textDimensions = calculateTextDimensions(
      value,
      baseFontSize,
      config.fontWeight,
      containerSize.width * 0.9
    );
    const fontSize = config.autoFit
      ? textDimensions.suggestedFontSize
      : baseFontSize;

    return (
      <div
        key={`programInfo-${selectedPosterIndex}-${config.fontSize}`}
        className={`absolute pointer-events-auto select-none transition-all duration-200 ${
          isDraggable && !isPreview ? "cursor-move hover:scale-105" : ""
        } ${selectedElement === "programInfo" && !isPreview ? "ring-2 ring-primary ring-offset-2" : ""}`}
        style={{
          left: `${config.x}%`,
          top: `${config.y}%`,
          transform:
            config.textAlign === "center"
              ? "translateX(-50%)"
              : config.textAlign === "right"
                ? "translateX(-100%)"
                : "translateX(0)",
          fontSize: `${fontSize}px`,
          color: config.color,
          fontWeight: config.fontWeight,
          textAlign: config.textAlign,
          lineHeight: config.lineHeight,
          letterSpacing: `${config.letterSpacing || 0}px`,
          textShadow: config.textShadow
            ? "2px 2px 4px rgba(0,0,0,0.8)"
            : "none",
          maxWidth: "90%",
          whiteSpace: "nowrap",
          zIndex: 10,
        }}
        onMouseDown={
          isDraggable ? (e) => handleMouseDown(e, "programInfo") : undefined
        }
        onTouchStart={
          isDraggable ? (e) => handleTouchStart(e, "programInfo") : undefined
        }
        onClick={() => !isPreview && setSelectedElement("programInfo")}
      >
        {value}
      </div>
    );
  };

  const renderDivisionInfo = (config, isDraggable = false) => {
    if (!config?.visible) return null;

    const fallback = "Senior Group";
    const value = (config.text ?? "").trim() || fallback;
    const baseFontSize = calculateResponsiveFont(
      config.fontSize,
      containerSize.width,
      containerSize.height,
      config
    );
    const textDimensions = calculateTextDimensions(
      value,
      baseFontSize,
      config.fontWeight,
      containerSize.width * 0.9
    );
    const fontSize = config.autoFit
      ? textDimensions.suggestedFontSize
      : baseFontSize;

    return (
      <div
        key={`divisionInfo-${selectedPosterIndex}-${config.fontSize}`}
        className={`absolute pointer-events-auto select-none transition-all duration-200 ${
          isDraggable && !isPreview ? "cursor-move hover:scale-105" : ""
        } ${selectedElement === "divisionInfo" && !isPreview ? "ring-2 ring-primary ring-offset-2" : ""}`}
        style={{
          left: `${config.x}%`,
          top: `${config.y}%`,
          transform:
            config.textAlign === "center"
              ? "translateX(-50%)"
              : config.textAlign === "right"
                ? "translateX(-100%)"
                : "translateX(0)",
          fontSize: `${fontSize}px`,
          color: config.color,
          fontWeight: config.fontWeight,
          textAlign: config.textAlign,
          lineHeight: config.lineHeight,
          letterSpacing: `${config.letterSpacing || 0}px`,
          textShadow: config.textShadow
            ? "2px 2px 4px rgba(0,0,0,0.8)"
            : "none",
          maxWidth: "90%",
          whiteSpace: "nowrap",
          zIndex: 10,
        }}
        onMouseDown={
          isDraggable ? (e) => handleMouseDown(e, "divisionInfo") : undefined
        }
        onTouchStart={
          isDraggable ? (e) => handleTouchStart(e, "divisionInfo") : undefined
        }
        onClick={() => !isPreview && setSelectedElement("divisionInfo")}
      >
        {value}
      </div>
    );
  };

  const renderResultNumber = (config, isDraggable = false) => {
    if (!config?.visible) return null;

    const fallback = "01";
    const displayValue =
      config.prefix + ((config.text ?? "").trim() || fallback);
    const baseFontSize = calculateResponsiveFont(
      config.fontSize,
      containerSize.width,
      containerSize.height,
      config
    );
    const textDimensions = calculateTextDimensions(
      displayValue,
      baseFontSize,
      config.fontWeight,
      containerSize.width * 0.9
    );
    const fontSize = config.autoFit
      ? textDimensions.suggestedFontSize
      : baseFontSize;

    return (
      <div
        key={`resultNumber-${selectedPosterIndex}-${config.fontSize}`}
        className={`absolute pointer-events-auto select-none transition-all duration-200 ${
          isDraggable && !isPreview ? "cursor-move hover:scale-105" : ""
        } ${selectedElement === "resultNumber" && !isPreview ? "ring-2 ring-primary ring-offset-2" : ""}`}
        style={{
          left: `${config.x}%`,
          top: `${config.y}%`,
          transform: "translateX(0)",
          fontSize: `${fontSize}px`,
          color: config.color,
          fontWeight: config.fontWeight,
          textAlign: config.textAlign,
          lineHeight: config.lineHeight,
          letterSpacing: `${config.letterSpacing || 0}px`,
          textShadow: config.textShadow
            ? "2px 2px 4px rgba(0,0,0,0.8)"
            : "none",
          maxWidth: "90%",
          whiteSpace: "nowrap",
          zIndex: 10,
        }}
        onMouseDown={
          isDraggable ? (e) => handleMouseDown(e, "resultNumber") : undefined
        }
        onTouchStart={
          isDraggable ? (e) => handleTouchStart(e, "resultNumber") : undefined
        }
        onClick={() => !isPreview && setSelectedElement("resultNumber")}
      >
        {displayValue}
      </div>
    );
  };

  const renderWinnersList = (
    config,
    winners = [],
    elementKey,
    isDraggable = false
  ) => {
    if (!config?.visible || !winners?.length) return null;

    const maxWinners = Math.min(winners.length, config.maxWinners || 1);
    const displayWinners = winners.slice(0, maxWinners);
    const baseFontSize = calculateResponsiveFont(
      config.fontSize,
      containerSize.width,
      containerSize.height,
      config
    );

    return (
      <div
        key={`${elementKey}-${selectedPosterIndex}-${config.fontSize}`}
        className={`absolute pointer-events-auto select-none transition-all duration-200 ${
          isDraggable && !isPreview ? "cursor-move hover:scale-105" : ""
        } ${selectedElement === elementKey && !isPreview ? "ring-2 ring-primary ring-offset-2" : ""}`}
        style={{
          left: `${config.x}%`,
          top: `${config.y}%`,
          transform: "translateX(0)",
          maxWidth: "90%",
          zIndex: 10,
          padding: `${config.containerPadding || 10}px`,
        }}
        onMouseDown={
          isDraggable ? (e) => handleMouseDown(e, elementKey) : undefined
        }
        onTouchStart={
          isDraggable ? (e) => handleTouchStart(e, elementKey) : undefined
        }
        onClick={() => !isPreview && setSelectedElement(elementKey)}
      >
        {displayWinners.map((winner, index) => {
          const displayName = config.maxNameLength
            ? truncateText(winner.studentName || "Winner", config.maxNameLength)
            : winner.studentName || "Winner";
          const teamDisplay =
            config.showTeamName && winner.teamName ? winner.teamName : "";

          return (
            <div
              key={index}
              className="block"
              style={{
                marginBottom:
                  index < displayWinners.length - 1
                    ? `${config.nameSpacing || 4}px`
                    : "0",
                fontSize: `${baseFontSize}px`,
                color: config.color,
                fontWeight: config.fontWeight,
                textAlign: config.textAlign,
                lineHeight: config.lineHeight,
                letterSpacing: `${config.letterSpacing || 0}px`,
                textShadow: config.textShadow
                  ? "2px 2px 4px rgba(0,0,0,0.8)"
                  : "none",
                whiteSpace: "nowrap",
              }}
            >
              {config.showRank && `${index + 1}. `}
              {displayName}
              {teamDisplay && (
                <div
                  style={{
                    fontSize: `${Math.max(8, baseFontSize * 0.8)}px`,
                    opacity: 0.8,
                    marginTop: `${config.teamNameSpacing || 0}px`,
                  }}
                >
                  {teamDisplay}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const handleDownloadPoster = async () => {
    if (!posterRef.current) {
      toast.error("Please wait for the poster to load completely");
      return;
    }

    setIsLoading(true);
    try {
      const element = posterRef.current;
      const dataUrl = await domToPng(element, {
        quality: 1,
        scale: 6 * window.devicePixelRatio,
        backgroundColor: "#ffffff",
        style: {
          fontFamily: "'Montserrat', Arial, sans-serif",
        },
      });

      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = "poster-template.png";
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Poster template downloaded!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download poster template. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isFullPage && !currentSettings) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="h-6 w-6 animate-spin mr-2" />
        <span>Loading Poster Customizer...</span>
      </div>
    );
  }

  if (!getCurrentPoster()) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No poster data available</p>
      </div>
    );
  }

  const currentPoster = getCurrentPoster();

  return (
    <div className={isFullPage ? "min-h-screen" : ""}>
      <div className={isFullPage ? "max-w-7xl mx-auto" : ""}>
        <div
          className={`grid gap-6 ${isFullPage ? "lg:grid-cols-2" : "grid-cols-1 lg:grid-cols-2"}`}
        >

          {/* ===== COL 2: Element Settings ===== */}
          <div
            className={`space-y-4 ${isFullPage ? "order-1" : ""}`}
          >

            {selectedElement
              ? (() => {
                  const config = currentPoster.layout?.[selectedElement];
                  if (!config) return null;

                  return (
                    <Card
                      key={selectedElement}
                    >
                      <CardHeader className="pb-0 sm:pb-1">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col gap-2 flex-1">
                            {!isPreview && (
                              <Select
                                value={selectedElement || "programInfo"}
                                onValueChange={(value) => setSelectedElement(value)}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Choose element to edit" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="programInfo">Program Name</SelectItem>
                                  <SelectItem value="divisionInfo">Division Name</SelectItem>
                                  <SelectItem value="resultNumber">Result Number</SelectItem>
                                  <SelectItem value="firstPlace">First Place</SelectItem>
                                  <SelectItem value="secondPlace">Second Place</SelectItem>
                                  <SelectItem value="thirdPlace">Third Place</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            <div className="flex items-center justify-between gap-3">
                              <CardTitle className="text-base sm:text-lg">
                                {selectedElement === "programInfo"
                                  ? "Program Name"
                                  : selectedElement === "divisionInfo"
                                    ? "Division Name"
                                    : selectedElement === "resultNumber"
                                      ? "Result Number"
                                      : selectedElement === "firstPlace"
                                        ? "First Place"
                                        : selectedElement === "secondPlace"
                                          ? "Second Place"
                                          : "Third Place"}
                              </CardTitle>
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="flex items-center gap-1.5">
                                  <Switch
                                    id={`${selectedElement}-text-shadow-header`}
                                    checked={config.textShadow || false}
                                    onCheckedChange={(textShadow) => {
                                      if (isFullPage) {
                                        handleFullPageLayoutChange(selectedElement, { textShadow });
                                      } else {
                                        onLayoutChange?.(selectedElement, { textShadow });
                                      }
                                    }}
                                  />
                                  <Label htmlFor={`${selectedElement}-text-shadow-header`} className="text-sm cursor-pointer">Shadow</Label>
                                </div>
                                <Switch
                                  checked={config.visible}
                                  onCheckedChange={(visible) => {
                                    if (isFullPage) {
                                      handleFullPageLayoutChange(selectedElement, { visible });
                                    } else {
                                      onLayoutChange?.(selectedElement, { visible });
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 sm:space-y-3 p-3 pt-0 sm:p-4 sm:pt-0 md:p-6 md:pt-0">
                        {/* Hidden Warning */}
                        {!config.visible && (
                          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                            <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                              <EyeOff className="h-4 w-4" />
                              This element is currently hidden on the poster
                            </p>
                          </div>
                        )}

                        {/* Position Controls */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-sm sm:text-base">
                              X Position
                            </Label>
                            <Slider
                              value={[config.x || 50]}
                              onValueChange={([x]) => {
                                if (isFullPage) {
                                  handleFullPageLayoutChange(selectedElement, {
                                    x,
                                  });
                                } else {
                                  onLayoutChange?.(selectedElement, { x });
                                }
                              }}
                              max={100}
                              step={0.5}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-sm sm:text-base">
                              Y Position
                            </Label>
                            <Slider
                              value={[config.y || 50]}
                              onValueChange={([y]) => {
                                if (isFullPage) {
                                  handleFullPageLayoutChange(selectedElement, {
                                    y,
                                  });
                                } else {
                                  onLayoutChange?.(selectedElement, { y });
                                }
                              }}
                              max={100}
                              step={0.5}
                              className="mt-1"
                            />
                          </div>
                        </div>

                        {/* Font Controls */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-sm sm:text-base">
                              Font Size
                            </Label>
                            <Slider
                              value={[config.fontSize || 12]}
                              onValueChange={([fontSize]) => {
                                if (isFullPage) {
                                  handleFullPageLayoutChange(selectedElement, {
                                    fontSize,
                                  });
                                } else {
                                  onLayoutChange?.(selectedElement, {
                                    fontSize,
                                  });
                                }
                              }}
                              min={8}
                              max={48}
                              step={1}
                              className="mt-1"
                            />
                            <span className="text-sm text-muted-foreground">
                              {config.fontSize || 12}px
                            </span>
                          </div>
                          <div>
                            <Label className="text-sm sm:text-base">
                              Line Height
                            </Label>
                            <Slider
                              value={[config.lineHeight || 1.2]}
                              onValueChange={([lineHeight]) => {
                                if (isFullPage) {
                                  handleFullPageLayoutChange(
                                    selectedElement,
                                    { lineHeight }
                                  );
                                } else {
                                  onLayoutChange?.(selectedElement, {
                                    lineHeight,
                                  });
                                }
                              }}
                              min={0.8}
                              max={2.0}
                              step={0.1}
                              className="mt-1"
                            />
                            <span className="text-sm text-muted-foreground">
                              {config.lineHeight || 1.2}
                            </span>
                          </div>
                        </div>

                        {/* Color Controls */}
                        <div className="w-full">
                          <ColorInput
                            layout="split"
                            value={config.color || "#ffffff"}
                            onChange={(color) => {
                              if (isFullPage) {
                                handleFullPageLayoutChange(selectedElement, {
                                  color,
                                });
                              } else {
                                onLayoutChange?.(selectedElement, { color });
                              }
                            }}
                          />
                        </div>

                        {/* Style Controls */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-sm sm:text-base">
                              Font Weight
                            </Label>
                            <Select
                              value={config.fontWeight || "normal"}
                              onValueChange={(fontWeight) => {
                                if (isFullPage) {
                                  handleFullPageLayoutChange(selectedElement, {
                                    fontWeight,
                                  });
                                } else {
                                  onLayoutChange?.(selectedElement, {
                                    fontWeight,
                                  });
                                }
                              }}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="bold">Bold</SelectItem>
                                <SelectItem value="600">Semi Bold</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-sm sm:text-base">
                              Text Align
                            </Label>
                            <Select
                              value={config.textAlign || "left"}
                              onValueChange={(textAlign) => {
                                if (isFullPage) {
                                  handleFullPageLayoutChange(selectedElement, {
                                    textAlign,
                                  });
                                } else {
                                  onLayoutChange?.(selectedElement, {
                                    textAlign,
                                  });
                                }
                              }}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="left">Left</SelectItem>
                                <SelectItem value="center">Center</SelectItem>
                                <SelectItem value="right">Right</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>


                        {/* Advanced Options — always visible */}
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              {(selectedElement === "resultNumber" ||
                                selectedElement === "firstPlace" ||
                                selectedElement === "secondPlace" ||
                                selectedElement === "thirdPlace") && (
                                <div>
                                  <Label className="text-sm sm:text-base">
                                    Letter Spacing
                                  </Label>
                                  <Slider
                                    value={[config.letterSpacing || 0]}
                                    onValueChange={([letterSpacing]) => {
                                      if (isFullPage) {
                                        handleFullPageLayoutChange(
                                          selectedElement,
                                          { letterSpacing }
                                        );
                                      } else {
                                        onLayoutChange?.(selectedElement, {
                                          letterSpacing,
                                        });
                                      }
                                    }}
                                    min={-2}
                                    max={5}
                                    step={0.1}
                                    className="mt-1"
                                  />
                                  <span className="text-sm text-muted-foreground">
                                    {config.letterSpacing || 0}px
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Result Number Prefix */}
                            {selectedElement === "resultNumber" && (
                              <div>
                                <Label className="text-sm sm:text-base">
                                  Prefix Text
                                </Label>
                                <Input
                                  value={config.prefix || ""}
                                  onChange={(e) => {
                                    if (isFullPage) {
                                      handleFullPageLayoutChange(
                                        selectedElement,
                                        { prefix: e.target.value }
                                      );
                                    } else {
                                      onLayoutChange?.(selectedElement, {
                                        prefix: e.target.value,
                                      });
                                    }
                                  }}
                                  placeholder="e.g., R-"
                                  className="mt-1 h-8 text-sm"
                                />
                              </div>
                            )}

                            {/* Winner-specific options */}
                            {(selectedElement === "firstPlace" ||
                              selectedElement === "secondPlace" ||
                              selectedElement === "thirdPlace") && (
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-sm sm:text-base">
                                      Max Winners
                                    </Label>
                                    <Slider
                                      value={[config.maxWinners || 1]}
                                      onValueChange={([maxWinners]) => {
                                        if (isFullPage) {
                                          handleFullPageLayoutChange(
                                            selectedElement,
                                            { maxWinners }
                                          );
                                        } else {
                                          onLayoutChange?.(selectedElement, {
                                            maxWinners,
                                          });
                                        }
                                      }}
                                      min={1}
                                      max={5}
                                      step={1}
                                      className="mt-1"
                                    />
                                    <span className="text-sm text-muted-foreground">
                                      {config.maxWinners || 1}
                                    </span>
                                  </div>
                                  <div>
                                    <Label className="text-sm sm:text-base">
                                      Name Spacing
                                    </Label>
                                    <Slider
                                      value={[config.nameSpacing || 4]}
                                      onValueChange={([nameSpacing]) => {
                                        if (isFullPage) {
                                          handleFullPageLayoutChange(
                                            selectedElement,
                                            { nameSpacing }
                                          );
                                        } else {
                                          onLayoutChange?.(selectedElement, {
                                            nameSpacing,
                                          });
                                        }
                                      }}
                                      min={-5}
                                      max={20}
                                      step={1}
                                      className="mt-1"
                                    />
                                    <span className="text-sm text-muted-foreground">
                                      {config.nameSpacing || 4}px
                                    </span>
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-sm sm:text-base">
                                    Team Name Spacing
                                  </Label>
                                  <Slider
                                    value={[config.teamNameSpacing || 0]}
                                    onValueChange={([teamNameSpacing]) => {
                                      if (isFullPage) {
                                        handleFullPageLayoutChange(
                                          selectedElement,
                                          { teamNameSpacing }
                                        );
                                      } else {
                                        onLayoutChange?.(selectedElement, {
                                          teamNameSpacing,
                                        });
                                      }
                                    }}
                                    min={-5}
                                    max={10}
                                    step={1}
                                    className="mt-1"
                                  />
                                  <span className="text-sm text-muted-foreground">
                                    {config.teamNameSpacing || 0}px
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      id={`${selectedElement}-show-rank`}
                                      checked={config.showRank || false}
                                      onCheckedChange={(showRank) => {
                                        if (isFullPage) {
                                          handleFullPageLayoutChange(
                                            selectedElement,
                                            { showRank }
                                          );
                                        } else {
                                          onLayoutChange?.(selectedElement, {
                                            showRank,
                                          });
                                        }
                                      }}
                                    />
                                    <Label
                                      htmlFor={`${selectedElement}-show-rank`}
                                      className="text-sm"
                                    >
                                      Show Rank Number
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      id={`${selectedElement}-show-team`}
                                      checked={config.showTeamName !== false}
                                      onCheckedChange={(showTeamName) => {
                                        if (isFullPage) {
                                          handleFullPageLayoutChange(
                                            selectedElement,
                                            { showTeamName }
                                          );
                                        } else {
                                          onLayoutChange?.(selectedElement, {
                                            showTeamName,
                                          });
                                        }
                                      }}
                                    />
                                    <Label
                                      htmlFor={`${selectedElement}-show-team`}
                                      className="text-sm"
                                    >
                                      Show Team
                                    </Label>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                    </Card>
                  );
                })()
              : !isPreview && (
                  <Card className="border-dashed border-2 border-border">
                    <CardContent className="p-6 text-center text-muted-foreground">
                      <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        {isMobile
                          ? "Select an element above or tap elements in the preview"
                          : "Click elements in the preview to customize"}
                      </p>
                    </CardContent>
                  </Card>
                )}



            {!isFullPage && onSave && (
              <div className="mt-6 text-center">
                <Button onClick={onSave} size="lg" className="w-full sm:w-auto">
                  <Save className="h-4 w-4 mr-2" />
                  Save Layout
                </Button>
              </div>
            )}
          </div>

          {/* ===== COL 3: Poster Preview ===== */}
          <div
            className={`${isFullPage ? "order-2" : ""}`}
          >
            <Card>
              <CardHeader className="pb-1">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Poster Preview
                  </CardTitle>
                  {currentPoster && isFullPage && (
                    <Badge variant="secondary">
                      {currentPoster.name === "Default Poster" || !currentPoster.name ? `Poster ${selectedPosterIndex + 1}` : currentPoster.name}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Poster Number Dropdown */}
                  <div>
                    <Label className="text-sm sm:text-base mb-1 block">Select Poster</Label>
                    <div className="flex items-center gap-2">
                      <Select
                        value={String(selectedPosterIndex)}
                        onValueChange={(val) => setSelectedPosterIndex(Number(val))}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select a poster" />
                        </SelectTrigger>
                        <SelectContent>
                          {currentSettings?.resultPosters?.map((p, index) => (
                            <SelectItem key={index} value={String(index)}>
                              {p.name === "Default Poster" || !p.name ? `Poster ${index + 1}` : p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={addNewPoster}
                        variant="outline"
                        size="icon"
                        title="Add new poster"
                        className="shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      {currentSettings?.resultPosters?.length > 1 && (
                        <Button
                          onClick={() => setShowDeleteConfirm(true)}
                          variant="outline"
                          size="icon"
                          title="Remove selected poster"
                          className="shrink-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Background Upload */}
                  {!isPreview && (
                    <div>
                      <Label className="text-sm sm:text-base mb-1 block">Poster Background</Label>
                      <input
                        type="file"
                        ref={bgFileInputRef}
                        accept="image/jpeg,image/png"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 5 * 1024 * 1024) {
                            toast.error("File too large. Max 5MB.");
                            return;
                          }
                          try {
                            setBgUploading(true);
                            const reader = new FileReader();
                            reader.onloadend = async () => {
                              try {
                                const res = await fetch("/api/cloudinary", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ image: reader.result }),
                                });
                                if (!res.ok) throw new Error("Upload failed");
                                const data = await res.json();
                                const imageData = { url: data.url, publicId: data.publicId };
                                if (isFullPage) {
                                  handleFullPageBackgroundChange(imageData);
                                } else {
                                  onBackgroundChange?.(imageData);
                                }
                                toast.success("Background uploaded!");
                              } catch (err) {
                                toast.error(err.message || "Upload failed");
                              } finally {
                                setBgUploading(false);
                                e.target.value = "";
                              }
                            };
                            reader.readAsDataURL(file);
                          } catch {
                            setBgUploading(false);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        className="w-full flex items-center gap-2 bg-foreground text-background hover:bg-foreground/90"
                        disabled={bgUploading}
                        onClick={() => bgFileInputRef.current?.click()}
                      >
                        {bgUploading ? (
                          <Loader className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        {bgUploading
                          ? "Uploading..."
                          : currentPoster?.backgroundImage?.url
                          ? "Change Background"
                          : "Select Background"}
                      </Button>
                      {currentPoster?.backgroundImage?.url && (
                        <button
                          onClick={() => {
                            const empty = { url: "", publicId: "" };
                            if (isFullPage) handleFullPageBackgroundChange(empty);
                            else onBackgroundChange?.(empty);
                          }}
                          className="mt-1 text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" /> Remove background
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Delete Poster Confirmation Dialog */}
                <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                  <AlertDialogContent className="sm:max-w-lg flex flex-col p-0 gap-0 [&>button.absolute]:hidden overflow-hidden rounded-2xl">
                    <AlertDialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md shrink-0">
                      <div className="flex flex-col flex-1">
                        <AlertDialogTitle className="text-xl font-bold m-0 text-foreground">
                          Delete Poster?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground mt-0.5 text-sm">
                          This will permanently remove &ldquo;{(currentPoster?.name === "Default Poster" || !currentPoster?.name) ? `Poster ${selectedPosterIndex + 1}` : currentPoster.name}&rdquo;. This action cannot be undone.
                        </AlertDialogDescription>
                      </div>
                      <AlertDialogCancel className="p-1.5 -mr-1.5 ml-1 rounded-lg border-none hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none bg-transparent h-auto mt-0">
                        ✕
                      </AlertDialogCancel>
                    </AlertDialogHeader>
                    <div className="px-5 py-4">
                      <AlertDialogFooter className="flex justify-between gap-4 mt-2 sm:justify-between w-full">
                        <AlertDialogCancel className="flex-1 mt-0">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            removePoster(selectedPosterIndex);
                            setShowDeleteConfirm(false);
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/80 hover:text-destructive-foreground flex-1"
                        >
                          Delete Poster
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </div>
                  </AlertDialogContent>
                </AlertDialog>

                <div className="w-full">
                  <div className="w-full">
                    <div
                      ref={posterRef}
                      className="relative w-full mx-auto aspect-square bg-card overflow-hidden shadow-lg"
                    >
                      <div
                        ref={canvasRef}
                        key={`canvas-${selectedPosterIndex}`}
                        className={`relative w-full h-full bg-gray-100 border-2 border-border overflow-hidden ${!isPreview ? "hover:border-primary/50" : ""}`}
                        style={{
                          backgroundImage: currentPoster?.backgroundImage?.url
                            ? `url(${currentPoster.backgroundImage.url})`
                            : "none",
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                        }}
                      >
                        {renderProgramInfo(
                          currentPoster?.layout?.programInfo,
                          !isPreview
                        )}
                        {renderDivisionInfo(
                          currentPoster?.layout?.divisionInfo,
                          !isPreview
                        )}
                        {renderResultNumber(
                          currentPoster?.layout?.resultNumber,
                          !isPreview
                        )}
                        {renderWinnersList(
                          currentPoster?.layout?.firstPlace,
                          [
                            {
                              studentName: "1st Ranker",
                              teamName: "Team Alpha",
                            },
                          ],
                          "firstPlace",
                          !isPreview
                        )}
                        {renderWinnersList(
                          currentPoster?.layout?.secondPlace,
                          [
                            {
                              studentName: "2nd Ranker",
                              teamName: "Team Beta",
                            },
                          ],
                          "secondPlace",
                          !isPreview
                        )}
                        {renderWinnersList(
                          currentPoster?.layout?.thirdPlace,
                          [
                            {
                              studentName: "3rd Ranker",
                              teamName: "Team Gamma",
                            },
                          ],
                          "thirdPlace",
                          !isPreview
                        )}

                        {!isPreview && isMobile && !selectedElement && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-black/50 text-white px-3 py-2 rounded text-sm">
                              Tap elements to edit
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  {isFullPage && (
                    <Button
                      onClick={handleFullPageSave}
                      disabled={isSaving}
                      variant="outline"
                      className="flex-1 flex items-center justify-center gap-2"
                    >
                      {isSaving ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                  )}
                  <Button
                    onClick={handleDownloadPoster}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Download
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PosterCustomizer;
