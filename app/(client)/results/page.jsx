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
function ResultsTopBar({ festivalName, festivalYear, festivalLogo, onLoginClick }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const displayName = festivalName
    ? festivalName.charAt(0).toUpperCase() + festivalName.slice(1)
    : "Festival";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#fbfaf7]/95 backdrop-blur-md shadow-md"
          : "bg-[#fbfaf7]/90 backdrop-blur-sm"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Festival Logo */}
          <div className="flex items-center gap-3">
            {/* Festival Logo */}
            <Link href="/results" className="flex items-center gap-2 group">
              {festivalLogo ? (
                <img
                  src={festivalLogo}
                  alt={displayName}
                  className="h-9 w-9 object-contain rounded-lg group-hover:opacity-85 transition-opacity flex-shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3f2720] to-[#9e6237] flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow flex-shrink-0">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
              )}
            </Link>
          </div>

          {/* Right: Participant Login */}
          <button
            onClick={onLoginClick}
            id="participant-login-btn"
            className="flex items-center gap-2 bg-gradient-to-r from-[#3f2720] to-[#9e6237] text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md hover:opacity-90 transition-all duration-200 group"
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
function ResultsSidebar({ isOpen, onClose, festivalName, festivalVenue, festivalNameImage }) {
  const navItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: Trophy, label: "Results", href: "/results", active: true },
    { icon: Users, label: "Participants", href: "/participant" },
    { icon: Star, label: "Updates", href: "/updates" },
    { icon: Award, label: "Articles", href: "/articles" },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Navigation sidebar"
      >
        {/* Sidebar Header */}
        <div className="relative bg-gradient-to-br from-[#3f2720] to-[#9e6237] p-6 pb-8">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          <div className="flex items-center gap-3 mt-2">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              {festivalNameImage ? (
                <img
                  src={festivalNameImage}
                  alt={festivalName || "Festival"}
                  className="h-12 w-auto object-contain max-w-[180px] brightness-0 invert"
                />
              ) : (
                <p className="text-white font-black text-xl capitalize">
                  {festivalName || "Festival"}
                </p>
              )}
              {festivalVenue && (
                <p className="text-white/70 text-xs mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {festivalVenue}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-3">
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
                        ? "bg-gradient-to-r from-[#3f2720]/10 to-[#9e6237]/10 text-[#3f2720] font-semibold"
                        : "text-gray-600 hover:bg-gray-50 hover:text-[#3f2720]"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 ${
                        item.active ? "text-[#9e6237]" : "text-gray-400 group-hover:text-[#9e6237]"
                      }`}
                    />
                    <span className="text-sm">{item.label}</span>
                    {item.active && (
                      <ChevronRight className="w-3 h-3 ml-auto text-[#9e6237]" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar Footer CTA */}
        <div className="p-4 border-t border-gray-100">
          <Link
            href="/participant"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-[#3f2720] to-[#9e6237] text-white py-3 rounded-xl text-sm font-semibold shadow hover:opacity-90 transition-opacity"
          >
            <LogIn className="w-4 h-4" />
            Participant Login
          </Link>
          <p className="text-center text-xs text-gray-400 mt-2">
            View your results & profile
          </p>
        </div>
      </aside>
    </>
  );
}

/* -------------------- main component ---------------------- */
function PublicResultsContent() {
  /* --------------- state --------------- */
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
  const [authParticipant, setAuthParticipant] = useState(null);

  const searchParams = useSearchParams();
  const params = useParams();
  const yearParam = (params && params.year) ? decodeURIComponent(params.year) : searchParams.get("year") || "2025 november";
  const yearQuery = `year=${encodeURIComponent(yearParam)}&`;
  const yearQueryOnly = `?year=${encodeURIComponent(yearParam)}`;

  /* --------------- fetch divisions on mount --------------- */
  useEffect(() => {
    fetchJSON(`/api/divisions?${yearQuery}projection=_id,name`)
      .then((d) => setDivisions(d.divisions ?? []))
      .catch(() => setError("Unable to load divisions"));
  }, []);

  /* --------------- fetch settings on mount --------------- */
  useEffect(() => {
    fetchJSON(`/api/settings${yearQueryOnly}`)
      .then((data) => setSettings(data.settings || null))
      .catch(() => console.error("Unable to load settings"))
      .finally(() => setIsSettingsLoading(false));
  }, []);

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
  }, [selectedDivision]);

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
  }, [selectedProgram, resultNo]);

  /* --------------- memoized options --------------- */
  const divisionOptions = useMemo(
    () => divisions.map((d) => ({ value: d._id, label: d.name })),
    [divisions]
  );

  const programOptions = useMemo(
    () => programs.map((p) => ({ value: p._id, label: p.name })),
    [programs]
  );

  /* --------------- medal config --------------- */
  const getMedalConfig = useCallback((rank) => {
    if (rank === 1)
      return {
        emoji: "🥇",
        bg: "bg-yellow-100",
        border: "border-yellow-400",
        text: "text-yellow-700",
      };
    if (rank === 2)
      return {
        emoji: "🥈",
        bg: "bg-gray-100",
        border: "border-gray-400",
        text: "text-gray-700",
      };
    return {
      emoji: "🥉",
      bg: "bg-orange-100",
      border: "border-orange-400",
      text: "text-orange-700",
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
          className={`${medal.bg} ${medal.border} border-2 transition-all duration-500 transform ${
            showResults
              ? "translate-y-0 opacity-100"
              : "translate-y-10 opacity-0"
          } hover:scale-105 hover:shadow-xl`}
          style={{ transitionDelay: `${rank * 100}ms` }}
        >
          <CardContent className="p-6">
            <div className="text-center space-y-3">
              {/* Medal */}
              <div className="text-5xl">{medal.emoji}</div>

              {/* Rank */}
              <div className={`text-xl font-bold ${medal.text}`}>
                {rank === 1 ? "1st" : rank === 2 ? "2nd" : "3rd"} Place
              </div>

              {/* Name */}
              <h3 className="text-lg font-semibold text-gray-800">{name}</h3>

              {/* Team */}
              <p className="text-sm text-gray-600">{team}</p>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 justify-center">
                {chest && (
                  <Badge variant="outline" className="text-xs">
                    Chest #{chest}
                  </Badge>
                )}
                {grade && (
                  <Badge variant="outline" className="text-xs">
                    {grade}
                  </Badge>
                )}
                {points > 0 && (
                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs">
                    {points} pts
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      );
    },
    [showResults, getMedalConfig]
  );

  // 🆕 Extract festival info with defaults
  const festivalInfo = settings?.festival?.festivalInfo || {};
  const festivalName = festivalInfo.name || "esperanza";
  const festivalTheme =
    festivalInfo.theme || "Recall the legacy, Reignite the light";
  const festivalYear = festivalInfo.year || new Date().getFullYear();
  const festivalVenue = festivalInfo.venue || "Sa-adiya Da-awa College";
  const startDate = festivalInfo.dates?.startDate;
  const endDate = festivalInfo.dates?.endDate;
  const festivalNameImage = settings?.festival?.festivalNameImage?.url || null;
  const festivalFullNameImage = settings?.festival?.festivalFullNameImage?.url || null;
  const festivalLogo = settings?.festival?.festivalLogo?.url || null;

  const handleLoginSuccess = (participant) => {
    setAuthParticipant(participant);
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    setAuthParticipant(null);
  };

  // 🆕 Format dates
  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
    });
  };

  if (isSettingsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fbfaf7] via-[#f5f3f0] to-[#e8e6e3] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#9e6237]" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fbfaf7] via-[#f5f3f0] to-[#e8e6e3] flex flex-col">
      {/* ── TOP BAR ── */}
      <ResultsTopBar
        festivalName={festivalName}
        festivalYear={festivalYear}
        festivalLogo={festivalLogo}
        onLoginClick={() => setShowLoginModal(true)}
      />

      {/* Main wrapper — offset for fixed topbar */}
      <div className="flex flex-1 pt-16">
        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 overflow-y-auto relative w-full">
          
          {authParticipant ? (
            <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-screen">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-[#3f2720]">My Participant Card</h2>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-white text-[#3f2720] border border-[#3f2720] hover:bg-gray-50 rounded-xl font-semibold shadow-sm transition-colors"
                >
                  Logout
                </button>
              </div>
              {/* Participant Card Container */}
              <div className="w-full max-w-4xl mx-auto flex justify-center">
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
          <div className="relative overflow-hidden bg-white">
            <div className="relative z-10 py-10 px-4 flex items-center justify-center">
              {festivalNameImage ? (
                <img
                  src={festivalNameImage}
                  alt={festivalName}
                  className="w-full max-w-[75vw] sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl object-contain transition-all duration-300"
                />
              ) : (
                <h1 className="text-6xl md:text-8xl font-black text-center">
                  <span className="text-[#3f2720]">{festivalName}</span>
                  <sup className="text-3xl md:text-4xl text-[#9e6237] ml-2">
                    '{festivalYear.toString().slice(-2)}
                  </sup>
                </h1>
              )}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-[#fbfaf7]/90 sticky top-16 z-40 backdrop-blur-sm">
            <div className="max-w-6xl mx-auto p-4 h-full flex items-center justify-center">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full max-w-2xl">
                {/* Result No. */}
                <div className="flex-1">
                  <Input
                    type="number"
                    placeholder="Result No."
                    value={resultNo}
                    onChange={(e) => setResultNo(e.target.value)}
                  />
                </div>

                {/* Division */}
                <div className="flex-1">
                  <MultiSelect
                    options={formatOptions(divisionOptions)}
                    value={selectedDivision}
                    onValueChange={setSelectedDivision}
                    multiSelect={false}
                    placeholder="Select Division"
                  />
                </div>

                {/* Program */}
                <div className="flex-1">
                  <MultiSelect
                    options={formatOptions(programOptions)}
                    value={selectedProgram}
                    onValueChange={setSelectedProgram}
                    multiSelect={false}
                    placeholder="Select Program"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-6xl mx-auto px-4 py-12">
            {/* Error State */}
            {error && (
              <div className="text-center py-12">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                  <p className="text-red-600 font-medium">⚠️ {error}</p>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="text-center py-16">
                <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20">
                  <Loader2 className="animate-spin text-[#9e6237]" size={24} />
                  <span className="text-[#3f2720] font-medium">
                    Loading results...
                  </span>
                </div>
              </div>
            )}

            {/* Empty State - No Selection */}
            {!loading && !error && !selectedProgram && !results && (
              <div className="text-center py-16">
                <div className="max-w-md mx-auto">
                  <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-[#9e623720] to-[#f0c76e20] rounded-full flex items-center justify-center">
                    <Trophy size={48} className="text-[#9e6237]" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#3f2720] mb-4">
                    Ready to Reveal Champions
                  </h3>
                  <p className="text-[#4b4f57] leading-relaxed">
                    Select a division and program above to see the podium winners.
                  </p>
                </div>
              </div>
            )}

            {/* Empty State - No Results */}
            {!loading &&
              !error &&
              selectedProgram &&
              results &&
              results.length === 0 && (
                <div className="text-center py-16">
                  <div className="max-w-md mx-auto">
                    <h3 className="text-2xl font-bold text-[#3f2720] mb-4">
                      Results Coming Soon
                    </h3>
                    <p className="text-[#4b4f57] leading-relaxed">
                      The competition results haven&apos;t been declared yet. Check back
                      soon!
                    </p>
                  </div>
                </div>
              )}

            {/* Winners Display */}
            {!loading && !error && results && results.length > 0 && (
              <div className="space-y-12">
                {/* Header */}
                <div className="text-center">
                  <h2 className="text-4xl font-black text-[#3f2720] mb-4">
                    🏆 Champions Podium
                  </h2>
                  <p className="text-[#4b4f57] text-lg">
                    Congratulations to our winners!
                  </p>
                </div>

                {/* Winner Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {results.map((participant) => renderWinnerCard(participant))}
                </div>
              </div>
            )}

            {/* Result Posters */}
            {resultData && settings && (
              <ResultPostersSection resultData={resultData} settings={settings} />
            )}
          </div>
        </>
      )}

          {/* ── FOOTER ── */}
          <PublicFooter settings={settings} institutionName={festivalVenue} />
        </main>
      </div>

      {/* Login Modal */}
      <ParticipantLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        festivalNameImage={festivalNameImage}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>);
}

export default function PublicResultsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PublicResultsContent />
    </Suspense>
  );
}
