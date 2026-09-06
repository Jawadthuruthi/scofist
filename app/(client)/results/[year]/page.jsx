"use client";
import { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { MultiSelect } from "@/components/ui/multi-select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Trophy,
  Menu,
  X,
  Home,
  Star,
  User,
  LogIn,
  ChevronRight,
  Award,
  Calendar,
  MapPin,
  Users,
  Sparkles,
  Flame,
} from "lucide-react";
import { formatOptions } from "@/lib/utils";
import ResultPostersSection from "@/components/ResultPostersSection";
import { Input } from "@/components/ui/input";
import Link from "next/link";
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
function ResultsTopBar({
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
              className="lg:hidden p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link href={resultsLink} className="flex items-center gap-3 group">
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
              className="text-xs font-bold uppercase tracking-[0.18em] text-[#d4af37] border-b-2 border-[#d4af37] pb-0.5"
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
function ResultsSidebar({
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
    { icon: Trophy, label: "Results", href: resultsLink, active: true },
    { icon: Flame, label: "Team Points", href: teamPointsLink },
    { icon: Calendar, label: "Schedule", href: scheduleLink },
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
              <Trophy className="w-6 h-6 text-[#d4af37]" />
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

/* -------------------- Main Component ---------------------- */
function PublicResultsContent() {
  const [divisions, setDivisions] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [settings, setSettings] = useState(null);
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);
  const [resultData, setResultData] = useState(null);
  const [resultNo, setResultNo] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [authParticipant, setAuthParticipant] = useState(null);
  const [publishedResultsCount, setPublishedResultsCount] = useState(0);

  const searchParams = useSearchParams();
  const params = useParams();
  const yearParam =
    (params?.year ? decodeURIComponent(params.year) : null) ||
    initialYear ||
    searchParams.get("year") ||
    "2026";
  const yearQuery = `year=${encodeURIComponent(yearParam)}&`;
  const yearQueryOnly = `?year=${encodeURIComponent(yearParam)}`;
  const numericYear =
    parseInt(yearParam) ||
    (yearParam?.toString().includes("2026") ? 2026 : 2025);

  /* --------------- fetch divisions on mount --------------- */
  useEffect(() => {
    fetchJSON(`/api/divisions?${yearQuery}projection=_id,name`)
      .then((d) => setDivisions(d.divisions ?? []))
      .catch(() => setError("Unable to load divisions"));
  }, [yearParam]);

  /* --------------- fetch settings on mount --------------- */
  useEffect(() => {
    fetchJSON(`/api/settings${yearQueryOnly}`)
      .then((data) => setSettings(data.settings || null))
      .catch(() => console.error("Unable to load settings"))
      .finally(() => setIsSettingsLoading(false));
  }, [yearParam]);

  /* --------------- fetch published results count --------------- */
  useEffect(() => {
    fetchJSON(`/api/results?${yearQuery}isResultDeclared=true&projection=_id`)
      .then((data) => {
        const count = data.pagination?.totalCount ?? data.results?.length ?? 0;
        setPublishedResultsCount(count);
      })
      .catch((err) => console.error("Unable to load published count:", err));
  }, [yearParam]);

  /* --------------- fetch programs when division changes --------------- */
  useEffect(() => {
    if (!selectedDivision) {
      setPrograms([]);
      setSelectedProgram("");
      return;
    }
    fetchJSON(
      `/api/programs?${yearQuery}divisionId=${selectedDivision}&projection=_id,name`
    )
      .then((p) => setPrograms(p.programs ?? []))
      .catch(() => setError("Unable to load programs"));
  }, [selectedDivision, yearParam]);

  /* --------------- fetch results --------------- */
  useEffect(() => {
    setResults(null);
    setResultData(null);
    setShowResults(false);
    setError("");

    if (!resultNo && !selectedProgram) {
      return;
    }

    setLoading(true);

    let fetchUrl = `/api/results?${yearQuery}isResultDeclared=true`;
    if (selectedProgram) fetchUrl += `&programId=${selectedProgram}`;
    if (resultNo) fetchUrl += `&resultNumber=${resultNo}`;

    fetchJSON(fetchUrl)
      .then((r) => {
        const result = r.results?.[0];
        if (!result) {
          setError("No results found");
          return;
        }
        setResultData(result);

        const top = (result.participants ?? [])
          .filter((p) => p.rank <= 3)
          .sort((a, b) => a.rank - b.rank);

        setResults(top);
        setTimeout(() => setShowResults(true), 100);
      })
      .catch(() => setError("Unable to load results"))
      .finally(() => setLoading(false));
  }, [selectedProgram, resultNo, yearParam]);

  /* --------------- memoized options --------------- */
  const divisionOptions = useMemo(
    () => divisions.map((d) => ({ value: d._id, label: d.name })),
    [divisions]
  );

  const programOptions = useMemo(
    () => programs.map((p) => ({ value: p._id, label: p.name })),
    [programs]
  );

  /* --------------- medal config (Dark Sahityotsav Palette) --------------- */
  const getMedalConfig = useCallback((rank) => {
    if (rank === 1)
      return {
        emoji: "🥇",
        bg: "bg-gradient-to-b from-[#24170e] via-[#1a110a] to-[#120c07]",
        border: "border-[#d4af37]/70 shadow-[0_0_40px_rgba(212,175,55,0.2)]",
        text: "text-[#d4af37]",
      };
    if (rank === 2)
      return {
        emoji: "🥈",
        bg: "bg-[#17100b]/80 backdrop-blur-md",
        border: "border-slate-400/40 shadow-lg",
        text: "text-slate-300",
      };
    return {
      emoji: "🥉",
      bg: "bg-[#17100b]/80 backdrop-blur-md",
      border: "border-amber-600/40 shadow-lg",
      text: "text-amber-400",
    };
  }, []);

  /* --------------- render winner card --------------- */
  const renderWinnerCard = useCallback(
    (participant) => {
      const rank = participant.rank;
      const name = participant.participantDetails?.name || "Unknown";
      const team = participant.participantDetails?.teamId?.name || "Unknown";
      const chest = participant.participantDetails?.chestNumber;
      const grade = participant.participantDetails?.grade;
      const points = participant.points;

      const medal = getMedalConfig(rank);

      return (
        <Card
          key={participant._id}
          className={`${medal.bg} ${medal.border} border-2 rounded-3xl transition-all duration-500 transform ${
            showResults
              ? "translate-y-0 opacity-100"
              : "translate-y-10 opacity-0"
          } hover:scale-105 hover:shadow-2xl text-white`}
          style={{ transitionDelay: `${rank * 100}ms` }}
        >
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div className="text-5xl drop-shadow-md">{medal.emoji}</div>

              <div className={`text-xl font-black ${medal.text} tracking-wide`}>
                {rank === 1 ? "1st" : rank === 2 ? "2nd" : "3rd"} Place
              </div>

              <h3 className="text-xl font-black text-white capitalize">{name}</h3>

              <p className="text-sm text-white/60 font-medium">{team}</p>

              <div className="flex flex-wrap gap-2 justify-center pt-2">
                {chest && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/15 text-white/90">
                    Chest #{chest}
                  </span>
                )}
                {grade && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/15 text-white/90">
                    {grade}
                  </span>
                )}
                {points > 0 && (
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-[#d4af37] to-[#df6b43] text-black">
                    {points} pts
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    },
    [showResults, getMedalConfig]
  );

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

  const handleLoginSuccess = (participant) => {
    setAuthParticipant(participant);
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    setAuthParticipant(null);
  };

  if (isSettingsLoading) {
    return (
      <div className="min-h-screen bg-[#0d0906] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#d4af37]" size={44} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0906] text-white flex flex-col selection:bg-[#d4af37] selection:text-black">
      {/* ── TOP BAR ── */}
      <ResultsTopBar
        festivalName={festivalName}
        festivalYear={festivalYear}
        festivalLogo={festivalLogo}
        festivalNameImage={festivalNameImage}
        yearParam={yearParam}
        onLoginClick={() => setShowLoginModal(true)}
        onOpenSidebar={() => setIsSidebarOpen(true)}
      />

      {/* ── SIDEBAR ── */}
      <ResultsSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        festivalName={festivalName}
        festivalVenue={festivalVenue}
        festivalNameImage={festivalNameImage}
        yearParam={yearParam}
      />

      {/* ── MAIN CONTENT ── */}
      <div className="flex flex-1 pt-16 relative overflow-hidden">
        {/* Ambient Glows */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[64rem] -translate-x-1/2 rounded-full bg-[#d4af37]/[0.055] blur-[130px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-48 top-80 h-96 w-96 rounded-full bg-[#9e6237]/[0.08] blur-[120px]"
        />

        <main className="flex-1 overflow-y-auto relative w-full">
          {authParticipant ? (
            <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-screen">
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
            <>
              {/* HERO HEADER */}
              <section className="relative mx-auto max-w-7xl px-6 pt-5 pb-5 sm:px-8 md:px-12 sm:pt-7 sm:pb-6">
                <header className="max-w-4xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] text-[11px] font-bold uppercase tracking-[0.2em] mb-3">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>{publishedResultsCount} Results Published</span>
                  </div>
                  <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-tight tracking-tight">
                    Competition{" "}
                    <span className="bg-gradient-to-r from-[#e5c07b] via-[#d4af37] to-[#df6b43] bg-clip-text text-transparent">
                      results.
                    </span>
                  </h1>
                  <p className="mt-3 text-sm sm:text-base text-white/60 max-w-xl leading-relaxed">
                    Search by result number or select a division and program to view declared competition results and podium winners.
                  </p>
                </header>
              </section>

              {/* STICKY FILTER BAR */}
              <div className="bg-[#120d09]/90 sticky top-16 z-40 backdrop-blur-md border-y border-white/10">
                <div className="max-w-7xl mx-auto px-6 sm:px-8 md:px-12 py-5 flex items-center justify-center">
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full">
                    {/* Result No. */}
                    <div className="flex-1 min-w-0">
                      <Input
                        type="number"
                        placeholder="Result No."
                        value={resultNo}
                        onChange={(e) => setResultNo(e.target.value)}
                        className="w-full bg-white/[0.06] border-2 border-white text-white placeholder:!text-white focus-visible:border-white focus-visible:ring-white rounded-xl h-12 text-sm px-4 shadow-sm"
                      />
                    </div>

                    {/* Division */}
                    <div className="flex-1 min-w-0">
                      <MultiSelect
                        options={formatOptions(divisionOptions)}
                        value={selectedDivision}
                        onValueChange={setSelectedDivision}
                        multiSelect={false}
                        noBadge={true}
                        variant="plain"
                        placeholder="Select Division"
                        className="bg-white/[0.06] border-2 border-white hover:border-white hover:bg-white/10 text-white rounded-xl h-12 text-sm px-3 shadow-sm [&_span]:!text-white [&_span]:!opacity-100 [&_svg]:!text-white [&_.text-muted-foreground]:!text-white"
                      />
                    </div>

                    {/* Program */}
                    <div className="flex-1 min-w-0">
                      <MultiSelect
                        options={formatOptions(programOptions)}
                        value={selectedProgram}
                        onValueChange={setSelectedProgram}
                        multiSelect={false}
                        noBadge={true}
                        variant="plain"
                        placeholder="Select Program"
                        className="bg-white/[0.06] border-2 border-white hover:border-white hover:bg-white/10 text-white rounded-xl h-12 text-sm px-3 shadow-sm [&_span]:!text-white [&_span]:!opacity-100 [&_svg]:!text-white [&_.text-muted-foreground]:!text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* MAIN CONTENT AREA */}
              <div className="max-w-7xl mx-auto px-6 sm:px-8 md:px-12 py-12">
                {/* Error State */}
                {error && (
                  <div className="text-center py-12">
                    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 max-w-md mx-auto">
                      <p className="text-red-400 font-medium">⚠️ {error}</p>
                    </div>
                  </div>
                )}

                {/* Loading State */}
                {loading && (
                  <div className="text-center py-16">
                    <div className="inline-flex items-center gap-3 bg-white/[0.05] border border-white/10 backdrop-blur-md rounded-full px-6 py-3">
                      <Loader2 className="animate-spin text-[#d4af37]" size={22} />
                      <span className="text-white font-medium text-sm">
                        Loading results...
                      </span>
                    </div>
                  </div>
                )}

                {/* Empty State - No Selection */}
                {!loading && !error && !selectedProgram && !results && (
                  <div className="text-center py-16">
                    <div className="max-w-md mx-auto">
                      <div className="w-24 h-24 mx-auto mb-6 bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-3xl flex items-center justify-center">
                        <Trophy size={48} className="text-[#d4af37]" />
                      </div>
                      <h3 className="text-2xl font-black text-white mb-3">
                        Ready to Reveal Champions
                      </h3>
                      <p className="text-white/60 leading-relaxed text-sm">
                        Select a division and program above or enter a result number to see the podium winners.
                      </p>
                    </div>
                  </div>
                )}

                {/* Empty State - No Results Found */}
                {!loading &&
                  !error &&
                  selectedProgram &&
                  results &&
                  results.length === 0 && (
                    <div className="text-center py-16">
                      <div className="max-w-md mx-auto">
                        <h3 className="text-2xl font-black text-white mb-3">
                          Results Coming Soon
                        </h3>
                        <p className="text-white/60 leading-relaxed text-sm">
                          The competition results haven&apos;t been declared yet. Check back soon!
                        </p>
                      </div>
                    </div>
                  )}

                {/* Winners Display (Podium) */}
                {!loading && !error && results && results.length > 0 && (
                  <div className="space-y-12">
                    <div className="text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#d4af37] text-xs font-bold uppercase tracking-widest mb-3">
                        <Trophy className="w-3.5 h-3.5" />
                        Podium Winners
                      </div>
                      <h2 className="text-4xl font-black text-white">
                        Champions Podium
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {results.map((participant) => renderWinnerCard(participant))}
                    </div>
                  </div>
                )}

                {/* Result Posters */}
                {resultData && settings && (
                  <div className="mt-12">
                    <ResultPostersSection resultData={resultData} settings={settings} />
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── FOOTER ── */}
          <PublicFooter settings={settings} institutionName={festivalVenue} year={yearParam} />
        </main>
      </div>

      {/* Login Modal */}
      <ParticipantLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        festivalNameImage={festivalNameImage}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}

export default function ResultsYearPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0d0906] flex items-center justify-center">
          <Loader2 className="animate-spin text-[#d4af37]" size={40} />
        </div>
      }
    >
      <PublicResultsContent />
    </Suspense>
  );
}
