"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Camera,
  Video,
  Upload,
  Link as LinkIcon,
  Trash2,
  Edit2,
  ExternalLink,
  Play,
  X,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Maximize2,
  Film,
  Layers,
  Eye,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Progress } from "@/components/ui/progress";
import { parseVideoUrl, PLATFORM_INFO } from "@/lib/videoUtils";

const PRESET_CATEGORIES = [
  "Stage Events",
  "Off-Stage",
  "Inauguration",
  "Crowd & Vibes",
  "Prize Distribution",
  "Behind the Scenes",
  "Exhibition",
  "General",
];

export default function ProgramCommitteeGallery({ activeYear = "2026" }) {
  // Extract clean 4-digit or safe year string (e.g. "2026")
  const yearMatch = activeYear.match(/\b(20\d\d)\b/);
  const cleanYear = yearMatch ? yearMatch[1] : activeYear.split(" ")[0] || "2026";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'image' | 'video'
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Modals state
  const [isPhotoUploadOpen, setIsPhotoUploadOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [previewMedia, setPreviewMedia] = useState(null);

  // Photo Upload State
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [photoCategory, setPhotoCategory] = useState("Stage Events");
  const [customPhotoCategory, setCustomPhotoCategory] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Video Link State
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoCaption, setVideoCaption] = useState("");
  const [videoCategory, setVideoCategory] = useState("Stage Events");
  const [customVideoCategory, setCustomVideoCategory] = useState("");
  const [parsedVideo, setParsedVideo] = useState(null);
  const [submittingVideo, setSubmittingVideo] = useState(false);

  // Fetch gallery items
  const fetchGalleryItems = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/gallery?year=${encodeURIComponent(activeYear)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
      } else {
        toast.error(data.message || "Failed to load gallery items");
      }
    } catch (err) {
      console.error("Error fetching gallery:", err);
      toast.error("Unable to load gallery items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGalleryItems();
  }, [activeYear]);

  // Video URL live parsing
  useEffect(() => {
    if (videoUrl.trim()) {
      const parsed = parseVideoUrl(videoUrl);
      setParsedVideo(parsed);
    } else {
      setParsedVideo(null);
    }
  }, [videoUrl]);

  // Derived stats
  const photosCount = useMemo(
    () => items.filter((i) => i.type === "image").length,
    [items]
  );
  const videosCount = useMemo(
    () => items.filter((i) => i.type === "video").length,
    [items]
  );
  const allCategories = useMemo(() => {
    const cats = new Set();
    items.forEach((i) => {
      if (i.category) cats.add(i.category);
    });
    return Array.from(cats);
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Tab filter
      if (activeTab === "image" && item.type !== "image") return false;
      if (activeTab === "video" && item.type !== "video") return false;

      // Category filter
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = (item.title || "").toLowerCase().includes(query);
        const matchCaption = (item.caption || "").toLowerCase().includes(query);
        const matchCat = (item.category || "").toLowerCase().includes(query);
        return matchTitle || matchCaption || matchCat;
      }

      return true;
    });
  }, [items, activeTab, selectedCategory, searchQuery]);

  // Handle file picker selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter((f) => f.type.startsWith("image/"));
    if (validFiles.length < files.length) {
      toast.warning("Some files were skipped because they are not valid images.");
    }

    const mapped = validFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substring(2, 9),
      preview: URL.createObjectURL(file),
      caption: "",
    }));

    setSelectedFiles((prev) => [...prev, ...mapped]);
  };

  const removeSelectedFile = (id) => {
    setSelectedFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  // Upload Photos to Cloudinary & Save to Database
  const handleUploadPhotos = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select at least one photo to upload");
      return;
    }

    const targetCategory =
      photoCategory === "Custom" ? customPhotoCategory.trim() : photoCategory;
    if (!targetCategory) {
      toast.error("Please specify a category for the photos");
      return;
    }

    setUploadingPhotos(true);
    setUploadProgress(10);

    const uploadedItems = [];
    let successCount = 0;
    const total = selectedFiles.length;

    try {
      for (let i = 0; i < total; i++) {
        const item = selectedFiles[i];
        const formData = new FormData();
        formData.append("file", item.file);
        formData.append("year", cleanYear);

        const uploadRes = await fetch("/api/gallery/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          console.error(`Failed to upload ${item.file.name}`);
          continue;
        }

        const uploadData = await uploadRes.json();
        if (uploadData.secure_url) {
          uploadedItems.push({
            type: "image",
            url: uploadData.secure_url,
            publicId: uploadData.public_id || "",
            caption: item.caption || photoCaption || item.file.name.replace(/\.[^/.]+$/, ""),
            category: targetCategory,
            year: cleanYear,
            uploadedBy: "Program Committee",
          });
          successCount++;
        }

        setUploadProgress(Math.round(((i + 1) / total) * 80) + 10);
      }

      if (uploadedItems.length > 0) {
        // Save to Database
        const dbRes = await fetch("/api/gallery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: uploadedItems,
            year: cleanYear,
          }),
        });

        const dbData = await dbRes.json();
        if (dbData.success) {
          toast.success(
            `Successfully uploaded ${successCount} photo${successCount > 1 ? "s" : ""}!`
          );
          // Cleanup previews
          selectedFiles.forEach((f) => URL.revokeObjectURL(f.preview));
          setSelectedFiles([]);
          setPhotoCaption("");
          setIsPhotoUploadOpen(false);
          fetchGalleryItems();
        } else {
          toast.error(dbData.message || "Failed to save photos in database");
        }
      } else {
        toast.error("No photos were uploaded successfully. Please try again.");
      }
    } catch (err) {
      console.error("Error during batch upload:", err);
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploadingPhotos(false);
      setUploadProgress(0);
    }
  };

  // Submit Video Link
  const handleAddVideo = async (e) => {
    e.preventDefault();
    if (!videoUrl.trim()) {
      toast.error("Please enter a video URL");
      return;
    }

    if (!parsedVideo || !parsedVideo.isValid) {
      toast.error("Please enter a valid video link from YouTube, Instagram, Facebook, etc.");
      return;
    }

    const targetCategory =
      videoCategory === "Custom" ? customVideoCategory.trim() : videoCategory;
    if (!targetCategory) {
      toast.error("Please specify a category");
      return;
    }

    setSubmittingVideo(true);

    try {
      const payload = {
        type: "video",
        url: videoUrl.trim(),
        title: videoTitle.trim() || parsedVideo.displayName + " Video",
        caption: videoCaption.trim(),
        platform: parsedVideo.platform,
        embedUrl: parsedVideo.embedUrl,
        thumbnailUrl: parsedVideo.thumbnailUrl,
        category: targetCategory,
        year: cleanYear,
        uploadedBy: "Program Committee",
      };

      const res = await fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Video link added successfully!");
        setVideoUrl("");
        setVideoTitle("");
        setVideoCaption("");
        setIsVideoModalOpen(false);
        fetchGalleryItems();
      } else {
        toast.error(data.message || "Failed to add video link");
      }
    } catch (err) {
      console.error("Error adding video link:", err);
      toast.error("Failed to add video link");
    } finally {
      setSubmittingVideo(false);
    }
  };

  // Update Item (Edit)
  const handleSaveEdit = async () => {
    if (!editingItem) return;

    try {
      const res = await fetch("/api/gallery", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingItem._id || editingItem.id,
          title: editingItem.title,
          caption: editingItem.caption,
          category: editingItem.category,
          url: editingItem.url,
          type: editingItem.type,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Item updated successfully");
        setEditingItem(null);
        fetchGalleryItems();
      } else {
        toast.error(data.message || "Failed to update item");
      }
    } catch (err) {
      console.error("Error updating item:", err);
      toast.error("Failed to update item");
    }
  };

  // Delete Item
  const handleDeleteItem = async () => {
    if (!itemToDelete) return;

    try {
      const id = itemToDelete._id || itemToDelete.id;
      const res = await fetch(`/api/gallery?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Item deleted successfully");
        setItemToDelete(null);
        fetchGalleryItems();
      } else {
        toast.error(data.message || "Failed to delete item");
      }
    } catch (err) {
      console.error("Error deleting item:", err);
      toast.error("Failed to delete item");
    }
  };

  return (
    <div className="space-y-6">
      {/* ── TOP ACTION BAR ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card/60 backdrop-blur-sm border rounded-2xl p-4 md:p-6 shadow-sm">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Camera className="w-6 h-6 text-primary" />
            Festival Gallery
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-1 font-medium">
            Session: {cleanYear}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-row sm:items-center gap-2.5 w-full sm:w-auto">
          {/* Upload Photos Button */}
          <Button
            onClick={() => setIsPhotoUploadOpen(true)}
            className="col-span-1 gap-1.5 text-xs font-semibold rounded-xl shadow-md h-10 w-full sm:w-auto"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Photos</span>
          </Button>

          {/* Add Video Link Button */}
          <Button
            onClick={() => setIsVideoModalOpen(true)}
            className="col-span-1 gap-1.5 text-xs font-semibold rounded-xl shadow-md h-10 w-full sm:w-auto"
          >
            <Video className="w-4 h-4" />
            <span>Add Video Link</span>
          </Button>

          {/* Public Gallery Link Button */}
          <a
            href={`/gallery/${cleanYear}`}
            target="_blank"
            rel="noopener noreferrer"
            className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 px-3.5 h-10 text-xs font-semibold rounded-xl border bg-background hover:bg-muted/80 text-foreground transition-colors shadow-sm w-full sm:w-auto"
          >
            <Eye className="w-4 h-4 text-primary" />
            <span>View Gallery</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-60 ml-0.5" />
          </a>
        </div>
      </div>

      {/* ── STATS OVERVIEW CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-card border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total Media</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{items.length}</p>
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Photos</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{photosCount}</p>
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center flex-shrink-0">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Videos</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{videosCount}</p>
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Categories</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{allCategories.length}</p>
          </div>
        </div>
      </div>

      {/* ── FILTER TABS & SEARCH CONTROLS ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
        {/* Type Tabs */}
        <div className="inline-flex p-1 rounded-xl bg-muted/60 border text-xs font-semibold">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === "all"
                ? "bg-background text-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Media ({items.length})
          </button>
          <button
            onClick={() => setActiveTab("image")}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === "image"
                ? "bg-background text-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Photos ({photosCount})
          </button>
          <button
            onClick={() => setActiveTab("video")}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === "video"
                ? "bg-background text-foreground shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Videos ({videosCount})
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center gap-2 flex-1 md:max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by caption or title..."
              className="pl-9 h-9 text-xs rounded-xl bg-card"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {allCategories.length > 0 && (
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-9 w-[150px] sm:w-[170px] rounded-xl border bg-card text-xs font-medium text-foreground focus:ring-1 focus:ring-primary shadow-sm">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border bg-popover/95 backdrop-blur-md shadow-xl p-1.5 z-50">
                <SelectItem value="all" className="rounded-xl text-xs py-2 cursor-pointer font-medium">
                  All Categories
                </SelectItem>
                {allCategories.map((c) => (
                  <SelectItem key={c} value={c} className="rounded-xl text-xs py-2 cursor-pointer font-medium">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* ── MEDIA GRID ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-card/40 border rounded-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
          <p className="text-xs text-muted-foreground font-medium">Loading gallery items...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 px-4 bg-card/40 border border-dashed rounded-3xl max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3 text-muted-foreground">
            {activeTab === "video" ? <Video className="w-7 h-7" /> : <Camera className="w-7 h-7" />}
          </div>
          <h3 className="text-base font-bold text-foreground">No media found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {searchQuery || selectedCategory !== "all"
              ? "No items match your active filters. Try clearing your search or category."
              : `No ${activeTab === "video" ? "videos" : activeTab === "image" ? "photos" : "media"} uploaded yet for ${cleanYear}.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const isVideo = item.type === "video";
            const platformConfig = isVideo
              ? PLATFORM_INFO[item.platform] || PLATFORM_INFO.other
              : null;

            return (
              <div
                key={item.id || item._id}
                className="group relative bg-card rounded-2xl border border-border/80 overflow-hidden shadow-sm hover:shadow-md hover:border-primary/40 transition-all flex flex-col"
              >
                {/* Thumbnail / Media Preview */}
                <div className="relative aspect-video w-full bg-muted overflow-hidden flex items-center justify-center">
                  {isVideo ? (
                    item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title || "Video thumbnail"}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#1b1510] to-[#2d1b11] flex flex-col items-center justify-center p-4 text-center">
                        <Video className="w-8 h-8 text-primary/70 mb-1" />
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          {platformConfig?.name || "Video"}
                        </span>
                      </div>
                    )
                  ) : (
                    <img
                      src={item.url}
                      alt={item.caption || "Festival Photo"}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  )}

                  {/* Play button overlay for videos */}
                  {isVideo && (
                    <button
                      onClick={() => setPreviewMedia(item)}
                      className="absolute inset-0 m-auto w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-lg hover:scale-110 transition-transform"
                      title="Play Video"
                    >
                      <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                    </button>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 flex-wrap pointer-events-none">
                    {isVideo ? (
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border backdrop-blur-md ${platformConfig?.badgeBg} ${platformConfig?.badgeBorder} ${platformConfig?.textColor}`}
                      >
                        {platformConfig?.name || "Video"}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border backdrop-blur-md bg-black/40 border-white/20 text-white">
                        Photo
                      </span>
                    )}

                    {item.category && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-black/60 text-white/90 backdrop-blur-md">
                        {item.category}
                      </span>
                    )}
                  </div>

                  {/* Click to preview for photos */}
                  {!isVideo && (
                    <button
                      onClick={() => setPreviewMedia(item)}
                      className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                      title="View Full Size"
                    >
                      <Maximize2 className="w-6 h-6 drop-shadow" />
                    </button>
                  )}
                </div>

                {/* Content & Actions */}
                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-foreground line-clamp-1">
                      {item.title || item.caption || (isVideo ? "Festival Video" : "Festival Photo")}
                    </h4>
                    {item.caption && item.title && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                        {item.caption}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="truncate max-w-[120px]">
                      {item.category || "General"}
                    </span>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPreviewMedia(item)}
                        className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        title="Preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setEditingItem({ ...item })}
                        className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setItemToDelete(item)}
                        className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── UPLOAD PHOTOS MODAL ── */}
      <Dialog open={isPhotoUploadOpen} onOpenChange={setIsPhotoUploadOpen}>
        <DialogContent className="rounded-2xl sm:rounded-2xl max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto flex flex-col p-0 gap-0 [&>button.absolute]:hidden border shadow-2xl">
          <DialogHeader className="flex flex-row items-center gap-3 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md shrink-0">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div className="flex-1 text-left space-y-0.5 min-w-0">
              <DialogTitle className="text-lg md:text-xl font-bold m-0 text-foreground">
                Upload Festival Photos
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground m-0">
                Uploaded photoes will be displayed in the public gallery.
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                onClick={() => setIsPhotoUploadOpen(false)}
                className="p-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </DialogClose>
          </DialogHeader>

          <div className="p-5 space-y-4 flex-1">
            {/* Category Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Category
                </label>
                <Select value={photoCategory} onValueChange={setPhotoCategory}>
                  <SelectTrigger className="w-full h-9 px-3 rounded-xl border bg-background text-xs text-foreground focus:ring-1 focus:ring-primary">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border bg-popover/95 backdrop-blur-md shadow-xl p-1.5 z-[100] max-h-60">
                    <SelectItem value="Custom" className="rounded-xl text-xs py-2 cursor-pointer font-semibold text-primary">
                      + Custom Category
                    </SelectItem>
                    {PRESET_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="rounded-xl text-xs py-2 cursor-pointer font-medium">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {photoCategory === "Custom" && (
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">
                    Custom Category Name
                  </label>
                  <Input
                    value={customPhotoCategory}
                    onChange={(e) => setCustomPhotoCategory(e.target.value)}
                    placeholder="e.g. Food Court, Stage 2..."
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              )}

              <div className={photoCategory === "Custom" ? "sm:col-span-2" : ""}>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Default Caption (Optional)
                </label>
                <Input
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  placeholder="e.g. Highlights from Day 1 Inauguration"
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Drag & Drop / File Selector Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-2xl p-6 text-center hover:border-primary/60 hover:bg-primary/[0.02] cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">
                  Click to select photos or drag and drop
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Supports JPG, PNG, WEBP. Select multiple files at once.
                </p>
              </div>
            </div>

            {/* Previews of Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
                  <span>Selected Photos ({selectedFiles.length})</span>
                  <button
                    onClick={() => setSelectedFiles([])}
                    className="text-destructive hover:underline text-[11px]"
                  >
                    Clear all
                  </button>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-52 overflow-y-auto p-1">
                  {selectedFiles.map((item) => (
                    <div
                      key={item.id}
                      className="group relative aspect-square rounded-xl overflow-hidden border bg-muted"
                    >
                      <img
                        src={item.preview}
                        alt="preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => removeSelectedFile(item.id)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 hover:bg-destructive text-white flex items-center justify-center transition-colors"
                        title="Remove photo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1 text-[9px] text-white truncate text-center">
                        {item.file.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload progress */}
            {uploadingPhotos && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs font-semibold text-foreground">
                  <span>Uploading photos to Cloudinary...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-row items-center justify-end gap-2.5 p-4 border-t bg-muted/20 sticky bottom-0 z-20 shrink-0">
            <Button
              variant="outline"
              disabled={uploadingPhotos}
              onClick={() => setIsPhotoUploadOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              disabled={selectedFiles.length === 0 || uploadingPhotos}
              onClick={handleUploadPhotos}
              className="rounded-xl text-xs gap-1.5 font-bold"
            >
              {uploadingPhotos ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading ({selectedFiles.length})...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload {selectedFiles.length} Photo{selectedFiles.length > 1 ? "s" : ""}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ADD VIDEO LINK MODAL ── */}
      <Dialog open={isVideoModalOpen} onOpenChange={setIsVideoModalOpen}>
        <DialogContent className="rounded-2xl sm:rounded-2xl max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto flex flex-col p-0 gap-0 [&>button.absolute]:hidden border shadow-2xl">
          <DialogHeader className="flex flex-row items-center gap-3 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md shrink-0">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
            <div className="flex-1 text-left space-y-0.5 min-w-0">
              <DialogTitle className="text-lg md:text-xl font-bold m-0 text-foreground">
                Add Festival Video Link
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground m-0">
                Add video highlights or reels from YouTube, Instagram, Facebook, or other video sources.
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(false)}
                className="p-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </DialogClose>
          </DialogHeader>

          <form onSubmit={handleAddVideo} className="flex flex-col flex-1">
            <div className="p-5 space-y-4 flex-1">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Video Link / URL <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... or instagram.com/reel/..."
                    className="pl-9 h-9 text-xs rounded-xl"
                    required
                  />
                </div>

                {/* Platform Detection feedback */}
                {parsedVideo && parsedVideo.isValid && (
                  <div className="mt-2 flex items-center gap-2 p-2 rounded-xl bg-primary/10 border border-primary/20 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="font-semibold text-foreground">
                      Detected Platform: {parsedVideo.displayName}
                    </span>
                  </div>
                )}
              </div>

              {/* Video Title */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Video Title
                </label>
                <Input
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="e.g. Grand Finale Highlights"
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              {/* Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">
                    Category
                  </label>
                  <Select value={videoCategory} onValueChange={setVideoCategory}>
                    <SelectTrigger className="w-full h-9 px-3 rounded-xl border bg-background text-xs text-foreground focus:ring-1 focus:ring-primary">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border bg-popover/95 backdrop-blur-md shadow-xl p-1.5 z-[100] max-h-60">
                      <SelectItem value="Custom" className="rounded-xl text-xs py-2 cursor-pointer font-semibold text-primary">
                        + Custom Category
                      </SelectItem>
                      {PRESET_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c} className="rounded-xl text-xs py-2 cursor-pointer font-medium">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {videoCategory === "Custom" && (
                  <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">
                      Custom Category
                    </label>
                    <Input
                      value={customVideoCategory}
                      onChange={(e) => setCustomVideoCategory(e.target.value)}
                      placeholder="e.g. Highlights"
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>
                )}
              </div>

              {/* Caption / Description */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Caption / Description (Optional)
                </label>
                <Input
                  value={videoCaption}
                  onChange={(e) => setVideoCaption(e.target.value)}
                  placeholder="Short description of the video..."
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              {/* Preview Box */}
              {parsedVideo && parsedVideo.isValid && (
                <div className="rounded-xl border bg-muted/40 p-2.5 overflow-hidden">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Video Preview
                  </p>
                  {parsedVideo.platform === "youtube" && parsedVideo.embedUrl ? (
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                      <iframe
                        src={parsedVideo.embedUrl}
                        title="YouTube preview"
                        className="w-full h-full"
                        allowFullScreen
                      />
                    </div>
                  ) : parsedVideo.thumbnailUrl ? (
                    <img
                      src={parsedVideo.thumbnailUrl}
                      alt="Preview"
                      className="w-full aspect-video object-cover rounded-lg"
                    />
                  ) : (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      Video link verified for {parsedVideo.displayName}. Embed player will render in the gallery.
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-row items-center justify-end gap-2.5 p-4 border-t bg-muted/20 sticky bottom-0 z-20 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsVideoModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingVideo || !parsedVideo?.isValid}
                className="rounded-xl text-xs font-bold gap-1.5"
              >
                {submittingVideo ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Save Video Link
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── EDIT ITEM MODAL ── */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="rounded-2xl sm:rounded-2xl max-w-md max-h-[85vh] sm:max-h-[90vh] overflow-y-auto flex flex-col p-0 gap-0 [&>button.absolute]:hidden border shadow-2xl">
          <DialogHeader className="flex flex-row items-center gap-3 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md shrink-0">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 flex items-center justify-center">
              <Edit2 className="w-5 h-5" />
            </div>
            <div className="flex-1 text-left space-y-0.5 min-w-0">
              <DialogTitle className="text-lg md:text-xl font-bold m-0 text-foreground">
                Edit Gallery Item
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground m-0">
                Update details for this {editingItem?.type === "video" ? "video link" : "photo"}.
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </DialogClose>
          </DialogHeader>

          {editingItem && (
            <div className="p-5 space-y-3.5 flex-1">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Title
                </label>
                <Input
                  value={editingItem.title || ""}
                  onChange={(e) =>
                    setEditingItem((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Caption
                </label>
                <Input
                  value={editingItem.caption || ""}
                  onChange={(e) =>
                    setEditingItem((prev) => ({ ...prev, caption: e.target.value }))
                  }
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Category
                </label>
                <Input
                  value={editingItem.category || ""}
                  onChange={(e) =>
                    setEditingItem((prev) => ({ ...prev, category: e.target.value }))
                  }
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              {editingItem.type === "video" && (
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1 block">
                    Video URL
                  </label>
                  <Input
                    value={editingItem.url || ""}
                    onChange={(e) =>
                      setEditingItem((prev) => ({ ...prev, url: e.target.value }))
                    }
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex flex-row items-center justify-end gap-2.5 p-4 border-t bg-muted/20 sticky bottom-0 z-20 shrink-0">
            <Button
              variant="outline"
              onClick={() => setEditingItem(null)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} className="rounded-xl text-xs font-bold">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRMATION ALERT DIALOG ── */}
      <AlertDialog
        open={!!itemToDelete}
        onOpenChange={(open) => !open && setItemToDelete(null)}
      >
        <AlertDialogContent className="rounded-2xl border shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this {itemToDelete?.type === "video" ? "video link" : "photo"} from the festival gallery.
              {itemToDelete?.type === "image" && itemToDelete?.publicId && " The image will also be removed from Cloudinary."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              className="rounded-xl text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── MEDIA PREVIEW / LIGHTBOX MODAL ── */}
      {previewMedia && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          onClick={() => setPreviewMedia(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setPreviewMedia(null)}
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition"
              aria-label="Close preview"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Media Content */}
            <div className="w-full overflow-hidden rounded-2xl border border-white/15 bg-black flex items-center justify-center">
              {previewMedia.type === "video" ? (
                previewMedia.embedUrl ? (
                  <div className="relative w-full aspect-video">
                    <iframe
                      src={previewMedia.embedUrl}
                      title={previewMedia.title || "Video Player"}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="p-8 text-center text-white">
                    <p className="font-bold text-lg mb-2">Embedded player unavailable for this source</p>
                    <a
                      href={previewMedia.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs"
                    >
                      Open Video on External Website
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )
              ) : (
                <img
                  src={previewMedia.url}
                  alt={previewMedia.caption || "Full size photo"}
                  className="max-h-[75vh] w-auto object-contain"
                />
              )}
            </div>

            {/* Caption & Actions */}
            <div className="mt-4 w-full flex items-center justify-between gap-4 text-white">
              <div>
                <h4 className="text-sm sm:text-base font-bold">
                  {previewMedia.title || previewMedia.caption || "Festival Media"}
                </h4>
                {previewMedia.category && (
                  <p className="text-xs text-primary font-semibold uppercase tracking-wider mt-0.5">
                    {previewMedia.category}
                  </p>
                )}
              </div>

              {previewMedia.url && (
                <a
                  href={previewMedia.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white transition border border-white/20"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Source</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
