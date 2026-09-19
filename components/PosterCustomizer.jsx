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
import html2canvas from "html2canvas";

// Smart compressor to bypass Vercel 4.5MB limit while keeping 2K crispness
const compressImageForUpload = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_DIM = 2160; // 2x 1080p, ultra sharp for poster
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_DIM) {
          height = Math.round((height *= MAX_DIM / width));
          width = MAX_DIM;
        } else if (height > MAX_DIM) {
          width = Math.round((width *= MAX_DIM / height));
          height = MAX_DIM;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/webp", 0.95);
        if (dataUrl.length > 4 * 1024 * 1024) {
           resolve(canvas.toDataURL("image/webp", 0.85)); // fallback
        } else {
           resolve(dataUrl);
        }
      };
      img.onerror = reject;
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

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
  const [isAddingElement, setIsAddingElement] = useState(false);
  const [newElementName, setNewElementName] = useState("");
  const [newElementText, setNewElementText] = useState("");
  const [divisions, setDivisions] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [selectedPreviewDivision, setSelectedPreviewDivision] = useState("");
  const [selectedPreviewProgram, setSelectedPreviewProgram] = useState("");
  const [programSearch, setProgramSearch] = useState("");
  const [previewResultNumber, setPreviewResultNumber] = useState("");
  const [previewResultData, setPreviewResultData] = useState(null);
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
    if (isFullPage) {
      fetch("/api/settings")
        .then((res) => res.json())
        .then((data) => {
          if (data?.settings?.festival?.resultPosters?.length > 0) {
            setCurrentSettings((prev) => ({
              ...prev,
              ...data.settings,
              resultPosters: data.settings.festival.resultPosters,
            }));
          } else if (!currentSettings?.resultPosters || currentSettings.resultPosters.length === 0) {
            setCurrentSettings((prev) => ({
              ...prev,
              resultPosters: [createDefaultPoster()],
            }));
          }
        })
        .catch((err) => {
          console.error("Failed to fetch settings:", err);
          if (!currentSettings?.resultPosters || currentSettings.resultPosters.length === 0) {
            setCurrentSettings((prev) => ({
              ...prev,
              resultPosters: [createDefaultPoster()],
            }));
          }
        });
    }
  }, [isFullPage]);

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

  useEffect(() => {
    fetch("/api/divisions?projection=_id,name")
      .then((res) => res.json())
      .then((data) => setDivisions(data.divisions || []))
      .catch((err) => console.error("Failed to fetch divisions:", err));
  }, []);

  useEffect(() => {
    if (!selectedPreviewDivision) {
      setPrograms([]);
      setSelectedPreviewProgram("");
      return;
    }
    fetch(`/api/programs?divisionId=${selectedPreviewDivision}&projection=_id,name`)
      .then((res) => res.json())
      .then((data) => setPrograms(data.programs || []))
      .catch((err) => console.error("Failed to fetch programs:", err));
  }, [selectedPreviewDivision]);

  useEffect(() => {
    if (!selectedPreviewProgram && !previewResultNumber) {
      setPreviewResultData(null);
      return;
    }
    let url = `/api/results?isResultDeclared=true`;
    if (selectedPreviewProgram) url += `&programId=${selectedPreviewProgram}`;
    if (previewResultNumber) url += `&resultNumber=${previewResultNumber}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        const result = data.results?.[0] || null;
        setPreviewResultData(result);
      })
      .catch((err) => console.error("Failed to fetch result for program:", err));
  }, [selectedPreviewProgram, previewResultNumber]);

  const getCurrentPoster = () => {
    if (isFullPage && currentSettings?.resultPosters) {
      return currentSettings.resultPosters[selectedPosterIndex];
    }
    return poster;
  };

  const handleAddNewElement = () => {
    if (!newElementName.trim() || !newElementText.trim()) {
      toast.error("Please provide both name and text for the new element");
      return;
    }

    const customKey = `custom_${Date.now()}`;
    const newElementConfig = {
      label: newElementName,
      text: newElementText,
      x: 50,
      y: 50,
      visible: true,
      fontSize: 14,
      responsiveSize: true,
      minFontSize: 4,
      maxFontSize: 32,
      color: "#000000",
      fontWeight: "bold",
      textAlign: "center",
      letterSpacing: 0,
      textShadow: false,
      autoFit: true,
    };

    if (isFullPage) {
      setCurrentSettings((prev) => {
        const newSettings = { ...prev };
        const newPosters = [...newSettings.resultPosters];
        const layout = { ...newPosters[selectedPosterIndex].layout };
        layout[customKey] = newElementConfig;
        newPosters[selectedPosterIndex].layout = layout;
        newSettings.resultPosters = newPosters;
        return newSettings;
      });
    } else {
      onLayoutChange?.(customKey, newElementConfig);
    }

    setNewElementName("");
    setNewElementText("");
    setIsAddingElement(false);
    setSelectedElement(customKey);
    toast.success("Element added successfully");
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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedElement || isPreview) return;

      // Ignore if typing in an input
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.isContentEditable
      ) {
        return;
      }

      let dx = 0;
      let dy = 0;
      const step = e.shiftKey ? 5 : 0.5;

      if (e.key === "ArrowUp") dy = -step;
      else if (e.key === "ArrowDown") dy = step;
      else if (e.key === "ArrowLeft") dx = -step;
      else if (e.key === "ArrowRight") dx = step;

      if (dx !== 0 || dy !== 0) {
        e.preventDefault();

        const currentPoster = isFullPage && currentSettings?.resultPosters
          ? currentSettings.resultPosters[selectedPosterIndex]
          : poster;

        const currentLayout = currentPoster?.layout?.[selectedElement];
        if (!currentLayout) return;

        const newX = Math.max(0, Math.min(100, currentLayout.x + dx));
        const newY = Math.max(0, Math.min(100, currentLayout.y + dy));

        if (isFullPage) {
          setCurrentSettings((prev) => ({
            ...prev,
            resultPosters: prev.resultPosters.map((p, index) =>
              index === selectedPosterIndex
                ? {
                  ...p,
                  layout: {
                    ...p.layout,
                    [selectedElement]: {
                      ...p.layout[selectedElement],
                      x: newX,
                      y: newY,
                    },
                  },
                }
                : p
            ),
          }));
        } else {
          onLayoutChange?.(selectedElement, { x: newX, y: newY });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedElement,
    isPreview,
    isFullPage,
    currentSettings,
    selectedPosterIndex,
    poster,
    onLayoutChange,
  ]);

  const handleFullPageSave = async () => {
    if (!isFullPage) {
      onSave?.();
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          festival: {
            resultPosters: currentSettings.resultPosters,
          }
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save settings");
      }

      await response.json();
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

  const renderCustomElement = (key, config, isDraggable = false) => {
    if (!config?.visible) return null;

    const value = (config.text ?? "").trim() || config.label;
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
    const fontSize = baseFontSize;

    return (
      <div
        key={`${key}-${selectedPosterIndex}-${config.fontSize}`}
        className={`absolute pointer-events-auto select-none transition-all duration-200 ${isDraggable && !isPreview ? "cursor-move hover:scale-105" : ""
          } ${selectedElement === key && !isPreview ? "ring-2 ring-primary ring-offset-2" : ""}`}
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
          fontFamily: config.fontFamily || "inherit",
          color: config.color,
          fontWeight: config.fontWeight,
          textAlign: config.textAlign,
          lineHeight: config.lineHeight || 1.2,
          letterSpacing: `${config.letterSpacing || 0}px`,
          textShadow: config.textShadow
            ? "2px 2px 4px rgba(0,0,0,0.8)"
            : "none",
          width: "max-content",
          maxWidth:
            config.textAlign === "center"
              ? `${Math.min(config.x, 100 - config.x) * 2}%`
              : config.textAlign === "right"
                ? `${config.x}%`
                : `${100 - config.x}%`,
          boxSizing: "border-box",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          zIndex: 10,
        }}
        onMouseDown={
          isDraggable ? (e) => handleMouseDown(e, key) : undefined
        }
        onTouchStart={
          isDraggable ? (e) => handleTouchStart(e, key) : undefined
        }
        onClick={() => !isPreview && setSelectedElement(key)}
      >
        {value}
      </div>
    );
  };

  const renderProgramInfo = (config, isDraggable = false) => {
    if (!config?.visible) return null;

    const fallback = "SPEECH ENGLISH";
    let value = (config.text ?? "").trim() || fallback;

    if (previewResultData?.programName) {
      value = previewResultData.programName;
    } else if (selectedPreviewProgram) {
      const prog = programs.find((p) => String(p._id) === String(selectedPreviewProgram));
      if (prog) value = prog.name;
    }

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
    const fontSize = baseFontSize;

    return (
      <div
        key={`programInfo-${selectedPosterIndex}-${config.fontSize}`}
        className={`absolute pointer-events-auto select-none transition-all duration-200 ${isDraggable && !isPreview ? "cursor-move hover:scale-105" : ""
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
          fontFamily: config.fontFamily || "inherit",
          color: config.color,
          fontWeight: config.fontWeight,
          textAlign: config.textAlign,
          lineHeight: config.lineHeight,
          letterSpacing: `${config.letterSpacing || 0}px`,
          textShadow: config.textShadow
            ? "2px 2px 4px rgba(0,0,0,0.8)"
            : "none",
          width: "max-content",
          maxWidth:
            config.textAlign === "center"
              ? `${Math.min(config.x, 100 - config.x) * 2}%`
              : config.textAlign === "right"
                ? `${config.x}%`
                : `${100 - config.x}%`,
          boxSizing: "border-box",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
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
    let value = (config.text ?? "").trim() || fallback;

    if (previewResultData?.divisionName) {
      value = previewResultData.divisionName;
    } else if (selectedPreviewDivision) {
      const div = divisions.find((d) => String(d._id) === String(selectedPreviewDivision));
      if (div) value = div.name;
    }

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
    const fontSize = baseFontSize;

    return (
      <div
        key={`divisionInfo-${selectedPosterIndex}-${config.fontSize}`}
        className={`absolute pointer-events-auto select-none transition-all duration-200 ${isDraggable && !isPreview ? "cursor-move hover:scale-105" : ""
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
          fontFamily: config.fontFamily || "inherit",
          color: config.color,
          fontWeight: config.fontWeight,
          textAlign: config.textAlign,
          lineHeight: config.lineHeight,
          letterSpacing: `${config.letterSpacing || 0}px`,
          textShadow: config.textShadow
            ? "2px 2px 4px rgba(0,0,0,0.8)"
            : "none",
          width: "max-content",
          maxWidth:
            config.textAlign === "center"
              ? `${Math.min(config.x, 100 - config.x) * 2}%`
              : config.textAlign === "right"
                ? `${config.x}%`
                : `${100 - config.x}%`,
          boxSizing: "border-box",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
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
    let text = (config.text ?? "").trim() || fallback;

    if (previewResultData?.resultNumber) {
      text = previewResultData.resultNumber;
    }

    const displayValue = config.prefix + text;
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
    const fontSize = baseFontSize;

    return (
      <div
        key={`resultNumber-${selectedPosterIndex}-${config.fontSize}`}
        className={`absolute pointer-events-auto select-none transition-all duration-200 ${isDraggable && !isPreview ? "cursor-move hover:scale-105" : ""
          } ${selectedElement === "resultNumber" && !isPreview ? "ring-2 ring-primary ring-offset-2" : ""}`}
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
          fontFamily: config.fontFamily || "inherit",
          color: config.color,
          fontWeight: config.fontWeight,
          textAlign: config.textAlign,
          lineHeight: config.lineHeight,
          letterSpacing: `${config.letterSpacing || 0}px`,
          textShadow: config.textShadow
            ? "2px 2px 4px rgba(0,0,0,0.8)"
            : "none",
          width: "max-content",
          maxWidth:
            config.textAlign === "center"
              ? `${Math.min(config.x, 100 - config.x) * 2}%`
              : config.textAlign === "right"
                ? `${config.x}%`
                : `${100 - config.x}%`,
          boxSizing: "border-box",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
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

    const maxWinners = winners.length;
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
        className={`absolute pointer-events-auto select-none transition-all duration-200 ${isDraggable && !isPreview ? "cursor-move hover:scale-105" : ""
          } ${selectedElement === elementKey && !isPreview ? "ring-2 ring-primary ring-offset-2" : ""}`}
        style={{
          left: `${config.x}%`,
          top: `${config.y}%`,
          transform:
            config.textAlign === "center"
              ? "translateX(-50%)"
              : config.textAlign === "right"
                ? "translateX(-100%)"
                : "translateX(0)",
          width: "max-content",
          maxWidth:
            config.textAlign === "center"
              ? `${Math.min(config.x, 100 - config.x) * 2}%`
              : config.textAlign === "right"
                ? `${config.x}%`
                : `${100 - config.x}%`,
          boxSizing: "border-box",
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
                fontFamily: config.fontFamily || "inherit",
                color: config.color,
                fontWeight: config.fontWeight,
                textAlign: config.textAlign,
                lineHeight: config.lineHeight,
                letterSpacing: `${config.letterSpacing || 0}px`,
                textShadow: config.textShadow
                  ? "2px 2px 4px rgba(0,0,0,0.8)"
                  : "none",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {config.showRank && `${elementKey === "firstPlace" ? 1 : elementKey === "secondPlace" ? 2 : elementKey === "thirdPlace" ? 3 : index + 1}. `}
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

    // Clear selected element so the outline box is removed in the downloaded image
    const prevSelected = selectedElement;
    setSelectedElement(null);

    // Wait for state to reflect in DOM and transitions (duration-200) to finish
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      const element = posterRef.current;
      const targetWidth = 1080;
      const scale = targetWidth / element.offsetWidth;

      const canvas = await html2canvas(element, {
        scale: scale,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      const dataUrl = canvas.toDataURL("image/png", 1.0);

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
      // Restore selected element after download completes
      setSelectedElement(prevSelected);
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
                    <CardHeader className="pb-1">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Settings className="h-5 w-5" />
                          Element Settings
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 p-3 pt-2 sm:p-4 sm:pt-2 md:p-6 md:pt-2">
                      {!isPreview && (
                        <div>
                          <Label className="text-sm sm:text-base">Select Element</Label>
                          <Select
                            value={selectedElement || "programInfo"}
                            onValueChange={(value) => {
                              if (value === "addNew") {
                                setIsAddingElement(true);
                              } else {
                                setSelectedElement(value);
                              }
                            }}
                          >
                            <SelectTrigger className="w-full mt-1">
                              <SelectValue placeholder="Choose element to edit" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="addNew" className="font-semibold text-primary">
                                + Add New Element
                              </SelectItem>
                              <SelectItem value="programInfo">Program Name</SelectItem>
                              <SelectItem value="divisionInfo">Division Name</SelectItem>
                              <SelectItem value="resultNumber">Result Number</SelectItem>
                              <SelectItem value="firstPlace">First Place</SelectItem>
                              <SelectItem value="secondPlace">Second Place</SelectItem>
                              <SelectItem value="thirdPlace">Third Place</SelectItem>
                              {Object.entries(currentPoster?.layout || {})
                                .filter(([key]) => key.startsWith("custom_"))
                                .map(([key, config]) => (
                                  <SelectItem key={key} value={key}>
                                    {config.label || "Custom Element"}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {/* Program Name + Shadow — same layout as X/Y position */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Col 1: element name label left, its toggle right */}
                        <div className="flex items-center justify-between">
                          <Label className="text-sm sm:text-base">
                            {config.label ||
                              (selectedElement === "programInfo"
                                ? "Program Name"
                                : selectedElement === "divisionInfo"
                                  ? "Division Name"
                                  : selectedElement === "resultNumber"
                                    ? "Result Number"
                                    : selectedElement === "firstPlace"
                                      ? "First Place"
                                      : selectedElement === "secondPlace"
                                        ? "Second Place"
                                        : "Third Place")}
                          </Label>
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
                        {/* Col 2: shadow label left, its toggle right */}
                        <div className="flex items-center justify-between">
                          <Label
                            htmlFor={`${selectedElement}-text-shadow-header`}
                            className="text-sm sm:text-base cursor-pointer"
                          >
                            Shadow
                          </Label>
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
                        </div>
                      </div>
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
                      {/* Size & Spacing */}
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
                      </div>

                      {/* Font Style */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm sm:text-base">
                            Font Family
                          </Label>
                          <Select
                            value={config.fontFamily || "inherit"}
                            onValueChange={(fontFamily) => {
                              if (isFullPage) {
                                handleFullPageLayoutChange(selectedElement, { fontFamily });
                              } else {
                                onLayoutChange?.(selectedElement, { fontFamily });
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-sm mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="inherit">Default</SelectItem>
                              <SelectItem value="Montserrat, sans-serif">Montserrat</SelectItem>
                              <SelectItem value="var(--font-inter), sans-serif">Inter</SelectItem>
                              <SelectItem value="var(--font-poppins), sans-serif">Poppins</SelectItem>
                              <SelectItem value="var(--font-oswald), sans-serif">Oswald</SelectItem>
                              <SelectItem value="var(--font-lato), sans-serif">Lato</SelectItem>
                              <SelectItem value="var(--font-playfair), serif">Playfair Display</SelectItem>
                              <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                              <SelectItem value="Georgia, serif">Georgia</SelectItem>
                              <SelectItem value="Times New Roman, serif">Times New Roman</SelectItem>
                              <SelectItem value="Courier New, monospace">Courier New</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
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
                      </div>

                      {/* Color Controls */}
                      <div className="w-full">
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
                      </div>

                      {/* Alignment & Element-Specific Options */}
                      <div className="grid grid-cols-2 gap-3">
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

                        {/* Col 2: Prefix Text or Team Name Spacing */}
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

                        {(selectedElement === "firstPlace" ||
                          selectedElement === "secondPlace" ||
                          selectedElement === "thirdPlace") && (
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
                          )}
                      </div>


                      {/* Advanced Options — always visible */}
                      <div className="space-y-3">


                        {/* Prefix Text moved to Alignment grid */}

                        {/* Winner-specific options */}
                        {(selectedElement === "firstPlace" ||
                          selectedElement === "secondPlace" ||
                          selectedElement === "thirdPlace") && (
                            <div className="space-y-3">

                              {/* Team Name Spacing moved to Alignment grid */}

                              {/* Show Rank + Show Team */}
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
              <CardContent className="space-y-4 pt-2">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* Left Column: Controls */}
                  <div className="space-y-4 flex flex-col h-full">
                    {/* 1. Select Poster */}
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

                    {/* 2. Background Upload */}
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
                              const compressedBase64 = await compressImageForUpload(file);
                              
                              const res = await fetch("/api/cloudinary", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ image: compressedBase64 }),
                              });
                              
                              if (!res.ok) throw new Error("Upload failed (Payload too large?)");
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
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              const empty = { url: "", publicId: "" };
                              if (isFullPage) handleFullPageBackgroundChange(empty);
                              else onBackgroundChange?.(empty);
                            }}
                            className="w-full flex items-center justify-center gap-2 mt-1 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                          >
                            <Trash2 className="h-4 w-4" /> Remove Background
                          </Button>
                        )}
                      </div>
                    )}

                    {/* 3. Save */}
                    {isFullPage && (
                      <Button
                        onClick={handleFullPageSave}
                        disabled={isSaving}
                        variant="outline"
                        className="w-full flex items-center justify-center gap-2"
                      >
                        {isSaving ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        {isSaving ? "Saving..." : "Save Poster"}
                      </Button>
                    )}

                    <hr className="border-border" />

                    {/* Result Number Input */}
                    <div>
                      <Label className="text-sm sm:text-base mb-1 block">Result Number</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 42"
                        value={previewResultNumber}
                        onChange={(e) => {
                          setPreviewResultNumber(e.target.value);
                          if (e.target.value) {
                            setSelectedPreviewDivision("");
                            setSelectedPreviewProgram("");
                          }
                        }}
                        className="h-9 text-sm"
                      />
                    </div>

                    {/* 4. Division Dropdown */}
                    <div>
                      <Label className="text-sm sm:text-base mb-1 block">Preview Division</Label>
                      <Select value={selectedPreviewDivision} onValueChange={setSelectedPreviewDivision}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a division" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {divisions.map((d) => (
                            <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 5. Program Dropdown */}
                    <div>
                      <Label className="text-sm sm:text-base mb-1 block">Preview Program</Label>
                      <Select value={selectedPreviewProgram} onValueChange={setSelectedPreviewProgram} disabled={!selectedPreviewDivision || selectedPreviewDivision === "none"}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a program" />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="px-2 py-1.5 sticky top-0 bg-popover z-10">
                            <input
                              type="text"
                              placeholder="Search program..."
                              value={programSearch}
                              onChange={(e) => setProgramSearch(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              className="w-full px-2 py-1 text-sm border border-border rounded-md bg-background outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          <SelectItem value="none">None</SelectItem>
                          {programs
                            .filter((p) =>
                              p.name.toLowerCase().includes(programSearch.toLowerCase())
                            )
                            .map((p) => (
                              <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                  </div>

                  {/* Right Column: Canvas */}
                  <div className="w-full flex flex-col items-center">

                    {/* Add New Element Dialog */}
                    <AlertDialog open={isAddingElement} onOpenChange={setIsAddingElement}>
                      <AlertDialogContent className="sm:max-w-md">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Add New Element</AlertDialogTitle>
                          <AlertDialogDescription>
                            Provide a name and default text for the new element.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-4 py-2">
                          <div>
                            <Label>Element Name</Label>
                            <Input
                              value={newElementName}
                              onChange={(e) => setNewElementName(e.target.value)}
                              placeholder="e.g. Subtitle"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label>Element Text</Label>
                            <Input
                              value={newElementText}
                              onChange={(e) => setNewElementText(e.target.value)}
                              placeholder="e.g. Special Guest"
                              className="mt-1"
                            />
                          </div>
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setIsAddingElement(false)}>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleAddNewElement}>Save Element</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

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

                    <div className="w-full max-w-md">
                      <div className="w-full">
                        <div
                          ref={posterRef}
                          className="relative w-full mx-auto aspect-[3/4] bg-card overflow-hidden shadow-lg"
                        >
                          <div
                            ref={canvasRef}
                            key={`canvas-${selectedPosterIndex}`}
                            className={`relative w-full h-full bg-gray-100 overflow-hidden border-2 ${isLoading ? 'border-transparent' : 'border-border'} ${!isPreview && !isLoading ? "hover:border-primary/50" : ""}`}
                          >
                            {currentPoster?.backgroundImage?.url && (
                              <img
                                key={currentPoster.backgroundImage.url}
                                src={currentPoster.backgroundImage.url}
                                alt="Poster Background"
                                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                                style={{ zIndex: 0 }}
                              />
                            )}
                            {Object.entries(currentPoster?.layout || {})
                              .filter(([key]) => key.startsWith("custom_"))
                              .map(([key, config]) =>
                                renderCustomElement(key, config, !isPreview)
                              )}
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
                            {(() => {
                              const normalize = (p) => ({
                                studentName:
                                  p.participantDetails?.name ||
                                  p.studentName ||
                                  "Winner",
                                teamName:
                                  p.participantDetails?.teamId?.name ||
                                  p.teamName ||
                                  "",
                              });

                              const firstPlaceWinners = previewResultData?.participants?.filter(p => p.rank === 1).length
                                ? previewResultData.participants.filter(p => p.rank === 1).map(normalize)
                                : [{ studentName: "1st Ranker", teamName: "Team Alpha" }];
                              const secondPlaceWinners = previewResultData?.participants?.filter(p => p.rank === 2).length
                                ? previewResultData.participants.filter(p => p.rank === 2).map(normalize)
                                : [{ studentName: "2nd Ranker", teamName: "Team Beta" }];
                              const thirdPlaceWinners = previewResultData?.participants?.filter(p => p.rank === 3).length
                                ? previewResultData.participants.filter(p => p.rank === 3).map(normalize)
                                : [{ studentName: "3rd Ranker", teamName: "Team Gamma" }];

                              return (
                                <>
                                  {renderWinnersList(
                                    currentPoster?.layout?.firstPlace,
                                    firstPlaceWinners,
                                    "firstPlace",
                                    !isPreview
                                  )}
                                  {renderWinnersList(
                                    currentPoster?.layout?.secondPlace,
                                    secondPlaceWinners,
                                    "secondPlace",
                                    !isPreview
                                  )}
                                  {renderWinnersList(
                                    currentPoster?.layout?.thirdPlace,
                                    thirdPlaceWinners,
                                    "thirdPlace",
                                    !isPreview
                                  )}
                                </>
                              );
                            })()}

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
                    <Button
                      onClick={handleDownloadPoster}
                      disabled={isLoading}
                      className="w-full max-w-md mt-3 flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Download Poster
                        </>
                      )}
                    </Button>
                  </div> {/* End Right Column */}
                </div> {/* End Grid */}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PosterCustomizer;
