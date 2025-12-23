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
} from "lucide-react";
import { toast } from "sonner";
import ImageUploader from "@/components/ImageUploader";

export default function PosterCustomizer({
  poster,
  onLayoutChange,
  onBackgroundChange,
  onSave,
  isPreview = false,
  initialSettings = null,
  tenantId = null,
  user = null,
  isFullPage = false,
}) {
  // State management
  const [currentSettings, setCurrentSettings] = useState(initialSettings);
  const [selectedPosterIndex, setSelectedPosterIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({
    width: 300,
    height: 300,
  });
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileControls, setShowMobileControls] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const presetTemplates = useState([
    { name: "Centered Layout", value: "centered" },
    { name: "Vertical Stack", value: "vertical" },
    { name: "Traditional", value: "traditional" },
  ]);

  const canvasRef = useRef(null);
  const posterRef = useRef(null);

  // Device detection
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

  // Initialize for full page mode
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

  // Enhanced default poster for square templates
  const createDefaultPoster = () => ({
    name: "Default Poster",
    backgroundImage: { url: "", publicId: "" },
    layout: {
      programInfo: {
        x: 50,
        y: 5,
        visible: true,
        fontSize: 14,
        responsiveSize: true,
        minFontSize: 18,
        maxFontSize: 32,
        color: "ffffff",
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
        minFontSize: 14,
        maxFontSize: 24,
        color: "ffffff",
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
        minFontSize: 14,
        maxFontSize: 28,
        color: "ffffff",
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
        minFontSize: 8,
        maxFontSize: 24,
        color: "ffffff",
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
        minFontSize: 8,
        maxFontSize: 24,
        color: "ffffff",
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
        minFontSize: 8,
        maxFontSize: 24,
        color: "ffffff",
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

  // Get current poster
  const currentPoster = useMemo(() => {
    return (
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
        // If no resultPosters, create default
        if (
          !data.settings.festival?.resultPosters ||
          data.settings.festival.resultPosters.length === 0
        ) {
          setCurrentSettings({
            ...data.settings,
            festival: {
              ...data.settings.festival,
              resultPosters: [createDefaultPoster()],
            },
          });
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

  // Update container size based on canvas
  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current) {
        const { width, height } = canvasRef.current.getBoundingClientRect();
        setContainerSize({ width, height });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Handle element position update
  const updateElementPosition = (elementKey, x, y) => {
    setCurrentSettings((prev) => {
      const updatedPosters = [...(prev?.resultPosters || [])];
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
        resultPosters: updatedPosters,
      };
    });
  };

  // Handle element property update
  const updateElementProperty = (elementKey, property, value) => {
    setCurrentSettings((prev) => {
      const updatedPosters = [...(prev?.resultPosters || [])];
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
        resultPosters: updatedPosters,
      };
    });
  };

  // Mouse drag handlers
  const handleMouseDown = (e, elementKey) => {
    if (isPreview) return;

    e.stopPropagation();
    setSelectedElement(elementKey);
    setIsDragging(true);

    const rect = canvasRef.current.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
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
    setCurrentSettings((prev) => ({
      ...prev,
      resultPosters: [...(prev?.resultPosters || []), createDefaultPoster()],
    }));
    setSelectedPosterIndex((prev?.resultPosters || []).length);
    toast.success("New poster added!");
  };

  // Delete poster
  const handleDeletePoster = () => {
    if ((currentSettings?.resultPosters || []).length <= 1) {
      toast.error("Cannot delete the last poster");
      return;
    }

    setCurrentSettings((prev) => ({
      ...prev,
      resultPosters: prev.resultPosters.filter(
        (_, i) => i !== selectedPosterIndex
      ),
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
        firstPlace: { x: 50, y: 35 },
        secondPlace: { x: 50, y: 55 },
        thirdPlace: { x: 50, y: 75 },
      },
      vertical: {
        programInfo: { x: 50, y: 5 },
        divisionInfo: { x: 50, y: 12 },
        resultNumber: { x: 50, y: 18 },
        firstPlace: { x: 50, y: 30 },
        secondPlace: { x: 50, y: 50 },
        thirdPlace: { x: 50, y: 70 },
      },
      traditional: {
        programInfo: { x: 50, y: 10 },
        divisionInfo: { x: 50, y: 20 },
        resultNumber: { x: 15, y: 15 },
        firstPlace: { x: 50, y: 40 },
        secondPlace: { x: 50, y: 60 },
        thirdPlace: { x: 50, y: 80 },
      },
    };

    const selectedTemplate = templates[template];
    if (!selectedTemplate) return;

    setCurrentSettings((prev) => {
      const updatedPosters = [...(prev?.resultPosters || [])];
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

      return {
        ...prev,
        resultPosters: updatedPosters,
      };
    });

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
            resultPosters: currentSettings?.resultPosters,
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

  // Handle background image upload
  const handleBackgroundUpload = async (imageData) => {
    setCurrentSettings((prev) => {
      const updatedPosters = [...(prev?.resultPosters || [])];
      updatedPosters[selectedPosterIndex] = {
        ...updatedPosters[selectedPosterIndex],
        backgroundImage: imageData,
      };

      return {
        ...prev,
        resultPosters: updatedPosters,
      };
    });

    toast.success("Background image uploaded!");
  };

  // Render element on canvas
  const renderElement = (elementKey, elementConfig) => {
    const { x, y, visible, color, fontSize } = elementConfig;

    if (!visible) return null;

    const style = {
      position: "absolute",
      left: `${x}%`,
      top: `${y}%`,
      transform: "translate(-50%, -50%)",
      color: `#${color}`,
      fontSize: `${fontSize}px`,
      cursor: isPreview ? "default" : "move",
      userSelect: "none",
      padding: "8px",
      border:
        selectedElement === elementKey
          ? "2px dashed #3b82f6"
          : "2px dashed transparent",
      borderRadius: "4px",
      transition: selectedElement === elementKey ? "none" : "border 0.2s",
      whiteSpace: "nowrap",
      zIndex: selectedElement === elementKey ? 10 : 1,
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
        content = "1st: Winner Name";
        break;
      case "secondPlace":
        content = "2nd: Runner Up";
        break;
      case "thirdPlace":
        content = "3rd: Third Place";
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
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <Palette className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Poster Customizer</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Design stunning result posters with drag-and-drop
                </p>
              </div>
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
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

      {/* Poster Selector & Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label>Select Poster</Label>
              <Select
                value={selectedPosterIndex.toString()}
                onValueChange={(val) => setSelectedPosterIndex(parseInt(val))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(currentSettings?.resultPosters || []).map(
                    (poster, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {poster.name || `Poster ${index + 1}`}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddPoster} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Poster
              </Button>
              <Button
                onClick={handleDeletePoster}
                variant="outline"
                size="sm"
                disabled={(currentSettings?.resultPosters || []).length <= 1}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>

          {/* Poster Name */}
          <div className="mt-4">
            <Label>Poster Name</Label>
            <Input
              value={currentPoster.name || ""}
              onChange={(e) => {
                setCurrentSettings((prev) => {
                  const updatedPosters = [...(prev?.resultPosters || [])];
                  updatedPosters[selectedPosterIndex] = {
                    ...updatedPosters[selectedPosterIndex],
                    name: e.target.value,
                  };
                  return { ...prev, resultPosters: updatedPosters };
                });
              }}
              placeholder="Enter poster name"
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Layout: Canvas + Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas Preview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Grid className="h-5 w-5" />
              Canvas Preview
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Drag elements to reposition them
            </p>
          </CardHeader>
          <CardContent>
            <div
              ref={canvasRef}
              className="relative w-full bg-gray-100 rounded-lg overflow-hidden"
              style={{
                aspectRatio: "1/1",
                backgroundImage: currentPoster.backgroundImage?.url
                  ? `url(${currentPoster.backgroundImage.url})`
                  : "none",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {/* Render all elements */}
              {Object.entries(currentPoster.layout || {}).map(([key, config]) =>
                renderElement(key, config)
              )}

              {/* Grid overlay */}
              <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="grid grid-cols-10 grid-rows-10 h-full w-full">
                  {Array.from({ length: 100 }).map((_, i) => (
                    <div key={i} className="border border-gray-300" />
                  ))}
                </div>
              </div>
            </div>

            {/* Background Upload */}
            <div className="mt-4">
              <Label>Background Image (1024x1024 recommended)</Label>
              <ImageUploader
                folder="posters"
                onUploadSuccess={handleBackgroundUpload}
                currentImage={currentPoster.backgroundImage}
                aspectRatio="1:1"
                maxFileSize={2 * 1024 * 1024}
                allowedTypes={["image/svg+xml", "image/png", "image/jpeg"]}
              />
            </div>
          </CardContent>
        </Card>

        {/* Element Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Element Controls</CardTitle>
            <p className="text-sm text-muted-foreground">
              {selectedElement
                ? `Editing: ${selectedElement}`
                : "Select an element to customize"}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedElement && currentPoster.layout?.[selectedElement] && (
              <div className="space-y-4">
                {/* Visibility Toggle */}
                <div className="flex items-center justify-between">
                  <Label>Visible</Label>
                  <Button
                    variant="outline"
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
                  <Label>Text Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={`#${currentPoster.layout[selectedElement].color}`}
                      onChange={(e) =>
                        updateElementProperty(
                          selectedElement,
                          "color",
                          e.target.value.replace("#", "")
                        )
                      }
                      className="w-20 h-10"
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
                    />
                  </div>
                </div>

                {/* Font Size */}
                <div>
                  <Label>
                    Font Size: {currentPoster.layout[selectedElement].fontSize}
                    px
                  </Label>
                  <Slider
                    value={[currentPoster.layout[selectedElement].fontSize]}
                    onValueChange={([value]) =>
                      updateElementProperty(selectedElement, "fontSize", value)
                    }
                    min={8}
                    max={48}
                    step={1}
                  />
                </div>

                {/* Position X */}
                <div>
                  <Label>
                    Position X:{" "}
                    {currentPoster.layout[selectedElement].x.toFixed(1)}%
                  </Label>
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
                  <Label>
                    Position Y:{" "}
                    {currentPoster.layout[selectedElement].y.toFixed(1)}%
                  </Label>
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
                  <Label>Font Weight</Label>
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
                    <SelectTrigger>
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
                  <Label>Text Align</Label>
                  <Select
                    value={currentPoster.layout[selectedElement].textAlign}
                    onValueChange={(value) =>
                      updateElementProperty(selectedElement, "textAlign", value)
                    }
                  >
                    <SelectTrigger>
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
            )}

            {!selectedElement && (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
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
            {presetTemplates[0].map((template) => (
              <Button
                key={template.value}
                variant="outline"
                onClick={() => applyTemplate(template.value)}
                className="h-20"
              >
                <div className="text-center">
                  <div className="font-semibold">{template.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Quick layout preset
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
