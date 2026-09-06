"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Trophy,
  LogIn,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Loader2,
  Calendar,
  Sparkles,
  Flame,
  Camera,
  Download,
  Maximize2,
  Play,
  Video,
  Film,
  ExternalLink,
} from "lucide-react";
import PublicFooter from "@/components/PublicFooter";
import ParticipantLoginModal from "@/components/ParticipantLoginModal";
import { PLATFORM_INFO } from "@/lib/videoUtils";

/* ---------------------- helper utils ---------------------- */
async function fetchJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed: ${url}`);
  return res.json();
}

/* -------------------- TopBar Component -------------------- */
function GalleryTopBar({
  festivalName,
  festivalYear,
  festivalLogo,
  festivalNameImage,
  yearParam,
  onLoginClick,
  onOpenSidebar,
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const displayName = festivalName
    ? festivalName.charAt(0).toUpperCase() + festivalName.slice(1)
    : "Festival";

  const safeYear = yearParam || "2026";
  const resultsLink = `/results/${safeYear}`;
  const teamPointsLink = `/team-points/${safeYear}`;
  const scheduleLink = `/schedule/${safeYear}`;
  const galleryLink = `/gallery/${safeYear}`;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
        scrolled
          ? "bg-[#120d09]/95 backdrop-blur-md border-white/25 shadow-lg"
          : "bg-[#120d09]/80 backdrop-blur-sm border-white/20"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenSidebar}
              className="lg:hidden -ml-2 p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link href={galleryLink} className="flex items-center gap-3 group">
              {festivalNameImage ? (
                <img
                  src={festivalNameImage}
                  alt={displayName}
                  className="h-8 sm:h-9 md:h-10 w-auto max-w-[170px] sm:max-w-[220px] md:max-w-[260px] object-contain brightness-0 invert group-hover:opacity-85 transition-opacity"
                />
              ) : festivalLogo ? (
                <img
                  src={festivalLogo}
                  alt={displayName}
                  className="h-9 w-9 sm:h-10 sm:w-10 object-contain rounded-lg group-hover:opacity-85 transition-opacity flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#9e6237] flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow flex-shrink-0">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              )}
            </Link>
          </div>

          <nav className="hidden lg:flex items-center gap-8">
            <Link
              href={resultsLink}
              className="text-xs font-bold uppercase tracking-[0.18em] text-white/70 hover:text-[#d4af37] transition-colors"
            >
              Results
            </Link>
            <Link
              href={teamPointsLink}
              className="text-xs font-bold uppercase tracking-[0.18em] text-white/70 hover:text-[#d4af37] transition-colors"
            >
              Team Points
            </Link>
            <Link
              href={scheduleLink}
              className="text-xs font-bold uppercase tracking-[0.18em] text-white/70 hover:text-[#d4af37] transition-colors"
            >
              Schedule
            </Link>
            <Link
              href={galleryLink}
              className="text-xs font-bold uppercase tracking-[0.18em] text-[#d4af37] border-b-2 border-[#d4af37] pb-0.5"
            >
              Gallery
            </Link>
          </nav>

          <button
            onClick={onLoginClick}
            id="participant-login-btn"
            className="flex items-center gap-2 bg-gradient-to-r from-[#d4af37] via-[#f4c96d] to-[#df6b43] text-[#120d09] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group"
          >
            <LogIn className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">Participant Login</span>
            <span className="sm:hidden">Login</span>
          </button>
        </div>
      </div>
    </header>
  );
}

/* -------------------- Sidebar Component -------------------- */
function GallerySidebar({
  isOpen,
  onClose,
  festivalName,
  festivalVenue,
  festivalNameImage,
  yearParam,
}) {
  const safeYear = yearParam || "2026";
  const resultsLink = `/results/${safeYear}`;
  const teamPointsLink = `/team-points/${safeYear}`;
  const scheduleLink = `/schedule/${safeYear}`;
  const galleryLink = `/gallery/${safeYear}`;

  const navItems = [
    { icon: Trophy, label: "Results", href: resultsLink },
    { icon: Flame, label: "Team Points", href: teamPointsLink },
    { icon: Calendar, label: "Schedule", href: scheduleLink },
    { icon: Camera, label: "Gallery", href: galleryLink, active: true },
  ];

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-[#17110c] border-r border-white/10 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Navigation sidebar"
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/10 bg-[#1a120e]">
          <div className="flex items-center gap-3 min-w-0">
            {festivalNameImage ? (
              <img
                src={festivalNameImage}
                alt={festivalName || "Festival"}
                className="h-8 sm:h-9 w-auto object-contain max-w-[160px] brightness-0 invert"
              />
            ) : (
              <p className="text-white font-black text-lg capitalize truncate">
                {festivalName || "Festival"}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group ${
                      item.active
                        ? "bg-[#d4af37]/15 text-[#d4af37] font-bold border border-[#d4af37]/30"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 ${
                        item.active ? "text-[#d4af37]" : "text-white/40 group-hover:text-[#d4af37]"
                      }`}
                    />
                    <span className="text-sm">{item.label}</span>
                    {item.active && (
                      <ChevronRight className="w-3 h-3 ml-auto text-[#d4af37]" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-white/10">
          <Link
            href="/participant"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-[#d4af37] to-[#df6b43] text-[#120d09] py-3 rounded-xl text-xs font-bold uppercase tracking-wider shadow hover:opacity-90 transition-opacity"
          >
            <LogIn className="w-4 h-4" />
            Participant Login
          </Link>
        </div>
      </aside>
    </>
  );
}

/* -------------------- Main Gallery Content -------------------- */
function GalleryContent({ initialYear }) {
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [mediaTab, setMediaTab] = useState("all"); // 'all' | 'photos' | 'videos'
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activePhotoIndex, setActivePhotoIndex] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const params = useParams();
  const searchParams = useSearchParams();
  const yearParam =
    (params?.year ? decodeURIComponent(params.year) : null) ||
    initialYear ||
    searchParams.get("year") ||
    "2026";

  const yearQuery = `year=${encodeURIComponent(yearParam)}`;
  const numericYear =
    parseInt(yearParam) ||
    (yearParam?.toString().includes("2026") ? 2026 : 2025);

  useEffect(() => {
    setLoading(true);
    setError("");

    Promise.all([
      fetchJSON(`/api/settings?${yearQuery}`).catch(() => ({ settings: null })),
      fetchJSON(`/api/gallery?${yearQuery}`).catch(() => ({ photos: [], videos: [] })),
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
  }, [yearParam]);

  const matchingFestival =
    settings?.festival ||
    settings?.festivals?.find(
      (f) =>
        f.year?.toString().toLowerCase().includes(yearParam.toString().toLowerCase()) ||
        f.festivalInfo?.year?.toString() === yearParam.toString()
    ) ||
    (numericYear === 2026 ? settings?.festivals?.[0] : settings?.festival);

  const festivalInfo = matchingFestival?.festivalInfo || settings?.festival?.festivalInfo || {};
  const festivalName = festivalInfo.name || matchingFestival?.name || "esperanza";
  const festivalYear = festivalInfo.year || numericYear;
  const festivalVenue = festivalInfo.venue || matchingFestival?.venue || "Sa-adiya Da-awa College";
  const cleanYear = festivalYear ? String(festivalYear) : (yearParam ? String(yearParam).trim() : "2026");

  const festivalNameImage =
    matchingFestival?.festivalNameImage?.url ||
    settings?.festival?.festivalNameImage?.url ||
    settings?.festivals?.find((f) => f.festivalNameImage?.url)?.festivalNameImage?.url ||
    "https://res.cloudinary.com/do8vcjig0/image/upload/v1787142796/profiles/q4bwbn3hk21k6zonu5t8.png";

  const festivalLogo =
    matchingFestival?.festivalLogo?.url ||
    settings?.festival?.festivalLogo?.url ||
    settings?.festivals?.find((f) => f.festivalLogo?.url)?.festivalLogo?.url ||
    "https://res.cloudinary.com/do8vcjig0/image/upload/v1787142034/profiles/i5cq1yxqoori5xff52cz.png";

  // Compute categories combined
  const categories = useMemo(() => {
    const cats = new Set();
    photos.forEach((p) => p.category && cats.add(p.category));
    videos.forEach((v) => v.category && cats.add(v.category));
    return Array.from(cats);
  }, [photos, videos]);

  // Filtered lists
  const filteredPhotos = useMemo(() => {
    if (selectedCategory === "all") return photos;
    return photos.filter((p) => p.category === selectedCategory);
  }, [photos, selectedCategory]);

  const filteredVideos = useMemo(() => {
    if (selectedCategory === "all") return videos;
    return videos.filter((v) => v.category === selectedCategory);
  }, [videos, selectedCategory]);

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
    <div className="min-h-screen bg-[#0d0906] text-white flex flex-col selection:bg-[#d4af37] selection:text-black">
      {/* ── TOP BAR ── */}
      <GalleryTopBar
        festivalName={festivalName}
        festivalYear={festivalYear}
        festivalLogo={festivalLogo}
        festivalNameImage={festivalNameImage}
        yearParam={yearParam}
        onLoginClick={() => setShowLoginModal(true)}
        onOpenSidebar={() => setIsSidebarOpen(true)}
      />

      {/* ── SIDEBAR ── */}
      <GallerySidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        festivalName={festivalName}
        festivalVenue={festivalVenue}
        festivalNameImage={festivalNameImage}
        yearParam={yearParam}
      />

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 relative overflow-hidden pt-16">
        {/* Ambient Glows */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[64rem] -translate-x-1/2 rounded-full bg-[#d4af37]/[0.055] blur-[130px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-48 top-80 h-96 w-96 rounded-full bg-[#9e6237]/[0.08] blur-[120px]"
        />

        <section className="relative mx-auto max-w-7xl px-6 pt-5 pb-12 sm:px-8 md:px-12 sm:pt-7 sm:pb-16">
          {/* Header */}
          <header className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] text-[11px] font-bold uppercase tracking-[0.2em] mb-3">
              <Camera className="w-3.5 h-3.5" />
              <span>Gallery • {festivalName} '{festivalYear.toString().slice(-2)}</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.1] sm:leading-tight tracking-tight">
              Moments &{" "}
              <span className="bg-gradient-to-r from-[#e5c07b] via-[#d4af37] to-[#df6b43] bg-clip-text text-transparent">
                reels.
              </span>
            </h1>
            <p className="mt-1.5 sm:mt-3 text-sm sm:text-base text-white/60 max-w-xl leading-relaxed">
              Explore festival memories, photos, and video reels.
            </p>
          </header>

          {/* ── MEDIA TYPE TABS (All / Photos / Videos) ── */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div className="inline-flex p-1 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md">
              <button
                onClick={() => setMediaTab("all")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  mediaTab === "all"
                    ? "bg-[#d4af37] text-black shadow-md shadow-[#d4af37]/20"
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
                    ? "bg-[#d4af37] text-black shadow-md shadow-[#d4af37]/20"
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
                    ? "bg-[#d4af37] text-black shadow-md shadow-[#d4af37]/20"
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

            {/* Category Filter Pills */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 sm:ml-auto">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
                    selectedCategory === "all"
                      ? "bg-white/20 text-white border border-white/30"
                      : "bg-white/[0.03] text-white/50 border border-white/5 hover:text-white"
                  }`}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
                      selectedCategory === cat
                        ? "bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40 font-bold"
                        : "bg-white/[0.03] text-white/50 border border-white/5 hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
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
              <Loader2 className="w-10 h-10 animate-spin text-[#d4af37] mb-4" />
              <p className="text-white/60 text-sm font-medium tracking-wide">
                Loading festival gallery...
              </p>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && totalFilteredCount === 0 && (
            <div className="mt-12 text-center py-16 bg-white/[0.02] border border-white/10 rounded-3xl p-8 max-w-md mx-auto">
              <Camera className="w-14 h-14 text-[#d4af37]/40 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                No Media Yet
              </h3>
              <p className="text-sm text-white/60 leading-relaxed">
                Festival moments, stage photos, and video highlights for {cleanYear || "2026"} will be uploaded by the Program Committee. Check back soon!
              </p>
            </div>
          )}

          {/* ── VIDEOS SECTION ── */}
          {!loading &&
            !error &&
            (mediaTab === "all" || mediaTab === "videos") &&
            filteredVideos.length > 0 && (
              <div className="mt-12">
                {mediaTab === "all" && (
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                      <Film className="w-4 h-4" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">
                      Festival Videos & Reels
                    </h2>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                      {filteredVideos.length}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredVideos.map((video) => {
                    const platformConfig =
                      PLATFORM_INFO[video.platform] || PLATFORM_INFO.other;

                    return (
                      <div
                        key={video.id || video._id}
                        onClick={() => setActiveVideo(video)}
                        className="group relative bg-[#17100b] rounded-2xl border border-white/10 overflow-hidden shadow-xl hover:border-[#d4af37] transition-all duration-300 cursor-pointer flex flex-col hover:-translate-y-1"
                      >
                        {/* Video Thumbnail Box */}
                        <div className="relative aspect-video w-full bg-black overflow-hidden flex items-center justify-center">
                          {video.thumbnailUrl ? (
                            <img
                              src={video.thumbnailUrl}
                              alt={video.title || "Video thumbnail"}
                              loading="lazy"
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[#1a130e] via-[#2d1b11] to-[#120d09] flex flex-col items-center justify-center p-6 text-center">
                              <Video className="w-10 h-10 text-[#d4af37]/60 mb-2 group-hover:text-[#d4af37] transition-colors" />
                              <span className="text-xs font-bold text-white/60 uppercase tracking-widest">
                                {platformConfig.name}
                              </span>
                            </div>
                          )}

                          {/* Glowing Play Icon */}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
                            <div className="w-14 h-14 rounded-full bg-[#d4af37] text-black flex items-center justify-center shadow-lg shadow-[#d4af37]/30 group-hover:scale-110 transition-transform duration-200">
                              <Play className="w-6 h-6 fill-black ml-0.5" />
                            </div>
                          </div>

                          {/* Top Platform Badge */}
                          <div className="absolute top-3 left-3 flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border backdrop-blur-md ${platformConfig.badgeBg} ${platformConfig.badgeBorder} ${platformConfig.textColor}`}
                            >
                              {platformConfig.name}
                            </span>
                            {video.category && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white/90 border border-white/10">
                                {video.category}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Video Info */}
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="font-bold text-sm sm:text-base text-white line-clamp-1 group-hover:text-[#d4af37] transition-colors">
                              {video.title || "Festival Video"}
                            </h3>
                            {video.caption && (
                              <p className="text-xs text-white/60 line-clamp-2 mt-1">
                                {video.caption}
                              </p>
                            )}
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs text-white/40">
                            <span>{video.category || "Highlights"}</span>
                            <span className="flex items-center gap-1 text-[#d4af37] font-semibold text-[11px] group-hover:underline">
                              Watch Video
                              <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          {/* ── PHOTOS SECTION (Masonry) ── */}
          {!loading &&
            !error &&
            (mediaTab === "all" || mediaTab === "photos") &&
            filteredPhotos.length > 0 && (
              <div className="mt-12">
                {mediaTab === "all" && (
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center text-[#d4af37]">
                      <Camera className="w-4 h-4" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">
                      Festival Photos
                    </h2>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                      {filteredPhotos.length}
                    </span>
                  </div>
                )}

                <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
                  {filteredPhotos.map((photo, index) => (
                    <div key={photo.id || index} className="mb-4 break-inside-avoid">
                      <button
                        type="button"
                        onClick={() => setActivePhotoIndex(index)}
                        className="group relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#17100b] text-left shadow-lg transition-all duration-300 hover:border-[#d4af37] hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
                        aria-label={`View photo: ${photo.caption || "Festival photo"}`}
                      >
                        <img
                          src={photo.url}
                          alt={photo.caption || "Festival moment"}
                          loading="lazy"
                          className="w-full h-auto object-cover transition-opacity duration-300 group-hover:opacity-90"
                        />

                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3.5">
                          <p className="text-xs font-bold text-white line-clamp-2">
                            {photo.caption}
                          </p>
                          {photo.category && (
                            <span className="text-[10px] text-[#d4af37] font-semibold uppercase tracking-wider mt-1">
                              {photo.category}
                            </span>
                          )}
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </section>
      </main>

      {/* ── PHOTO LIGHTBOX MODAL ── */}
      {activePhoto && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          onClick={() => setActivePhotoIndex(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setActivePhotoIndex(null)}
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition"
              aria-label="Close photo"
            >
              <X size={20} />
            </button>

            {/* Left/Right Navigation Arrows */}
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
            <div className="overflow-hidden rounded-2xl border border-white/15 bg-black max-h-[75vh] flex items-center justify-center">
              <img
                src={activePhoto.url}
                alt={activePhoto.caption || "Full size photo"}
                className="max-h-[75vh] w-auto object-contain"
              />
            </div>

            {/* Caption & Controls */}
            <div className="mt-4 w-full flex items-center justify-between gap-4 text-left">
              <div>
                <h4 className="text-sm sm:text-base font-bold text-white">
                  {activePhoto.caption || "Festival Photo"}
                </h4>
                {activePhoto.category && (
                  <p className="text-xs text-[#d4af37] font-semibold uppercase tracking-wider mt-0.5">
                    {activePhoto.category}
                  </p>
                )}
              </div>

              <a
                href={activePhoto.url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#d4af37] text-black hover:opacity-90 transition shadow"
              >
                <Download size={14} />
                <span>Open Full</span>
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
                  title={activeVideo.title || "Festival Video Player"}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <div className="p-8 text-center text-white">
                  <Film className="w-12 h-12 text-[#d4af37] mx-auto mb-3" />
                  <p className="font-bold text-lg mb-2">Embedded player unavailable for this source</p>
                  <p className="text-xs text-white/60 mb-4 max-w-sm mx-auto">
                    You can watch this video directly on the source platform.
                  </p>
                  <a
                    href={activeVideo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#d4af37] text-black font-bold text-xs"
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
                    <span className="text-[10px] font-semibold text-[#d4af37] uppercase tracking-wider">
                      • {activeVideo.category}
                    </span>
                  )}
                </div>

                <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                  {activeVideo.title || "Festival Video"}
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
      <PublicFooter
        settings={settings}
        institutionName={festivalVenue}
        year={yearParam}
      />

      {/* ── LOGIN MODAL ── */}
      <ParticipantLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        festivalNameImage={festivalNameImage}
        onLoginSuccess={() => setShowLoginModal(false)}
      />
    </div>
  );
}

export default function GalleryYearPage({ initialYear }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0d0906] flex items-center justify-center">
          <Loader2 className="animate-spin text-[#d4af37]" size={40} />
        </div>
      }
    >
      <GalleryContent initialYear={initialYear} />
    </Suspense>
  );
}
