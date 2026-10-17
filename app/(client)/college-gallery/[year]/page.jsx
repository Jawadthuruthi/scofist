"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  Loader2,
  Camera,
  Download,
  Maximize2,
  Play,
  Video,
  Film,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { PLATFORM_INFO } from "@/lib/videoUtils";

/* ---------------------- helper utils ---------------------- */
async function fetchJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed: ${url}`);
  return res.json();
}

/* -------------------- Main Gallery Content -------------------- */
function GalleryContent({ initialYear }) {
  const [settings, setSettings] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [mediaTab, setMediaTab] = useState("all"); // 'all' | 'photos' | 'videos'
  const [activePhotoIndex, setActivePhotoIndex] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);

  const params = useParams();
  const searchParams = useSearchParams();
  const yearParam =
    (params?.year ? decodeURIComponent(params.year) : null) ||
    searchParams.get("year") ||
    initialYear ||
    "all";

  const yearQuery =
    yearParam && yearParam !== "all"
      ? `year=${encodeURIComponent(yearParam)}`
      : "year=all";

  useEffect(() => {
    setLoading(true);
    setError("");

    Promise.all([
      fetchJSON("/api/settings").catch(() => ({ settings: null })),
      fetchJSON(`/api/gallery?${yearQuery}&uploadedBy=College%20Admin`).catch(() => ({ photos: [], videos: [] })),
    ])
      .then(([settingsData, galleryData]) => {
        setSettings(settingsData.settings || null);
        setPhotos(galleryData.photos || []);
        setVideos(galleryData.videos || []);
      })
      .catch((err) => {
        console.error("Error loading gallery:", err);
        setError("Unable to load gallery content");
      })
      .finally(() => setLoading(false));
  }, [yearQuery]);

  // Filtered lists by media type
  const filteredPhotos = photos;
  const filteredVideos = videos;

  const totalFilteredCount =
    (mediaTab === "videos" ? 0 : filteredPhotos.length) +
    (mediaTab === "photos" ? 0 : filteredVideos.length);

  // Active photo for lightbox
  const activePhoto =
    activePhotoIndex !== null && filteredPhotos[activePhotoIndex]
      ? filteredPhotos[activePhotoIndex]
      : null;

  const handlePrevPhoto = () => {
    if (activePhotoIndex > 0) {
      setActivePhotoIndex(activePhotoIndex - 1);
    } else {
      setActivePhotoIndex(filteredPhotos.length - 1);
    }
  };

  const handleNextPhoto = () => {
    if (activePhotoIndex < filteredPhotos.length - 1) {
      setActivePhotoIndex(activePhotoIndex + 1);
    } else {
      setActivePhotoIndex(0);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* ── TOP BAR ── */}
      <PublicHeader 
        centerLogo={settings?.institution?.logo?.url} 
        centered={true}
      />

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 relative overflow-hidden pt-4 sm:pt-6 pb-12">
        <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <header className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white drop-shadow-md">
              College Gallery
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-400 max-w-xl">
              Explore moments and highlights from our campus life.
            </p>
          </header>

          {/* ── MEDIA TYPE TABS (All / Photos / Videos) ── */}
          <div className="mt-4 sm:mt-6 flex flex-wrap items-center gap-3">
            <div className="inline-flex p-1 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md">
              <button
                onClick={() => setMediaTab("all")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  mediaTab === "all"
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                    : "text-white/70 hover:text-white"
                }`}
              >
                <span>All Media</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-current">
                  {photos.length + videos.length}
                </span>
              </button>

              <button
                onClick={() => setMediaTab("photos")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  mediaTab === "photos"
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                    : "text-white/70 hover:text-white"
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Photos</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-current">
                  {photos.length}
                </span>
              </button>

              <button
                onClick={() => setMediaTab("videos")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  mediaTab === "videos"
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                    : "text-white/70 hover:text-white"
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Videos</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-current">
                  {videos.length}
                </span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-8 bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center text-red-400 font-medium">
              ⚠️ {error}
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
              <p className="text-white/60 text-sm font-medium tracking-wide">
                Loading college gallery...
              </p>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && totalFilteredCount === 0 && (
            <div className="mt-12 flex flex-col items-center justify-center py-24 px-4 bg-white/[0.02] border border-white/5 rounded-3xl text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4 text-white/30">
                {mediaTab === "videos" ? (
                  <Video size={32} />
                ) : (
                  <Camera size={32} />
                )}
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                No Media Found
              </h3>
              <p className="text-white/50 max-w-sm text-sm">
                There are no {mediaTab === "videos" ? "videos" : mediaTab === "photos" ? "photos" : "media items"} uploaded yet.
              </p>
            </div>
          )}

          {/* Media Grid */}
          {!loading && !error && totalFilteredCount > 0 && (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {/* VIDEOS */}
              {(mediaTab === "all" || mediaTab === "videos") &&
                filteredVideos.map((video) => {
                  const platformConfig =
                    PLATFORM_INFO[video.platform] || PLATFORM_INFO.other;
                  return (
                    <div
                      key={video.id}
                      className="group relative rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden hover:border-white/20 transition-all duration-300 flex flex-col hover:shadow-xl hover:-translate-y-1"
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-black flex items-center justify-center">
                        {video.thumbnailUrl ? (
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title || "Video thumbnail"}
                            loading="lazy"
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#1a1c23] to-[#0f1015] flex flex-col items-center justify-center text-center p-4">
                            <Video className="w-8 h-8 text-white/30 mb-2" />
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                              {platformConfig.name}
                            </span>
                          </div>
                        )}

                        {/* Play Button Overlay */}
                        <button
                          onClick={() => setActiveVideo(video)}
                          className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-emerald-500/90 text-white flex items-center justify-center backdrop-blur-sm shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-110 transition-transform duration-300"
                          aria-label="Play video"
                        >
                          <Play className="w-5 h-5 fill-white text-white ml-1" />
                        </button>

                        {/* Badges */}
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap pointer-events-none">
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border backdrop-blur-md ${platformConfig.badgeBg} ${platformConfig.badgeBorder} ${platformConfig.textColor}`}
                          >
                            {platformConfig.name}
                          </span>
                          {video.category && (
                            <span className="text-[9px] font-semibold text-white/90 uppercase tracking-wider px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10">
                              {video.category}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-4 flex flex-col flex-1">
                        <h4 className="text-sm font-bold text-white line-clamp-2 leading-tight">
                          {video.title || "College Video"}
                        </h4>
                        {video.caption && (
                          <p className="mt-1.5 text-xs text-white/50 line-clamp-2">
                            {video.caption}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

              {/* PHOTOS */}
              {(mediaTab === "all" || mediaTab === "photos") &&
                filteredPhotos.map((photo, idx) => (
                  <div
                    key={photo.id}
                    className="group relative aspect-[4/3] rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden hover:border-white/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                    onClick={() => setActivePhotoIndex(idx)}
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption || "College Photo"}
                      loading="lazy"
                      className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-110"
                    />

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                      <h4 className="text-sm font-bold text-white line-clamp-2">
                        {photo.caption || "College Photo"}
                      </h4>
                    </div>

                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap pointer-events-none">
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/60 text-white/90 backdrop-blur-md border border-white/10">
                        Photo
                      </span>
                      {photo.category && (
                        <span className="text-[9px] font-semibold text-white/90 uppercase tracking-wider px-2 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10">
                          {photo.category}
                        </span>
                      )}
                    </div>

                    <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 backdrop-blur-sm flex items-center justify-center transition-all duration-300 -translate-y-2 group-hover:translate-y-0">
                      <Maximize2 size={14} />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
      </main>

      {/* ── PHOTO LIGHTBOX ── */}
      {activePhoto && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-6"
          onClick={() => setActivePhotoIndex(null)}
        >
          <div
            className="relative w-full max-w-6xl max-h-screen flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar inside Lightbox */}
            <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/80 to-transparent">
              <div className="text-white/60 text-sm font-medium">
                {activePhotoIndex + 1} / {filteredPhotos.length}
              </div>
              <button
                onClick={() => setActivePhotoIndex(null)}
                className="p-2 text-white/70 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition"
                aria-label="Close lightbox"
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation Arrows */}
            {filteredPhotos.length > 1 && (
              <>
                <button
                  onClick={handlePrevPhoto}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white rounded-full bg-black/60 hover:bg-black/80 border border-white/20 transition z-10"
                  aria-label="Previous photo"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={handleNextPhoto}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white rounded-full bg-black/60 hover:bg-black/80 border border-white/20 transition z-10"
                  aria-label="Next photo"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            {/* Photo Container */}
            <div className="overflow-hidden rounded-2xl border border-white/15 bg-black h-[75vh] flex items-center justify-center mt-12">
              <img
                src={activePhoto.url}
                alt={activePhoto.caption || "Full size photo"}
                className="max-h-[75vh] w-auto object-contain"
              />
            </div>

            {/* Caption & Controls */}
            <div className="mt-4 w-full flex items-center justify-between gap-4 text-left px-4 pb-4">
              <div>
                <h4 className="text-sm sm:text-base font-bold text-white">
                  {activePhoto.caption || "College Photo"}
                </h4>
                {activePhoto.category && (
                  <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mt-0.5">
                    {activePhoto.category}
                  </p>
                )}
              </div>

              <a
                href={activePhoto.url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-500 text-white hover:opacity-90 transition shadow"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Download</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── VIDEO PLAYER MODAL ── */}
      {activeVideo && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          onClick={() => setActiveVideo(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setActiveVideo(null)}
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition"
              aria-label="Close video"
            >
              <X size={20} />
            </button>

            {/* Responsive Player Box */}
            <div className="w-full aspect-video rounded-2xl border border-white/20 bg-black overflow-hidden shadow-2xl flex items-center justify-center">
              {activeVideo.embedUrl ? (
                <iframe
                  src={activeVideo.embedUrl}
                  title={activeVideo.title || "College Video Player"}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <div className="p-8 text-center text-white">
                  <Film className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <p className="font-bold text-lg mb-2">Embedded player unavailable for this source</p>
                  <p className="text-xs text-white/60 mb-4 max-w-sm mx-auto">
                    You can watch this video directly on the source platform.
                  </p>
                  <a
                     href={activeVideo.url}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs"
                  >
                     Open on External Platform
                     <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>

            {/* Video Details & Platform Link */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${
                      PLATFORM_INFO[activeVideo.platform]?.badgeBg || "bg-purple-600/20"
                    } ${
                      PLATFORM_INFO[activeVideo.platform]?.badgeBorder || "border-purple-500/30"
                    } ${PLATFORM_INFO[activeVideo.platform]?.textColor || "text-purple-400"}`}
                  >
                    {PLATFORM_INFO[activeVideo.platform]?.name || "Video"}
                  </span>
                  {activeVideo.category && (
                    <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                      • {activeVideo.category}
                    </span>
                  )}
                </div>

                <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                  {activeVideo.title || "College Video"}
                </h3>
                {activeVideo.caption && (
                  <p className="text-xs text-white/70 mt-0.5 max-w-xl leading-relaxed">
                    {activeVideo.caption}
                  </p>
                )}
              </div>

              {activeVideo.url && (
                <a
                  href={activeVideo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white border border-white/20 transition flex-shrink-0 self-start sm:self-auto"
                >
                  <span>Open on {PLATFORM_INFO[activeVideo.platform]?.name || "Source"}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <PublicFooter settings={settings} />
    </div>
  );
}

export default function GalleryYearPage({ initialYear }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <Loader2 className="animate-spin text-emerald-500" size={40} />
        </div>
      }
    >
      <GalleryContent initialYear={initialYear} />
    </Suspense>
  );
}
