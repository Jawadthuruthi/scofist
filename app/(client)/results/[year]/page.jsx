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
  Camera,
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
  viewParam,
  onLoginClick,
  onLogoutClick,
  authParticipant,
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
          {/* Left: Festival Name Image */}
          <div className="flex items-center">
            <Link href={resultsLink} className="flex items-center group">
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
            {authParticipant && (
              <Link
                href={`${resultsLink}?view=profile`}
                className={`text-xs font-bold uppercase tracking-[0.18em] pb-0.5 transition-colors ${
                  viewParam !== "results"
                    ? "text-[#d4af37] border-b-2 border-[#d4af37]"
                    : "text-white/70 hover:text-[#d4af37]"
                }`}
              >
                Profile
              </Link>
            )}
            <Link
              href={`${resultsLink}?view=results`}
              className={`text-xs font-bold uppercase tracking-[0.18em] pb-0.5 transition-colors ${
                viewParam === "results" || !authParticipant
                  ? "text-[#d4af37] border-b-2 border-[#d4af37]"
                  : "text-white/70 hover:text-[#d4af37]"
              }`}
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

          {authParticipant ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Photo */}
              <div className="w-8 h-8 shrink-0 rounded-full overflow-hidden border border-[#d4af37]/40 bg-black/50">
                {(authParticipant.participantDetails?.profilePic?.url || (typeof authParticipant.participantDetails?.profilePic === 'string' ? authParticipant.participantDetails?.profilePic : null) || authParticipant.profilePic?.url || (typeof authParticipant.profilePic === 'string' ? authParticipant.profilePic : null)) ? (
                  <img
                    src={authParticipant.participantDetails?.profilePic?.url || (typeof authParticipant.participantDetails?.profilePic === 'string' ? authParticipant.participantDetails?.profilePic : null) || authParticipant.profilePic?.url || (typeof authParticipant.profilePic === 'string' ? authParticipant.profilePic : null)}
                    alt="Participant"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white/10 text-white/50">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
              <button
                onClick={onLogoutClick}
                className="shrink-0 flex items-center gap-2 bg-gradient-to-r from-[#d4af37] via-[#f4c96d] to-[#df6b43] text-[#120d09] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group"
              >
                <LogIn className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">Logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              id="participant-login-btn"
              className="shrink-0 flex items-center gap-2 bg-gradient-to-r from-[#d4af37] via-[#f4c96d] to-[#df6b43] text-[#120d09] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group"
            >
              <LogIn className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline">Participant Login</span>
              <span className="sm:hidden">Login</span>
            </button>
          )}
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
  viewParam,
  onLoginClick,
  onLogoutClick,
  authParticipant,
}) {
  const safeYear = yearParam || "2026";
  const resultsLink = `/results/${safeYear}`;
  const teamPointsLink = `/team-points/${safeYear}`;
  const scheduleLink = `/schedule/${safeYear}`;
  const galleryLink = `/gallery/${safeYear}`;

  const baseNavItems = [
    { icon: Trophy, label: "Results", href: `${resultsLink}?view=results`, active: viewParam === "results" || !authParticipant },
    { icon: Flame, label: "Team Points", href: teamPointsLink },
    { icon: Calendar, label: "Schedule", href: scheduleLink },
    { icon: Camera, label: "Gallery", href: galleryLink },
  ];

  const navItems = authParticipant
    ? [
        { icon: User, label: "Profile", href: `${resultsLink}?view=profile`, active: viewParam !== "results" },
        ...baseNavItems,
      ]
    : baseNavItems;

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
          {authParticipant ? (
            <button
              onClick={() => {
                onClose();
                onLogoutClick?.();
              }}
              className="flex items-center justify-center gap-2 w-full bg-white/10 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider shadow border border-white/20 hover:bg-white/20 transition-colors"
            >
              Logout
            </button>
          ) : (
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
          )}
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
  const [activeProfileTab, setActiveProfileTab] = useState("card"); // 'card' | 'points'
  const [authParticipant, setAuthParticipant] = useState(null);
  const [publishedResultsCount, setPublishedResultsCount] = useState(0);

  // Load auth participant from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("scofist_auth_participant");
      if (stored) {
        setAuthParticipant(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Failed to load auth participant", err);
    }
  }, []);

  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");
  const params = useParams();
  const yearParam =
    (params?.year ? decodeURIComponent(params.year) : null) ||
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

  /* --------------- memoized program and division names --------------- */
  const currentProgramName = useMemo(() => {
    return (
      resultData?.programName ||
      programs.find((p) => p._id === (selectedProgram || resultData?.programId))?.name ||
      resultData?.programId?.name ||
      ""
    );
  }, [resultData, programs, selectedProgram]);

  const currentDivisionName = useMemo(() => {
    return (
      resultData?.divisionName ||
      divisions.find((d) => d._id === (selectedDivision || resultData?.divisionId))?.name ||
      resultData?.programId?.divisionId?.name ||
      ""
    );
  }, [resultData, divisions, selectedDivision]);

  /* --------------- medal config (Dark Sahityotsav Palette) --------------- */
  const getMedalConfig = useCallback((rank) => {
    if (rank === 1)
      return {
        emoji: "🥇",
        bg: "bg-gradient-to-b from-[#24170e] via-[#1a110a] to-[#120c07]",
        border: "border-[#d4af37]/70 shadow-[0_0_40px_rgba(212,175,55,0.2)]",
        photoBorder: "border-[#d4af37] shadow-[0_0_25px_rgba(212,175,55,0.35)]",
        text: "text-[#d4af37]",
      };
    if (rank === 2)
      return {
        emoji: "🥈",
        bg: "bg-[#17100b]/80 backdrop-blur-md",
        border: "border-slate-400/40 shadow-lg",
        photoBorder: "border-slate-300 shadow-[0_0_20px_rgba(203,213,225,0.25)]",
        text: "text-slate-300",
      };
    return {
      emoji: "🥉",
      bg: "bg-[#17100b]/80 backdrop-blur-md",
      border: "border-amber-600/40 shadow-lg",
      photoBorder: "border-amber-500 shadow-[0_0_20px_rgba(217,119,6,0.25)]",
      text: "text-amber-400",
    };
  }, []);

  /* --------------- render winner card --------------- */
  const renderWinnerCard = useCallback(
    (participant, index) => {
      const rank = participant.rank;
      const name = participant.participantDetails?.name || "Unknown";
      const team = participant.participantDetails?.teamId?.name || "Unknown";
      const chest = participant.participantDetails?.chestNumber;
      const photoUrl =
        participant.participantDetails?.profilePic?.url ||
        (typeof participant.participantDetails?.profilePic === "string"
          ? participant.participantDetails.profilePic
          : null) ||
        participant.profilePic?.url ||
        (typeof participant.profilePic === "string" ? participant.profilePic : null) ||
        null;
      const rawGrade = participant.grade || participant.participantDetails?.grade;
      const cleanGrade =
        rawGrade &&
        rawGrade !== "-" &&
        rawGrade.toLowerCase() !== "f" &&
        rawGrade.toLowerCase() !== "no grade"
          ? `${rawGrade.replace(/grade/gi, "").trim()} Grade`
          : null;
      const points = participant.points;

      const medal = getMedalConfig(rank);

      return (
        <Card
          key={participant._id ? `${participant._id}-${index}` : `winner-${index}`}
          className={`${medal.bg} ${medal.border} border-2 rounded-3xl transition-all duration-500 transform ${
            showResults
              ? "translate-y-0 opacity-100"
              : "translate-y-10 opacity-0"
          } hover:scale-105 hover:shadow-2xl text-white`}
          style={{ transitionDelay: `${rank * 100}ms` }}
        >
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              {/* Winner Photo with Medal Overlay */}
              <div className="relative mx-auto w-24 h-24 sm:w-28 sm:h-28">
                <div
                  className={`w-full h-full rounded-full overflow-hidden border-4 ${medal.photoBorder} bg-black/50 flex items-center justify-center`}
                >
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-black text-3xl uppercase text-white/40 bg-white/[0.06]">
                      {name?.charAt(0) || <User className="w-8 h-8 text-white/40" />}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-1 text-3xl sm:text-4xl drop-shadow-lg select-none">
                  {medal.emoji}
                </div>
              </div>

              <div>
                <div className={`text-xl font-black ${medal.text} tracking-wide`}>
                  {rank === 1 ? "1st" : rank === 2 ? "2nd" : "3rd"} Place
                </div>
                {chest && (
                  <p className="text-sm font-semibold text-white/70 tracking-wide mt-1">
                    Chest No. {chest}
                  </p>
                )}
              </div>

              <h3 className="text-xl font-black text-white capitalize">{name}</h3>

              <p className="text-sm text-white/60 font-medium">{team}</p>

              <div className="flex flex-wrap gap-2 justify-center pt-2">
                {cleanGrade && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/10 border border-white/15 text-white/90">
                    {cleanGrade}
                  </span>
                )}
                {points > 0 && (
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-[#d4af37] to-[#df6b43] text-black">
                    {points} Points
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
    try {
      localStorage.setItem("scofist_auth_participant", JSON.stringify(participant));
      window.dispatchEvent(new Event("auth-change"));
    } catch (err) {
      console.error("Failed to save auth participant", err);
    }
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    setAuthParticipant(null);
    try {
      localStorage.removeItem("scofist_auth_participant");
      window.dispatchEvent(new Event("auth-change"));
    } catch (err) {
      console.error("Failed to remove auth participant", err);
    }
  };

  if (isSettingsLoading) {
    return (
      <div className="min-h-screen bg-[#0d0906] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#d4af37]" size={44} />
      </div>
    );
  }

  // Filter for Individual programs that are NOT Secondary division
  const eligiblePointsPrograms = authParticipant?.programs?.filter(
    (p) => p.type === "Individual" && p.divisionType !== "Secondary"
  ) || [];

  const participantTotalPoints = eligiblePointsPrograms.reduce((sum, p) => sum + (p.points || 0), 0);
  
  const totalStagePoints = eligiblePointsPrograms
    .filter(p => p.category === "Stage")
    .reduce((sum, p) => sum + (p.points || 0), 0);
    
  const totalOffStagePoints = eligiblePointsPrograms
    .filter(p => p.category === "Off-Stage")
    .reduce((sum, p) => sum + (p.points || 0), 0);

  return (
    <div className="min-h-screen bg-[#0d0906] text-white flex flex-col selection:bg-[#d4af37] selection:text-black">
      {/* ── TOP BAR ── */}
      <ResultsTopBar
        festivalName={festivalName}
        festivalYear={festivalYear}
        festivalLogo={festivalLogo}
        festivalNameImage={festivalNameImage}
        yearParam={yearParam}
        viewParam={viewParam}
        authParticipant={authParticipant}
        onLoginClick={() => setShowLoginModal(true)}
        onLogoutClick={handleLogout}
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
        viewParam={viewParam}
        authParticipant={authParticipant}
        onLoginClick={() => setShowLoginModal(true)}
        onLogoutClick={handleLogout}
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
          {authParticipant && searchParams.get("view") !== "results" ? (
            <div className="p-4 pt-8 md:p-8 max-w-4xl mx-auto min-h-screen">
              
              {/* Profile Tabs Toggle */}
              <div className="flex bg-[#1a120e] p-1.5 rounded-2xl border border-white/10 mb-8 max-w-[320px] mx-auto shadow-xl">
                <button
                  onClick={() => setActiveProfileTab("card")}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all duration-300 ${
                    activeProfileTab === "card"
                      ? "bg-gradient-to-r from-[#d4af37] to-[#df6b43] text-black shadow-lg"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  My Card
                </button>
                <button
                  onClick={() => setActiveProfileTab("points")}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all duration-300 ${
                    activeProfileTab === "points"
                      ? "bg-gradient-to-r from-[#d4af37] to-[#df6b43] text-black shadow-lg"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  My Points
                </button>
              </div>

              {/* Tab Content: Participant Card */}
              {activeProfileTab === "card" && (
                <div className="w-full max-w-[400px] md:max-w-2xl mx-auto flex justify-center animate-in fade-in zoom-in-95 duration-300">
                  <ParticipantCard
                    participant={authParticipant}
                    festivalSettings={settings?.festival}
                    viewMode="both"
                    layout="row"
                    baseUrl={typeof window !== "undefined" ? window.location.origin : ""}
                  />
                </div>
              )}

              {/* Tab Content: My Points */}
              {activeProfileTab === "points" && (
                <div className="w-full max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-300">
                  <div className="rounded-2xl overflow-hidden border border-[#d4af37]/30 shadow-2xl bg-gradient-to-br from-[#1a120e] to-[#2a1b12] flex flex-col p-6 sm:p-8">
                    <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-6">
                      <div className="flex items-center gap-4">
                        <div className="bg-[#d4af37]/20 p-3.5 rounded-full shadow-[0_0_15px_rgba(212,175,55,0.15)]">
                          <Trophy className="w-8 h-8 text-[#d4af37]" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-black text-white">My Points</h2>
                          <p className="text-sm font-medium text-white/50">Detailed Breakdown</p>
                          {/* Mobile-only points breakdown */}
                          <div className="text-[10px] text-white/40 mt-2 flex sm:hidden gap-2 font-medium uppercase tracking-wider">
                            <span>Stage <strong className="text-white/80">{totalStagePoints}</strong></span>
                            <span className="w-1 h-1 rounded-full bg-white/20 self-center"></span>
                            <span>Off-Stage <strong className="text-white/80">{totalOffStagePoints}</strong></span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-4xl sm:text-5xl font-black text-[#d4af37] tracking-tight">{participantTotalPoints}</span>
                          <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Pts</span>
                        </div>
                        {/* Desktop-only points breakdown */}
                        <div className="text-[11px] text-white/40 mt-1.5 hidden sm:flex gap-2.5 font-medium uppercase tracking-wider">
                          <span>Stage <strong className="text-white/80">{totalStagePoints}</strong></span>
                          <span className="w-1 h-1 rounded-full bg-white/20 self-center"></span>
                          <span>Off-Stage <strong className="text-white/80">{totalOffStagePoints}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {eligiblePointsPrograms.length > 0 ? (
                        eligiblePointsPrograms.map((prog, idx) => (
                          <div key={idx} className="bg-black/20 border border-white/5 rounded-xl p-4 flex items-center justify-between gap-4 hover:bg-black/40 transition-colors">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-white text-sm sm:text-base truncate">
                                {prog.name || "Unknown Program"}
                                {prog.category && (
                                  <span className="text-white/40 font-normal text-xs ml-1.5">({prog.category})</span>
                                )}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5 text-xs">
                                {prog.grade && prog.grade !== "—" && (
                                  <span className="bg-white/10 text-white/90 px-2 py-1 rounded-md font-bold">
                                    {prog.grade.toLowerCase() === "f" || prog.grade.toLowerCase() === "no grade" 
                                      ? "No Grade" 
                                      : `Grade ${prog.grade}`}
                                  </span>
                                )}
                                {prog.rank && prog.rank !== "—" && (
                                  <span className="bg-[#d4af37]/20 text-[#d4af37] px-2 py-1 rounded-md font-bold">Rank {prog.rank}</span>
                                )}
                              </div>
                            </div>
                            <div className="shrink-0 flex flex-col items-center justify-center bg-black/40 rounded-lg py-2 px-4 border border-white/5">
                              <span className="text-2xl font-black text-[#d4af37] leading-none">{prog.points || 0}</span>
                              <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Pts</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-white/40 text-sm py-12 bg-black/10 rounded-xl border border-dashed border-white/10">
                          No programs assigned yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <>
              {/* HERO HEADER & DROPDOWN FILTERS */}
              <section className="relative mx-auto max-w-7xl px-6 pt-10 pb-4 sm:px-8 md:px-12 sm:pt-7 md:pt-17 sm:pb-6">
                <header className="max-w-4xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37] text-[11px] font-bold uppercase tracking-[0.2em] mb-3">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>{publishedResultsCount} Results Published</span>
                  </div>
                  <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.1] sm:leading-tight tracking-tight">
                    Competition{" "}
                    <span className="bg-gradient-to-r from-[#e5c07b] via-[#d4af37] to-[#df6b43] bg-clip-text text-transparent">
                      results.
                    </span>
                  </h1>
                  <p className="mt-1.5 sm:mt-3 text-sm sm:text-base text-white/60 max-w-xl leading-relaxed">
                    Search to view declared results and winners.
                  </p>
                </header>

                {/* Dropdown Filters */}
                <div className="mt-10 sm:mt-12 md:mt-16 flex flex-col sm:flex-row gap-4 sm:gap-6 w-full">
                  {/* Result No. */}
                  <div className="flex-1 min-w-0">
                    <Input
                      type="number"
                      placeholder="Result No."
                      value={resultNo}
                      onChange={(e) => setResultNo(e.target.value)}
                      className="w-full bg-[#0d0906] border-2 border-white text-white placeholder:!text-white focus-visible:border-white focus-visible:ring-white rounded-xl h-12 text-sm px-4 shadow-sm"
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
                      dark={true}
                      className="bg-[#0d0906] border-2 border-white hover:border-white hover:bg-[#0d0906]/80 text-white rounded-xl h-12 text-sm px-3 shadow-sm [&_span]:!text-white [&_span]:!opacity-100 [&_svg]:!text-white [&_.text-muted-foreground]:!text-white"
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
                      dark={true}
                      className="bg-[#0d0906] border-2 border-white hover:border-white hover:bg-[#0d0906]/80 text-white rounded-xl h-12 text-sm px-3 shadow-sm [&_span]:!text-white [&_span]:!opacity-100 [&_svg]:!text-white [&_.text-muted-foreground]:!text-white"
                    />
                  </div>
                </div>
              </section>

              {/* MAIN CONTENT AREA */}
              <div className="max-w-7xl mx-auto px-6 sm:px-8 md:px-12 pt-2 sm:pt-4 pb-12">
                {/* Error State */}
                {error && (
                  <div className="text-center py-8">
                    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 max-w-md mx-auto">
                      <p className="text-red-400 font-medium">⚠️ {error}</p>
                    </div>
                  </div>
                )}

                {/* Loading State */}
                {loading && (
                  <div className="text-center py-10">
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
                  <div className="text-center pt-8 pb-12 sm:pt-4 sm:pb-14">
                    <div className="max-w-md mx-auto">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-3xl flex items-center justify-center">
                        <Trophy size={42} className="text-[#d4af37]" />
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-white mb-2 sm:mb-3">
                        Ready to Reveal Champions
                      </h3>
                      <p className="text-white/60 leading-relaxed text-sm">
                        Select a division and program above or enter a result number to see the winners.
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
                  <div className="space-y-5 sm:space-y-6">
                    <div className="text-center">
                      <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
                        Champions Podium
                      </h2>
                      {currentProgramName && (
                        <p className="mt-3 text-xl sm:text-2xl md:text-3xl font-bold text-[#d4af37] capitalize tracking-wide">
                          {currentProgramName}
                        </p>
                      )}
                      {currentDivisionName && (
                        <p className="mt-1.5 text-xs sm:text-sm md:text-base font-semibold text-white/60 uppercase tracking-[0.2em]">
                          {currentDivisionName}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {results.map((participant, index) => renderWinnerCard(participant, index))}
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
          <PublicFooter settings={settings} institutionName={festivalVenue} year={yearParam} variant="festival" />
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
