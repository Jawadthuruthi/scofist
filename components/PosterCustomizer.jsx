// components/PosterCustomizer.jsx
"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Palette,
  Save,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Grid,
  Loader,
  AlertCircle,
  Upload,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import ImageUploader from "@/components/ImageUploader";

export default function PosterCustomizer({
  onSave,
  isPreview = false,
  initialSettings = null,
  isFullPage = false,
}) {
  // State management
  const [currentSettings, setCurrentSettings] = useState(initialSettings);
  const [selectedPosterIndex, setSelectedPosterIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const canvasRef = useRef(null);

  // Enhanced default poster
  const createDefaultPoster = () => ({
    name: "Default Poster",
    backgroundImage: { url: "", publicId: "" },
    layout: {
      programInfo: {
        x: 50,
        y: 8,
        visible: true,
        fontSize: 20,
        color: "ffffff",
        fontWeight: "bold",
        textAlign: "center",
      },
      divisionInfo: {
        x: 50,
        y: 15,
        visible: true,
        fontSize: 16,
        color: "ffffff",
        fontWeight: "normal",
        textAlign: "center",
      },
      resultNumber: {
        x: 50,
        y: 22,
        visible: true,
        fontSize: 14,
        color: "ffffff",
        fontWeight: "bold",
        textAlign: "center",
      },
      firstPlace: {
        x: 50,
        y: 40,
        visible: true,
        fontSize: 18,
        color: "ffffff",
        fontWeight: "bold",
        textAlign: "center",
      },
      secondPlace: {
        x: 50,
        y: 60,
        visible: true,
        fontSize: 16,
        color: "ffffff",
        fontWeight: "normal",
        textAlign: "center",
      },
      thirdPlace: {
        x: 50,
        y: 80,
        visible: true,
        fontSize: 16,
        color: "ffffff",
        fontWeight: "normal",
        textAlign: "center",
      },
    },
  });

  // Get current poster
  const currentPoster = useMemo(() => {
    return (
      currentSettings?.festival?.resultPosters?.[selectedPosterIndex] ||
      currentSettings?.resultPosters?.[selectedPosterIndex] ||
      createDefaultPoster()
    );
  }, [currentSettings, selectedPosterIndex]);

  // Fetch settings on mount
  useEffect(() => {
    if (isFullPage && !currentSettings) {
      fetchSettings();
    }
  }, [isFullPage]);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/settings");
      const data = await response.json();

      if (data.settings) {
        const festivalPosters = data.settings.festival?.resultPosters;

        if (!festivalPosters || festivalPosters.length === 0) {
          const updatedSettings = {
            ...data.settings,
            festival: {
              ...data.settings.festival,
              resultPosters: [createDefaultPoster()],
            },
          };
          setCurrentSettings(updatedSettings);
        } else {
          setCurrentSettings(data.settings);
        }
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load poster settings");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle element position update
  const updateElementPosition = (elementKey, x, y) => {
    setCurrentSettings((prev) => {
      const posters =
        prev?.festival?.resultPosters || prev?.resultPosters || [];
      const updatedPosters = [...posters];

      if (!updatedPosters[selectedPosterIndex]) {
        updatedPosters[selectedPosterIndex] = createDefaultPoster();
      }

      updatedPosters[selectedPosterIndex] = {
        ...updatedPosters[selectedPosterIndex],
        layout: {
          ...updatedPosters[selectedPosterIndex].layout,
          [elementKey]: {
            ...updatedPosters[selectedPosterIndex].layout[elementKey],
            x: Math.max(0, Math.min(100, x)),
            y: Math.max(0, Math.min(100, y)),
          },
        },
      };

      return {
        ...prev,
        festival: {
          ...prev.festival,
          resultPosters: updatedPosters,
        },
      };
    });
  };

  // Handle element property update
  const updateElementProperty = (elementKey, property, value) => {
    setCurrentSettings((prev) => {
      const posters =
        prev?.festival?.resultPosters || prev?.resultPosters || [];
      const updatedPosters = [...posters];

      if (!updatedPosters[selectedPosterIndex]) {
        updatedPosters[selectedPosterIndex] = createDefaultPoster();
      }

      updatedPosters[selectedPosterIndex] = {
        ...updatedPosters[selectedPosterIndex],
        layout: {
          ...updatedPosters[selectedPosterIndex].layout,
          [elementKey]: {
            ...updatedPosters[selectedPosterIndex].layout[elementKey],
            [property]: value,
          },
        },
      };

      return {
        ...prev,
        festival: {
          ...prev.festival,
          resultPosters: updatedPosters,
        },
      };
    });
  };

  // Mouse drag handlers
  const handleMouseDown = (e, elementKey) => {
    if (isPreview) return;
    e.stopPropagation();
    setSelectedElement(elementKey);
    setIsDragging(true);
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging || !selectedElement || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      updateElementPosition(selectedElement, x, y);
    },
    [isDragging, selectedElement]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Add new poster
  const handleAddPoster = () => {
    const posters = currentSettings?.festival?.resultPosters || [];
    setCurrentSettings((prev) => ({
      ...prev,
      festival: {
        ...prev.festival,
        resultPosters: [...posters, createDefaultPoster()],
      },
    }));
    setSelectedPosterIndex(posters.length);
    toast.success("New poster added!");
  };

  // Delete poster
  const handleDeletePoster = () => {
    const posters = currentSettings?.festival?.resultPosters || [];
    if (posters.length <= 1) {
      toast.error("Cannot delete the last poster");
      return;
    }

    setCurrentSettings((prev) => ({
      ...prev,
      festival: {
        ...prev.festival,
        resultPosters: posters.filter((_, i) => i !== selectedPosterIndex),
      },
    }));

    setSelectedPosterIndex(Math.max(0, selectedPosterIndex - 1));
    toast.success("Poster deleted!");
  };

  // Apply preset template
  const applyTemplate = (template) => {
    const templates = {
      centered: {
        programInfo: { x: 50, y: 8 },
        divisionInfo: { x: 50, y: 15 },
        resultNumber: { x: 50, y: 22 },
        firstPlace: { x: 50, y: 40 },
        secondPlace: { x: 50, y: 60 },
        thirdPlace: { x: 50, y: 80 },
      },
      vertical: {
        programInfo: { x: 50, y: 5 },
        divisionInfo: { x: 50, y: 12 },
        resultNumber: { x: 50, y: 18 },
        firstPlace: { x: 50, y: 35 },
        secondPlace: { x: 50, y: 55 },
        thirdPlace: { x: 50, y: 75 },
      },
      traditional: {
        programInfo: { x: 50, y: 10 },
        divisionInfo: { x: 50, y: 20 },
        resultNumber: { x: 15, y: 15 },
        firstPlace: { x: 50, y: 45 },
        secondPlace: { x: 50, y: 65 },
        thirdPlace: { x: 50, y: 85 },
      },
    };

    const selectedTemplate = templates[template];
    if (!selectedTemplate) return;

    const posters = currentSettings?.festival?.resultPosters || [];
    const updatedPosters = [...posters];
    const currentLayout = updatedPosters[selectedPosterIndex]?.layout || {};

    updatedPosters[selectedPosterIndex] = {
      ...updatedPosters[selectedPosterIndex],
      layout: {
        ...currentLayout,
        ...Object.entries(selectedTemplate).reduce((acc, [key, pos]) => {
          acc[key] = {
            ...currentLayout[key],
            ...pos,
          };
          return acc;
        }, {}),
      },
    };

    setCurrentSettings((prev) => ({
      ...prev,
      festival: {
        ...prev.festival,
        resultPosters: updatedPosters,
      },
    }));

    toast.success(`${template} template applied!`);
  };

  // Save settings
  const handleSave = async () => {
    try {
      setIsSaving(true);

      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          festival: {
            ...currentSettings?.festival,
            resultPosters: currentSettings?.festival?.resultPosters,
          },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Poster settings saved successfully!");
        if (onSave) onSave(data.settings);
      } else {
        throw new Error(data.message || "Failed to save");
      }
    } catch (error) {
      console.error("Error saving poster:", error);
      toast.error(error.message || "Failed to save poster settings");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle background image upload - FIXED
  const handleBackgroundUpload = (imageData) => {
    console.log("Image uploaded:", imageData); // Debug log

    const posters = currentSettings?.festival?.resultPosters || [];
    const updatedPosters = [...posters];

    updatedPosters[selectedPosterIndex] = {
      ...updatedPosters[selectedPosterIndex],
      backgroundImage: {
        url: imageData.url,
        publicId: imageData.publicId,
      },
    };

    setCurrentSettings((prev) => ({
      ...prev,
      festival: {
        ...prev.festival,
        resultPosters: updatedPosters,
      },
    }));

    toast.success("Background image uploaded!");
  };

  // Render element on canvas - REMOVED GLASS EFFECT
  const renderElement = (elementKey, elementConfig) => {
    const { x, y, visible, color, fontSize, fontWeight, textAlign } =
      elementConfig;

    if (!visible) return null;

    const style = {
      position: "absolute",
      left: `${x}%`,
      top: `${y}%`,
      transform: "translate(-50%, -50%)",
      color: `#${color}`,
      fontSize: `${fontSize}px`,
      fontWeight: fontWeight || "normal",
      textAlign: textAlign || "center",
      cursor: isPreview ? "default" : "move",
      userSelect: "none",
      padding: "8px 12px",
      border:
        selectedElement === elementKey
          ? "2px dashed #3b82f6"
          : "2px dashed rgba(59, 130, 246, 0.3)",
      borderRadius: "6px",
      background:
        selectedElement === elementKey
          ? "rgba(59, 130, 246, 0.1)"
          : "rgba(0, 0, 0, 0.05)",
      transition: selectedElement === elementKey ? "none" : "all 0.2s",
      whiteSpace: "nowrap",
      zIndex: selectedElement === elementKey ? 10 : 1,
      // ✅ REMOVED backdrop-filter: "blur(2px)"
    };

    let content = "";
    switch (elementKey) {
      case "programInfo":
        content = "Program Name";
        break;
      case "divisionInfo":
        content = "Division Name";
        break;
      case "resultNumber":
        content = "Result #01";
        break;
      case "firstPlace":
        content = "🥇 Winner Name";
        break;
      case "secondPlace":
        content = "🥈 Runner Up";
        break;
      case "thirdPlace":
        content = "🥉 Third Place";
        break;
      default:
        content = elementKey;
    }

    return (
      <div
        key={elementKey}
        style={style}
        onMouseDown={(e) => handleMouseDown(e, elementKey)}
        onClick={() => !isPreview && setSelectedElement(elementKey)}
      >
        {content}
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const posters = currentSettings?.festival?.resultPosters || [];

  // ✅ FIXED: Get background image URL properly
  const backgroundImageUrl = currentPoster?.backgroundImage?.url || "";

  console.log("Current poster background:", {
    url: backgroundImageUrl,
    publicId: currentPoster?.backgroundImage?.publicId,
  }); // Debug log

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      {/* Header Card */}
      <Card className="border-2 border-orange-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                <Palette className="h-8 w-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl text-orange-700">
                  Poster Customizer
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Design stunning result posters with drag-and-drop
                </p>
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="lg"
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-300 hover:to-red-300"
            >
              {isSaving ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Poster Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2">
              <Label className="text-base font-semibold mb-2 block">
                Select Poster
              </Label>
              <Select
                value={selectedPosterIndex.toString()}
                onValueChange={(val) => setSelectedPosterIndex(parseInt(val))}
              >
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {posters.map((poster, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {poster.name || `Poster ${index + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAddPoster}
                variant="outline"
                className="flex-1"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
              <Button
                onClick={handleDeletePoster}
                variant="outline"
                className="flex-1"
                disabled={posters.length <= 1}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>

          {/* Poster Name */}
          <div className="mt-4">
            <Label className="text-base font-semibold">Poster Name</Label>
            <Input
              value={currentPoster.name || ""}
              onChange={(e) => {
                const updatedPosters = [...posters];
                updatedPosters[selectedPosterIndex] = {
                  ...updatedPosters[selectedPosterIndex],
                  name: e.target.value,
                };
                setCurrentSettings((prev) => ({
                  ...prev,
                  festival: {
                    ...prev.festival,
                    resultPosters: updatedPosters,
                  },
                }));
              }}
              placeholder="Enter poster name"
              className="mt-2 h-12"
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Grid: Canvas + Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas Preview - Fixed Size */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Grid className="h-5 w-5" />
              Canvas Preview (300x300px)
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Click and drag elements to reposition them
            </p>
          </CardHeader>
          <CardContent>
            {/* Fixed Size Canvas Container */}
            <div className="flex justify-center">
              <div
                ref={canvasRef}
                className="relative bg-gray-200 rounded-lg overflow-hidden shadow-lg"
                style={{
                  width: "300px",
                  height: "300px",
                  // ✅ FIXED: Properly display background image
                  backgroundImage: backgroundImageUrl
                    ? `url("${backgroundImageUrl}")`
                    : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }}
              >
                {/* Render all elements */}
                {Object.entries(currentPoster.layout || {}).map(
                  ([key, config]) => renderElement(key, config)
                )}

                {/* Grid overlay */}
                <div className="absolute inset-0 pointer-events-none opacity-10">
                  <svg width="100%" height="100%">
                    <defs>
                      <pattern
                        id="grid"
                        width="30"
                        height="30"
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d="M 30 0 L 0 0 0 30"
                          fill="none"
                          stroke="white"
                          strokeWidth="1"
                        />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                  </svg>
                </div>

                {/* No background indicator */}
                {!backgroundImageUrl && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center text-white/70">
                      <ImageIcon className="h-16 w-16 mx-auto mb-2" />
                      <p className="text-sm font-medium">No Background Image</p>
                      <p className="text-xs">Upload one below</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Background Upload */}
            <div className="mt-6">
              <Label className="text-base font-semibold block mb-2">
                Background Image (1024x1024 recommended)
              </Label>
              <ImageUploader
                value={currentPoster.backgroundImage}
                onChange={handleBackgroundUpload}
                maxFileSize={2 * 1024 * 1024}
                allowedTypes={["image/png", "image/jpeg", "image/jpg"]}
                aspectRatio="1:1"
                minWidth={300}
                minHeight={300}
              />
              {backgroundImageUrl && (
                <p className="text-xs text-muted-foreground mt-2">
                  ✓ Background image loaded successfully
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Element Controls */}
        <Card className="lg:sticky lg:top-4 h-fit">
          <CardHeader>
            <CardTitle>Element Controls</CardTitle>
            <p className="text-sm text-muted-foreground">
              {selectedElement
                ? `Editing: ${selectedElement.replace(/([A-Z])/g, " $1").trim()}`
                : "Select an element to customize"}
            </p>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[300px] overflow-y-auto">
            {selectedElement && currentPoster.layout?.[selectedElement] ? (
              <div className="space-y-4">
                {/* Visibility Toggle */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <Label className="font-semibold">Visible</Label>
                  <Button
                    variant={
                      currentPoster.layout[selectedElement].visible
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      updateElementProperty(
                        selectedElement,
                        "visible",
                        !currentPoster.layout[selectedElement].visible
                      )
                    }
                  >
                    {currentPoster.layout[selectedElement].visible ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Color Picker */}
                <div>
                  <Label className="font-semibold">Text Color</Label>
                  <div className="flex gap-2 mt-2">
                    <input
                      type="color"
                      value={`#${currentPoster.layout[selectedElement].color}`}
                      onChange={(e) =>
                        updateElementProperty(
                          selectedElement,
                          "color",
                          e.target.value.replace("#", "")
                        )
                      }
                      className="w-20 h-12 rounded cursor-pointer"
                    />
                    <Input
                      value={currentPoster.layout[selectedElement].color}
                      onChange={(e) =>
                        updateElementProperty(
                          selectedElement,
                          "color",
                          e.target.value.replace("#", "")
                        )
                      }
                      placeholder="ffffff"
                      maxLength={6}
                      className="flex-1 h-12"
                    />
                  </div>
                </div>

                {/* Font Size */}
                <div>
                  <div className="flex justify-between mb-2">
                    <Label className="font-semibold">Font Size</Label>
                    <span className="text-sm font-mono text-muted-foreground">
                      {currentPoster.layout[selectedElement].fontSize}px
                    </span>
                  </div>
                  <Slider
                    value={[currentPoster.layout[selectedElement].fontSize]}
                    onValueChange={([value]) =>
                      updateElementProperty(selectedElement, "fontSize", value)
                    }
                    min={8}
                    max={48}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* Position X */}
                <div>
                  <div className="flex justify-between mb-2">
                    <Label className="font-semibold">Position X</Label>
                    <span className="text-sm font-mono text-muted-foreground">
                      {currentPoster.layout[selectedElement].x.toFixed(1)}%
                    </span>
                  </div>
                  <Slider
                    value={[currentPoster.layout[selectedElement].x]}
                    onValueChange={([value]) =>
                      updateElementProperty(selectedElement, "x", value)
                    }
                    min={0}
                    max={100}
                    step={0.5}
                  />
                </div>

                {/* Position Y */}
                <div>
                  <div className="flex justify-between mb-2">
                    <Label className="font-semibold">Position Y</Label>
                    <span className="text-sm font-mono text-muted-foreground">
                      {currentPoster.layout[selectedElement].y.toFixed(1)}%
                    </span>
                  </div>
                  <Slider
                    value={[currentPoster.layout[selectedElement].y]}
                    onValueChange={([value]) =>
                      updateElementProperty(selectedElement, "y", value)
                    }
                    min={0}
                    max={100}
                    step={0.5}
                  />
                </div>

                {/* Font Weight */}
                <div>
                  <Label className="font-semibold">Font Weight</Label>
                  <Select
                    value={currentPoster.layout[selectedElement].fontWeight}
                    onValueChange={(value) =>
                      updateElementProperty(
                        selectedElement,
                        "fontWeight",
                        value
                      )
                    }
                  >
                    <SelectTrigger className="mt-2 h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="bold">Bold</SelectItem>
                      <SelectItem value="lighter">Light</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Text Align */}
                <div>
                  <Label className="font-semibold">Text Align</Label>
                  <Select
                    value={currentPoster.layout[selectedElement].textAlign}
                    onValueChange={(value) =>
                      updateElementProperty(selectedElement, "textAlign", value)
                    }
                  >
                    <SelectTrigger className="mt-2 h-12">
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
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground font-medium mb-2">
                  No Element Selected
                </p>
                <p className="text-sm text-muted-foreground">
                  Click on any element in the canvas to customize it
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Templates</CardTitle>
          <p className="text-sm text-muted-foreground">
            Apply pre-designed layouts instantly
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => applyTemplate("centered")}
              className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-blue-50 hover:border-blue-300 transition-all"
            >
              <div className="text-2xl">📐</div>
              <div className="text-center">
                <div className="font-semibold">Centered Layout</div>
                <div className="text-xs text-muted-foreground">
                  Balanced design
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => applyTemplate("vertical")}
              className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-green-50 hover:border-green-300 transition-all"
            >
              <div className="text-2xl">📊</div>
              <div className="text-center">
                <div className="font-semibold">Vertical Stack</div>
                <div className="text-xs text-muted-foreground">
                  Clean vertical
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => applyTemplate("traditional")}
              className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-orange-50 hover:border-orange-300 transition-all"
            >
              <div className="text-2xl">🎨</div>
              <div className="text-center">
                <div className="font-semibold">Traditional</div>
                <div className="text-xs text-muted-foreground">
                  Classic style
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
