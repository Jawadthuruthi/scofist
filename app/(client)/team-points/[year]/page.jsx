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
  Sparkles,
  Flame,
  Calendar,
  Camera,
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
function TeamPointsTopBar({
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
          {/* Left: Mobile menu button + Festival Name Image */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenSidebar}
              className="lg:hidden -ml-2 p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link href={teamPointsLink} className="flex items-center gap-3 group">
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
                  <Trophy className="w-5 h-5 text-white" />
                </div>
              )}
            </Link>
          </div>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-8">
            <Link
              href={resultsLink}
              className="text-xs font-bold uppercase tracking-[0.18em] text-white/70 hover:text-[#d4af37] transition-colors"
            >
              Results
            </Link>
            <Link
              href={teamPointsLink}
              className="text-xs font-bold uppercase tracking-[0.18em] text-[#d4af37] border-b-2 border-[#d4af37] pb-0.5"
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
              className="text-xs font-bold uppercase tracking-[0.18em] text-white/70 hover:text-[#d4af37] transition-colors"
            >
              Gallery
            </Link>
          </nav>

          {/* Right: Participant Login */}
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
function TeamPointsSidebar({
  isOpen,
  onClose,
  festivalName,
  festivalVenue,
  festivalNameImage,
  yearParam,
  onLoginClick,
}) {
  const safeYear = yearParam || "2026";
  const resultsLink = `/results/${safeYear}`;
  const teamPointsLink = `/team-points/${safeYear}`;
  const scheduleLink = `/schedule/${safeYear}`;
  const galleryLink = `/gallery/${safeYear}`;

  const navItems = [
    { icon: Trophy, label: "Results", href: resultsLink },
    { icon: Flame, label: "Team Points", href: teamPointsLink, active: true },
    { icon: Calendar, label: "Schedule", href: scheduleLink },
    { icon: Camera, label: "Gallery", href: galleryLink },
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
          <button
            onClick={() => {
              onClose();
              onLoginClick?.();
            }}
            className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-[#d4af37] to-[#df6b43] text-[#120d09] py-3 rounded-xl text-xs font-bold uppercase tracking-wider shadow hover:opacity-90 transition-opacity"
          >
            <LogIn className="w-4 h-4" />
            Participant Login
          </button>
        </div>
      </aside>
    </>
  );
}

/* -------------------- Main Content Component -------------------- */
function TeamPointsContent() {
  const [teams, setTeams] = useState([]);
  const [teamColors, setTeamColors] = useState({});
  const [totalResults, setTotalResults] = useState(0);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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

  /* --------------- Fetch settings and team points on mount --------------- */
  useEffect(() => {
    setLoading(true);
    setError("");

    Promise.all([
      fetchJSON(`/api/settings?${yearQuery}`).catch(() => ({ settings: null })),
      fetchJSON(`/api/team-points-poster?${yearQuery}`).catch(() => ({
        success: false,
        teams: [],
      })),
    ])
      .then(([settingsData, pointsData]) => {
        setSettings(settingsData.settings || null);
        if (pointsData.success) {
          setTeams(pointsData.teams || []);
          setTeamColors(pointsData.teamColors || {});
          setTotalResults(pointsData.totalResultsAvailable || 0);
        } else {
          setError("Failed to load team points");
        }
      })
      .catch((err) => {
        console.error("Error loading data:", err);
        setError("Unable to load team points data");
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

  /* Filtered teams based on search */
  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) return teams;
    const query = searchQuery.toLowerCase().trim();
    return teams.filter((t) => t.name.toLowerCase().includes(query));
  }, [teams, searchQuery]);

  const maxPoints = useMemo(() => {
    if (!teams || teams.length === 0) return 1;
    return Math.max(...teams.map((t) => t.points || 0), 1);
  }, [teams]);

  const topThree = useMemo(() => {
    if (!teams || teams.length === 0) return [];
    return teams.slice(0, 3);
  }, [teams]);

  const champion = topThree[0] || null;
  const runnerUp = topThree[1] || null;
  const thirdPlace = topThree[2] || null;

  const handleLoginSuccess = (participant) => {
    setAuthParticipant(participant);
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    setAuthParticipant(null);
  };

  return (
    <div className="min-h-screen bg-[#0d0906] text-white flex flex-col selection:bg-[#d4af37] selection:text-black">
      {/* ── TOP BAR ── */}
      <TeamPointsTopBar
        festivalName={festivalName}
        festivalYear={festivalYear}
        festivalLogo={festivalLogo}
        festivalNameImage={festivalNameImage}
        yearParam={yearParam}
        onLoginClick={() => setShowLoginModal(true)}
        onOpenSidebar={() => setIsSidebarOpen(true)}
      />

      {/* ── SIDEBAR ── */}
      <TeamPointsSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        festivalName={festivalName}
        festivalVenue={festivalVenue}
        festivalNameImage={festivalNameImage}
        yearParam={yearParam}
        onLoginClick={() => setShowLoginModal(true)}
      />

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 relative overflow-hidden pt-16">
        {/* Background Ambient Glows (matching keralasahityotsav style) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[64rem] -translate-x-1/2 rounded-full bg-[#d4af37]/[0.055] blur-[130px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-48 top-80 h-96 w-96 rounded-full bg-[#9e6237]/[0.08] blur-[120px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 top-40 h-[30rem] w-[30rem] rounded-full bg-[#df6b43]/[0.06] blur-[120px]"
        />

        {authParticipant ? (
          <div className="p-4 pt-8 md:p-8 max-w-5xl mx-auto min-h-screen">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-white">My Participant Card</h2>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-white/10 text-white border border-white/20 hover:bg-white/20 rounded-xl font-semibold shadow-sm transition-colors"
              >
                Logout
              </button>
            </div>
            <div className="w-full max-w-2xl mx-auto flex justify-center">
              <ParticipantCard
                participant={authParticipant}
                festivalSettings={settings?.festival}
                viewMode="both"
                layout="row"
                baseUrl={typeof window !== "undefined" ? window.location.origin : ""}
              />
            </div>
          </div>
        ) : (
          <section className="relative mx-auto max-w-7xl px-6 pt-10 pb-12 sm:px-8 md:px-12 sm:pt-7 sm:pb-16">
            {/* Header / Hero Title */}
            <header className="max-w-4xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] text-[11px] font-bold uppercase tracking-[0.2em] mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {festivalName} '{festivalYear.toString().slice(-2)} • Standings
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.1] sm:leading-tight tracking-tight">
                Final team{" "}
                <span className="bg-gradient-to-r from-[#e5c07b] via-[#d4af37] to-[#df6b43] bg-clip-text text-transparent">
                  points.
                </span>
              </h1>
              <p className="mt-1.5 sm:mt-3 text-sm sm:text-base text-white/60 max-w-xl">
                Official team standings after {totalResults} published results.
              </p>
            </header>

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
                  Calculating team points...
                </p>
              </div>
            )}

            {!loading && !error && teams.length === 0 && (
              <div className="mt-16 text-center py-16 bg-white/[0.02] border border-white/5 rounded-3xl p-8 max-w-md mx-auto">
                <Trophy className="w-16 h-16 text-[#d4af37]/40 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">
                  No Declared Results Yet
                </h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  Team standings will appear automatically once competition results are declared.
                </p>
              </div>
            )}

            {/* ── TOP 3 PODIUM SECTION (Exact match to Sahityotsav) ── */}
            {!loading && !error && topThree.length > 0 && (
              <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-12 md:items-end">
                {/* 1st Place - Champion (Center & Prominent) */}
                {champion && (
                  <div className="md:order-2 md:col-span-6 md:-translate-y-5">
                    <article className="relative overflow-hidden text-center rounded-3xl bg-gradient-to-b from-[#24170e] via-[#1a110a] to-[#120c07] p-8 sm:p-12 border-2 border-[#d4af37]/70 shadow-[0_0_60px_rgba(212,175,55,0.18)] group hover:border-[#d4af37] transition-all duration-300">
                      {/* Background Glow */}
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#d4af37]/20 rounded-full blur-[70px]"
                      />

                      <div className="relative">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#d4af37] text-[10px] font-black uppercase tracking-[0.26em] mb-4">
                          <Trophy className="w-3 h-3 text-[#d4af37]" />
                          Festival champion
                        </div>

                        {/* Huge 01 */}
                        <div className="font-black leading-[0.75] tabular-nums text-[5.5rem] sm:text-[7.5rem] text-[#d4af37] drop-shadow-[0_0_25px_rgba(212,175,55,0.3)]">
                          01
                        </div>

                        <div
                          aria-hidden="true"
                          className="mx-auto mt-6 h-px w-24 bg-gradient-to-r from-transparent via-[#d4af37]/70 to-transparent"
                        />

                        {/* Team Name */}
                        <h3 className="mx-auto mt-5 break-words font-black leading-tight text-white max-w-md text-2xl sm:text-4xl capitalize tracking-tight">
                          {champion.name}
                        </h3>

                        {/* Big Points */}
                        <p className="mt-4 font-black tabular-nums text-4xl sm:text-5xl text-[#d4af37]">
                          {champion.points.toLocaleString()}
                          <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                            points
                          </span>
                        </p>
                      </div>
                    </article>
                  </div>
                )}

                {/* 2nd Place (Left) */}
                {runnerUp && (
                  <div className="md:order-1 md:col-span-3">
                    <article className="relative overflow-hidden text-center rounded-3xl bg-[#17100b]/80 backdrop-blur-md p-6 sm:p-8 border border-white/10 shadow-lg hover:border-white/20 transition-all duration-300">
                      <div className="relative">
                        <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#d4af37]/90">
                          Second place
                        </p>

                        {/* Huge 02 */}
                        <div className="mt-4 font-black leading-[0.75] tabular-nums text-[4.5rem] md:text-[5rem] text-white/20">
                          02
                        </div>

                        <div
                          aria-hidden="true"
                          className="mx-auto mt-5 h-px w-14 bg-white/15"
                        />

                        <h3 className="mx-auto mt-5 break-words font-bold leading-tight text-white text-lg md:text-xl capitalize">
                          {runnerUp.name}
                        </h3>

                        <p className="mt-4 font-black tabular-nums text-3xl text-white">
                          {runnerUp.points.toLocaleString()}
                          <span className="ml-2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
                            points
                          </span>
                        </p>
                      </div>
                    </article>
                  </div>
                )}

                {/* 3rd Place (Right) */}
                {thirdPlace && (
                  <div className="md:order-3 md:col-span-3">
                    <article className="relative overflow-hidden text-center rounded-3xl bg-[#17100b]/80 backdrop-blur-md p-6 sm:p-8 border border-white/10 shadow-lg hover:border-white/20 transition-all duration-300">
                      <div className="relative">
                        <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#d4af37]/90">
                          Third place
                        </p>

                        {/* Huge 03 */}
                        <div className="mt-4 font-black leading-[0.75] tabular-nums text-[4.5rem] md:text-[5rem] text-white/20">
                          03
                        </div>

                        <div
                          aria-hidden="true"
                          className="mx-auto mt-5 h-px w-14 bg-white/15"
                        />

                        <h3 className="mx-auto mt-5 break-words font-bold leading-tight text-white text-lg md:text-xl capitalize">
                          {thirdPlace.name}
                        </h3>

                        <p className="mt-4 font-black tabular-nums text-3xl text-white">
                          {thirdPlace.points.toLocaleString()}
                          <span className="ml-2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
                            points
                          </span>
                        </p>
                      </div>
                    </article>
                  </div>
                )}
              </div>
            )}

            {/* ── FINAL TABLE / STANDINGS LIST (All Ranked Teams) ── */}
            {!loading && !error && teams.length > 0 && (
              <div className="mt-16 sm:mt-24">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#d4af37]">
                      Final table
                    </p>
                    <h3 className="mt-1 text-2xl font-black text-white">
                      {teams.length} teams ranked
                    </h3>
                  </div>

                  {/* Search Bar */}
                  <div className="w-full sm:w-72">
                    <div className="relative">
                      <Search
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#d4af37]"
                        size={15}
                      />
                      <input
                        type="text"
                        placeholder="Find a team…"
                        aria-label="Search teams"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-11 w-full rounded-full bg-white/[0.05] border border-white/10 pl-10 pr-4 text-sm text-white placeholder:text-white/40 outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Team Standings List */}
                <div className="mt-6 rounded-3xl bg-white/[0.02] border border-white/10 divide-y divide-white/[0.06] overflow-hidden">
                  {filteredTeams.length === 0 ? (
                    <div className="p-8 text-center text-white/50 text-sm">
                      No teams match &quot;{searchQuery}&quot;
                    </div>
                  ) : (
                    filteredTeams.map((team, idx) => {
                      const rank =
                        teams.findIndex((t) => t._id === team._id) + 1;
                      const isPodium = rank <= 3;
                      const scorePercentage =
                        maxPoints > 0 ? (team.points / maxPoints) * 100 : 0;

                      return (
                        <div
                          key={team._id || team.name}
                          className="group p-4 sm:p-6 hover:bg-white/[0.035] transition-colors duration-200"
                        >
                          <div className="flex items-center gap-4">
                            {/* Rank Badge */}
                            <span
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-black text-xs tabular-nums border ${
                                rank === 1
                                  ? "bg-[#d4af37]/20 text-[#d4af37] border-[#d4af37]/50"
                                  : rank === 2
                                  ? "bg-slate-400/20 text-slate-300 border-slate-400/40"
                                  : rank === 3
                                  ? "bg-amber-600/20 text-amber-400 border-amber-600/40"
                                  : "bg-white/[0.04] text-white/50 border-white/10"
                              }`}
                            >
                              {rank < 10 ? `0${rank}` : rank}
                            </span>

                            {/* Team Color Dot + Name */}
                            <div className="min-w-0 flex-1 flex items-center gap-2.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor:
                                    team.color || teamColors[team.name] || "#808080",
                                }}
                              />
                              <span className="font-black text-base sm:text-lg text-white capitalize break-words">
                                {team.name}
                              </span>
                            </div>

                            {/* Points Display */}
                            <span className="shrink-0 font-black text-xl sm:text-2xl tabular-nums text-white">
                              {team.points.toLocaleString()}
                              <span className="ml-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-white/40">
                                pts
                              </span>
                            </span>
                          </div>

                          {/* Progress Line Bar */}
                          <div className="ml-14 mt-3 h-1 rounded-full overflow-hidden bg-white/[0.06]">
                            <div
                              aria-hidden="true"
                              className="h-full rounded-full bg-gradient-to-r from-[#d4af37] via-[#f4c96d] to-[#df6b43] transition-all duration-700 ease-out"
                              style={{ width: `${scorePercentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </section>
        )}
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
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}

export default function TeamPointsYearPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0d0906] flex items-center justify-center">
          <Loader2 className="animate-spin text-[#d4af37]" size={40} />
        </div>
      }
    >
      <TeamPointsContent />
    </Suspense>
  );
}
