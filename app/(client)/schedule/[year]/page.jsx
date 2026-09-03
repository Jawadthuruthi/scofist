"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Trophy,
  Search,
  LogIn,
  Home,
  Menu,
  X,
  Award,
  Users,
  Star,
  ChevronRight,
  MapPin,
  Loader2,
  Calendar,
  Clock,
  Radio,
  Sparkles,
  Flame,
  CheckCircle2,
} from "lucide-react";
import PublicFooter from "@/components/PublicFooter";
import ParticipantLoginModal from "@/components/ParticipantLoginModal";
import { ParticipantCard } from "@/components/ParticipantsCard";

/* ---------------------- helper utils ---------------------- */
async function fetchJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed: ${url}`);
  return res.json();
}

/* -------------------- TopBar Component -------------------- */
function ScheduleTopBar({
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenSidebar}
              className="lg:hidden p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link href={scheduleLink} className="flex items-center gap-2.5 sm:gap-3 group">
              {festivalLogo && (
                <img
                  src={festivalLogo}
                  alt={displayName}
                  className="h-10 w-10 sm:h-11 sm:w-11 object-contain rounded-lg group-hover:opacity-85 transition-opacity flex-shrink-0"
                />
              )}
              {festivalNameImage ? (
                <img
                  src={festivalNameImage}
                  alt={displayName}
                  className="h-7 sm:h-8 w-auto max-w-[140px] sm:max-w-[200px] object-contain brightness-0 invert group-hover:opacity-85 transition-opacity"
                />
              ) : !festivalLogo ? (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#9e6237] flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow flex-shrink-0">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
              ) : null}
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
              className="text-xs font-bold uppercase tracking-[0.18em] text-[#d4af37] border-b-2 border-[#d4af37] pb-0.5"
            >
              Schedule
            </Link>
            <Link
              href={galleryLink}
              className="text-xs font-bold uppercase tracking-[0.18em] text-white/70 hover:text-[#d4af37] transition-colors"
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
function ScheduleSidebar({
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
    { icon: Home, label: "Home", href: "/" },
    { icon: Trophy, label: "Results", href: resultsLink },
    { icon: Flame, label: "Team Points", href: teamPointsLink },
    { icon: Calendar, label: "Schedule", href: scheduleLink, active: true },
    { icon: Award, label: "Gallery", href: galleryLink },
    { icon: Users, label: "Participants", href: "/participant" },
    { icon: Star, label: "Updates", href: "/updates" },
    { icon: Award, label: "Articles", href: "/articles" },
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
        <div className="relative bg-gradient-to-br from-[#3f2720] to-[#1a120e] p-6 pb-8 border-b border-white/10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          <div className="flex items-center gap-3 mt-2">
            <div className="w-12 h-12 rounded-2xl bg-[#d4af37]/20 border border-[#d4af37]/30 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-6 h-6 text-[#d4af37]" />
            </div>
            <div>
              {festivalNameImage ? (
                <img
                  src={festivalNameImage}
                  alt={festivalName || "Festival"}
                  className="h-10 w-auto object-contain max-w-[160px] brightness-0 invert"
                />
              ) : (
                <p className="text-white font-black text-xl capitalize">
                  {festivalName || "Festival"}
                </p>
              )}
              {festivalVenue && (
                <p className="text-white/60 text-xs mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {festivalVenue}
                </p>
              )}
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] px-3 mb-3">
            Navigation
          </p>
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

/* -------------------- Main Schedule Content -------------------- */
function ScheduleContent() {
  const [schedules, setSchedules] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStage, setSelectedStage] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authParticipant, setAuthParticipant] = useState(null);

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
      fetchJSON(`/api/schedules?${yearQuery}&isPublished=true&limit=200`).catch(() => ({
        schedules: [],
      })),
    ])
      .then(([settingsData, schedData]) => {
        setSettings(settingsData.settings || null);
        const list = schedData.schedules || schedData.data || [];
        setSchedules(list);
      })
      .catch((err) => {
        console.error("Error loading schedules:", err);
        setError("Unable to load schedules");
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

  /* Extract unique stage numbers */
  const availableStages = useMemo(() => {
    const stages = new Set();
    schedules.forEach((s) => {
      if (s.stageNumber) stages.add(s.stageNumber);
    });
    return Array.from(stages).sort((a, b) => a - b);
  }, [schedules]);

  /* Filter schedules */
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (selectedStage !== "all" && s.stageNumber !== Number(selectedStage)) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const pName = (s.programName || "").toLowerCase();
        const dName = (s.divisionName || "").toLowerCase();
        return pName.includes(query) || dName.includes(query);
      }
      return true;
    });
  }, [schedules, selectedStage, searchQuery]);

  return (
    <div className="min-h-screen bg-[#0d0906] text-white flex flex-col selection:bg-[#d4af37] selection:text-black">
      {/* ── TOP BAR ── */}
      <ScheduleTopBar
        festivalName={festivalName}
        festivalYear={festivalYear}
        festivalLogo={festivalLogo}
        festivalNameImage={festivalNameImage}
        yearParam={yearParam}
        onLoginClick={() => setShowLoginModal(true)}
        onOpenSidebar={() => setIsSidebarOpen(true)}
      />

      {/* ── SIDEBAR ── */}
      <ScheduleSidebar
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

        <section className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
          {/* Hero Header */}
          <header className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] text-[11px] font-bold uppercase tracking-[0.2em] mb-4">
              <Calendar className="w-3.5 h-3.5" />
              <span>Schedule • {festivalName} '{festivalYear.toString().slice(-2)}</span>
            </div>
            <h1 className="text-5xl font-black leading-[0.92] tracking-[-0.03em] sm:text-7xl lg:text-[5.75rem]">
              Programme{" "}
              <span className="block bg-gradient-to-r from-[#e5c07b] via-[#d4af37] to-[#df6b43] bg-clip-text text-transparent">
                schedule.
              </span>
            </h1>
            <p className="mt-4 text-sm sm:text-base text-white/60 max-w-xl">
              Stage-by-stage schedule and timings.
            </p>
          </header>

          {/* Live indicator bar */}
          <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
            <div className="flex items-center gap-2.5 text-xs text-white/80 font-medium">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
              <span>All competition and stage times update live</span>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#d4af37]" size={14} />
              <input
                type="text"
                placeholder="Search program or division…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-full bg-white/[0.05] border border-white/15 pl-10 pr-4 text-xs text-white placeholder:text-white/40 outline-none focus:border-[#d4af37] transition"
              />
            </div>
          </div>

          {/* Stage Filter Tabs */}
          {availableStages.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedStage("all")}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  selectedStage === "all"
                    ? "bg-[#d4af37] text-black shadow-md shadow-[#d4af37]/20"
                    : "bg-white/[0.04] text-white/70 border border-white/10 hover:border-white/20 hover:text-white"
                }`}
              >
                All Stages ({schedules.length})
              </button>
              {availableStages.map((stg) => {
                const count = schedules.filter((s) => s.stageNumber === stg).length;
                return (
                  <button
                    key={stg}
                    onClick={() => setSelectedStage(stg.toString())}
                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                      selectedStage === stg.toString()
                        ? "bg-[#d4af37] text-black shadow-md shadow-[#d4af37]/20"
                        : "bg-white/[0.04] text-white/70 border border-white/10 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    Stage {stg} ({count})
                  </button>
                );
              })}
            </div>
          )}

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
                Loading schedule...
              </p>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredSchedules.length === 0 && (
            <div className="mt-12 text-center py-16 bg-white/[0.02] border border-white/10 rounded-3xl p-8 max-w-md mx-auto">
              <Calendar className="w-14 h-14 text-[#d4af37]/40 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                No Schedule Found
              </h3>
              <p className="text-sm text-white/60 leading-relaxed">
                {searchQuery
                  ? `No programs match "${searchQuery}"`
                  : "Program schedules will be published soon. Please check back later."}
              </p>
            </div>
          )}

          {/* Schedules List Cards */}
          {!loading && !error && filteredSchedules.length > 0 && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSchedules.map((item) => {
                const isOngoing = item.status === "Ongoing";
                const isUpcoming = item.status === "Upcoming";

                return (
                  <article
                    key={item._id}
                    className="relative overflow-hidden rounded-2xl bg-white/[0.025] border border-white/10 hover:border-[#d4af37]/50 p-5 transition-all duration-300 group hover:shadow-xl hover:shadow-[#d4af37]/5"
                  >
                    {/* Left Accent Stripe */}
                    <span
                      aria-hidden="true"
                      className={`absolute inset-y-0 left-0 w-1.5 ${
                        isOngoing
                          ? "bg-emerald-500"
                          : isUpcoming
                          ? "bg-[#d4af37]"
                          : "bg-white/20"
                      }`}
                    />

                    <div className="pl-3">
                      {/* Top row: Stage & Status */}
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#d4af37]/15 border border-[#d4af37]/30 text-[#d4af37]">
                            Stage {item.stageNumber || 1}
                          </span>
                          {item.divisionName && (
                            <span className="text-[11px] text-white/50 font-medium">
                              {item.divisionName}
                            </span>
                          )}
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            isOngoing
                              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 animate-pulse"
                              : isUpcoming
                              ? "bg-[#d4af37]/10 border-[#d4af37]/30 text-[#d4af37]"
                              : "bg-white/5 border-white/10 text-white/40"
                          }`}
                        >
                          {isOngoing && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                          {item.status || "Scheduled"}
                        </span>
                      </div>

                      {/* Program Title */}
                      <h3 className="text-lg font-black text-white group-hover:text-[#d4af37] transition-colors leading-snug">
                        {item.programName}
                      </h3>

                      {/* Details row: Time & Category */}
                      <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs text-white/60">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#d4af37]" />
                          <span>{item.timeRange || "TBA"}</span>
                        </div>

                        {item.dateFormatted && (
                          <div className="flex items-center gap-1 text-white/40 text-[11px]">
                            <Calendar className="w-3 h-3" />
                            <span>{item.dateFormatted}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

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
        onLoginSuccess={(p) => {
          setAuthParticipant(p);
          setShowLoginModal(false);
        }}
      />
    </div>
  );
}

export default function ScheduleYearPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0d0906] flex items-center justify-center">
          <Loader2 className="animate-spin text-[#d4af37]" size={40} />
        </div>
      }
    >
      <ScheduleContent />
    </Suspense>
  );
}
