"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Upload,
  Trash2,
  Loader2,
  Download,
  ImageIcon,
  CheckCircle2,
  LayoutGrid,
  Wand2,
  RefreshCw,
  X,
  ZoomIn,
  Move,
} from "lucide-react";
import { toast } from "sonner";

// ──────────────────────────────────────────────────────────
// Helper: load an Image from a URL or data-URL
// ──────────────────────────────────────────────────────────
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ──────────────────────────────────────────────────────────
// Sub-component: Frame thumbnail card
// ──────────────────────────────────────────────────────────
function FrameCard({ frame, selected, onSelect, onDelete }) {
  return (
    <div
      onClick={() => onSelect(frame)}
      className={`group relative rounded-xl border-2 cursor-pointer overflow-hidden transition-all duration-200 bg-card hover:shadow-lg ${
        selected
          ? "border-primary shadow-md scale-[1.02]"
          : "border-border hover:border-primary/50"
      }`}
    >
      {/* Frame preview — checkerboard bg to show transparency */}
      <div
        className="w-full aspect-square"
        style={{
          backgroundImage:
            "linear-gradient(45deg,#e0e0e0 25%,transparent 25%),linear-gradient(-45deg,#e0e0e0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e0e0e0 75%),linear-gradient(-45deg,transparent 75%,#e0e0e0 75%)",
          backgroundSize: "12px 12px",
          backgroundPosition: "0 0,0 6px,6px -6px,-6px 0",
        }}
      >
        <img
          src={frame.url}
          alt={frame.name}
          className="w-full h-full object-contain"
        />
      </div>

      {/* Name */}
      <div className="px-2 py-1.5 text-xs font-medium truncate text-center">
        {frame.name}
      </div>

      {/* Selected badge */}
      {selected && (
        <div className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground rounded-full p-0.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
        </div>
      )}

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(frame);
        }}
        className="absolute top-1.5 right-1.5 bg-destructive/90 text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────
export default function FrameEditor() {
  // ── Frames state ──
  const [frames, setFrames] = useState([]);
  const [framesLoading, setFramesLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [frameName, setFrameName] = useState("");
  const [frameToDelete, setFrameToDelete] = useState(null);
  const frameFileRef = useRef(null);

  // ── Editor state ──
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [photoSrc, setPhotoSrc] = useState(null); // object URL, never uploaded

  const photoFileRef = useRef(null);

  // ── Canvas / adjustment state ──
  const canvasRef = useRef(null);
  const [photoScale, setPhotoScale] = useState(100);   // percent
  const [photoX, setPhotoX] = useState(0);             // offset px from center
  const [photoY, setPhotoY] = useState(0);
  const [rendering, setRendering] = useState(false);

  // ── Delete dialog ──
  const [deleteOpen, setDeleteOpen] = useState(false);

  // ── Tab ──
  const [activeTab, setActiveTab] = useState("frames");

  // ────────────────────────────────────────────────────────
  // Load frames on mount
  // ────────────────────────────────────────────────────────
  useEffect(() => {
    fetchFrames();
  }, []);

  async function fetchFrames() {
    try {
      setFramesLoading(true);
      const res = await fetch("/api/frames");
      const data = await res.json();
      if (data.success) setFrames(data.frames);
    } catch {
      toast.error("Failed to load frames");
    } finally {
      setFramesLoading(false);
    }
  }

  // ────────────────────────────────────────────────────────
  // Upload frame to server
  // ────────────────────────────────────────────────────────
  const handleFrameFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "image/png") {
      toast.error("Only PNG files are accepted for frames");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Frame file must be under 10 MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setUploading(true);
        const res = await fetch("/api/frames", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: reader.result,
            name: frameName.trim() || file.name.replace(/\.[^.]+$/, ""),
          }),
        });
        const data = await res.json();
        if (data.success) {
          setFrames((prev) => [data.frame, ...prev]);
          setFrameName("");
          toast.success("Frame uploaded successfully!");
        } else {
          toast.error(data.message || "Upload failed");
        }
      } catch {
        toast.error("Upload failed");
      } finally {
        setUploading(false);
        e.target.value = "";
      }
    };
    reader.readAsDataURL(file);
  }, [frameName]);

  // ────────────────────────────────────────────────────────
  // Delete frame
  // ────────────────────────────────────────────────────────
  function confirmDelete(frame) {
    setFrameToDelete(frame);
    setDeleteOpen(true);
  }

  async function handleDelete() {
    if (!frameToDelete) return;
    try {
      const res = await fetch(`/api/frames?id=${frameToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setFrames((prev) => prev.filter((f) => f.id !== frameToDelete.id));
        if (selectedFrame?.id === frameToDelete.id) setSelectedFrame(null);
        toast.success("Frame deleted");
      } else {
        toast.error(data.message || "Delete failed");
      }
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleteOpen(false);
      setFrameToDelete(null);
    }
  }

  // ────────────────────────────────────────────────────────
  // Load photo (local only — never uploaded)
  // ────────────────────────────────────────────────────────
  const handlePhotoFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (photoSrc) URL.revokeObjectURL(photoSrc);
    const url = URL.createObjectURL(file);
    setPhotoSrc(url);
    setPhotoScale(100);
    setPhotoX(0);
    setPhotoY(0);
    e.target.value = "";
  }, [photoSrc]);

  // ────────────────────────────────────────────────────────
  // Render canvas whenever inputs change
  // ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current || !selectedFrame) return;
    renderCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFrame, photoSrc, photoScale, photoX, photoY]);

  const renderCanvas = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedFrame) return;

    setRendering(true);
    try {
      const frameImg = await loadImage(selectedFrame.url);
      const W = frameImg.naturalWidth || 1000;
      const H = frameImg.naturalHeight || 1000;

      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, W, H);

      // 1. Draw photo BEHIND the frame
      if (photoSrc) {
        const photoImg = await loadImage(photoSrc);
        const scaleFactor = photoScale / 100;

        const photoAspect = photoImg.naturalWidth / photoImg.naturalHeight;
        const canvasAspect = W / H;

        let baseW, baseH;
        if (photoAspect > canvasAspect) {
          baseH = H;
          baseW = H * photoAspect;
        } else {
          baseW = W;
          baseH = W / photoAspect;
        }

        const drawW = baseW * scaleFactor;
        const drawH = baseH * scaleFactor;
        const drawX = (W - drawW) / 2 + photoX;
        const drawY = (H - drawH) / 2 + photoY;

        ctx.drawImage(photoImg, drawX, drawY, drawW, drawH);
      } else {
        ctx.fillStyle = "#f3f4f6";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#9ca3af";
        ctx.font = `${W * 0.04}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Insert a photo to preview", W / 2, H / 2);
      }

      // 2. Draw frame ON TOP
      ctx.drawImage(frameImg, 0, 0, W, H);
    } catch (err) {
      console.error("Canvas render error:", err);
    } finally {
      setRendering(false);
    }
  }, [selectedFrame, photoSrc, photoScale, photoX, photoY]);

  // ────────────────────────────────────────────────────────
  // Download
  // ────────────────────────────────────────────────────────
  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `framed-photo-${Date.now()}.png`;
    a.click();
    toast.success("Photo downloaded!");
  }

  // ────────────────────────────────────────────────────────
  // Cleanup
  // ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (photoSrc) URL.revokeObjectURL(photoSrc);
    };
  }, []);

  // ────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────
  return (
    <>
      <div className="space-y-6 mt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 h-9">
            <TabsTrigger value="frames" className="gap-2 px-4 text-sm">
              <LayoutGrid className="w-4 h-4" />
              Manage Frames
              {frames.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {frames.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="editor" className="gap-2 px-4 text-sm">
              <Wand2 className="w-4 h-4" />
              Apply Frame
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════════════════════════════════ */}
          {/* TAB 1 — Manage Frames                          */}
          {/* ═══════════════════════════════════════════════ */}
          <TabsContent value="frames" className="space-y-4">
            {/* Upload card */}
            <Card>
              <CardHeader className="bg-muted/20 border-b mb-4 pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload New Frame
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Label htmlFor="frame-name" className="text-xs mb-1.5 block text-muted-foreground">
                      Frame name (optional)
                    </Label>
                    <Input
                      id="frame-name"
                      value={frameName}
                      onChange={(e) => setFrameName(e.target.value)}
                      placeholder="e.g. Gold Border, Floral 2026…"
                      className="h-9"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={() => frameFileRef.current?.click()}
                      disabled={uploading}
                      className="h-9 gap-2 min-w-[160px]"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading…
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Choose PNG Frame
                        </>
                      )}
                    </Button>
                    <input
                      ref={frameFileRef}
                      type="file"
                      accept="image/png"
                      className="hidden"
                      onChange={handleFrameFileChange}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Only PNG files are supported. Use transparent PNGs for best results.
                </p>
              </CardContent>
            </Card>

            {/* Frames grid */}
            <Card>
              <CardHeader className="bg-muted/20 border-b mb-4 pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  Saved Frames
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchFrames}
                  className="h-8 gap-1 text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {framesLoading ? (
                  <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading frames…
                  </div>
                ) : frames.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                    <ImageIcon className="w-10 h-10 opacity-30" />
                    <p className="text-sm">No frames uploaded yet</p>
                    <p className="text-xs">Upload a PNG frame above to get started</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {frames.map((frame) => (
                      <FrameCard
                        key={frame.id}
                        frame={frame}
                        selected={selectedFrame?.id === frame.id}
                        onSelect={(f) => {
                          setSelectedFrame(f);
                          setActiveTab("editor");
                          toast.success(`Frame "${f.name}" selected`);
                        }}
                        onDelete={confirmDelete}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════════════════════════════════════ */}
          {/* TAB 2 — Apply Frame                            */}
          {/* ═══════════════════════════════════════════════ */}
          <TabsContent value="editor">
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
              {/* ── Controls panel ── */}
              <div className="space-y-4">
                {/* Frame selector */}
                <Card>
                  <CardHeader className="bg-muted/20 border-b pb-3 mb-3">
                    <CardTitle className="text-sm">Selected Frame</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedFrame ? (
                      <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                        <div
                          className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0"
                          style={{
                            backgroundImage:
                              "linear-gradient(45deg,#e0e0e0 25%,transparent 25%),linear-gradient(-45deg,#e0e0e0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e0e0e0 75%),linear-gradient(-45deg,transparent 75%,#e0e0e0 75%)",
                            backgroundSize: "8px 8px",
                            backgroundPosition: "0 0,0 4px,4px -4px,-4px 0",
                          }}
                        >
                          <img
                            src={selectedFrame.url}
                            alt={selectedFrame.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{selectedFrame.name}</p>
                          <p className="text-xs text-muted-foreground">Active frame</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 flex-shrink-0"
                          onClick={() => setSelectedFrame(null)}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-sm text-muted-foreground space-y-2">
                        <ImageIcon className="w-8 h-8 mx-auto opacity-30" />
                        <p>No frame selected</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => setActiveTab("frames")}
                        >
                          Go to Frames tab
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Photo upload */}
                <Card>
                  <CardHeader className="bg-muted/20 border-b pb-3 mb-3">
                    <CardTitle className="text-sm">Insert Photo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full h-9 gap-2 text-sm"
                      onClick={() => photoFileRef.current?.click()}
                    >
                      <Upload className="w-4 h-4" />
                      {photoSrc ? "Change Photo" : "Choose Photo"}
                    </Button>
                    <input
                      ref={photoFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoFileChange}
                    />
                    {photoSrc && (
                      <div className="relative">
                        <img
                          src={photoSrc}
                          alt="Selected photo"
                          className="w-full rounded-md object-cover max-h-28"
                        />
                        <button
                          onClick={() => {
                            URL.revokeObjectURL(photoSrc);
                            setPhotoSrc(null);
                          }}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Photo is loaded locally and never saved to the server.
                    </p>
                  </CardContent>
                </Card>

                {/* Adjustments */}
                <Card>
                  <CardHeader className="bg-muted/20 border-b pb-3 mb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Move className="w-4 h-4" />
                      Photo Adjustments
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Scale */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs flex items-center gap-1">
                          <ZoomIn className="w-3.5 h-3.5" />
                          Scale
                        </Label>
                        <span className="text-xs text-muted-foreground font-mono">
                          {photoScale}%
                        </span>
                      </div>
                      <Slider
                        min={20}
                        max={200}
                        step={1}
                        value={[photoScale]}
                        onValueChange={([v]) => setPhotoScale(v)}
                      />
                    </div>

                    {/* X offset */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Horizontal</Label>
                        <span className="text-xs text-muted-foreground font-mono">
                          {photoX > 0 ? "+" : ""}{photoX}px
                        </span>
                      </div>
                      <Slider
                        min={-500}
                        max={500}
                        step={1}
                        value={[photoX]}
                        onValueChange={([v]) => setPhotoX(v)}
                      />
                    </div>

                    {/* Y offset */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Vertical</Label>
                        <span className="text-xs text-muted-foreground font-mono">
                          {photoY > 0 ? "+" : ""}{photoY}px
                        </span>
                      </div>
                      <Slider
                        min={-500}
                        max={500}
                        step={1}
                        value={[photoY]}
                        onValueChange={([v]) => setPhotoY(v)}
                      />
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs gap-1.5"
                      onClick={() => {
                        setPhotoScale(100);
                        setPhotoX(0);
                        setPhotoY(0);
                      }}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Reset Adjustments
                    </Button>
                  </CardContent>
                </Card>

                {/* Download */}
                <Button
                  onClick={handleDownload}
                  disabled={!selectedFrame || rendering}
                  className="w-full h-9 gap-2 font-semibold"
                >
                  {rendering ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Rendering…
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Download Framed Photo
                    </>
                  )}
                </Button>
              </div>

              {/* ── Canvas preview ── */}
              <Card className="overflow-hidden">
                <CardHeader className="bg-muted/20 border-b pb-3 mb-0 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Preview</CardTitle>
                  {rendering && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Updating…
                    </span>
                  )}
                </CardHeader>
                <CardContent className="p-3">
                  {selectedFrame ? (
                    <div
                      className="w-full flex items-center justify-center bg-muted/30 rounded-lg overflow-hidden min-h-[300px]"
                      style={{
                        backgroundImage:
                          "linear-gradient(45deg,#e0e0e0 25%,transparent 25%),linear-gradient(-45deg,#e0e0e0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e0e0e0 75%),linear-gradient(-45deg,transparent 75%,#e0e0e0 75%)",
                        backgroundSize: "16px 16px",
                        backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
                      }}
                    >
                      <canvas
                        ref={canvasRef}
                        className="max-w-full max-h-[65vh] object-contain rounded shadow"
                        style={{ display: "block" }}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 text-muted-foreground">
                      <div className="p-6 bg-muted/40 rounded-2xl">
                        <ImageIcon className="w-16 h-16 opacity-20" />
                      </div>
                      <p className="text-sm">Select a frame to start previewing</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Frame?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{frameToDelete?.name}&rdquo; from the server and
              Cloudinary. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
