"use client";

import { useEffect, useState, useMemo } from "react";
import { MultiSelect } from "@/components/ui/multi-select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy } from "lucide-react";
import { formatOptions } from "@/lib/utils";
import ResultPostersSection from "@/components/ResultPostersSection";
import { Input } from "@/components/ui/input";

/* ---------------------- helper utils ---------------------- */
async function fetchJSON(url) {
  const res = await fetch(url, { next: { revalidate: 30 } });
  if (!res.ok) throw new Error(`Fetch failed: ${url}`);
  return res.json();
}

/* -------------------- main component ---------------------- */
export default function PublicResultsPage() {
  /* --------------- state --------------- */
  const [divisions, setDivisions] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [settings, setSettings] = useState({});
  const [resultData, setResultData] = useState([]);
  const [resultNo, setResultNo] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showResults, setShowResults] = useState(false);

  /* --------------- fetch divisions on mount --------------- */
  useEffect(() => {
    fetchJSON("/api/divisions?projection=_id,name")
      .then((d) => setDivisions(d.divisions ?? []))
      .catch(() => setError("Unable to load divisions"));
  }, []);

  /* --------------- fetch settings on mount --------------- */
  useEffect(() => {
    fetchJSON("/api/settings?projection=_id,name")
      .then((data) => setSettings(data.settings ?? {}))
      .catch(() => setError("Unable to load settings"));
  }, []);

  /* --------------- fetch programs when division changes --------------- */
  useEffect(() => {
    if (!selectedDivision) {
      setPrograms([]);
      setSelectedProgram("");
      return;
    }
    fetchJSON(
      `/api/programs?divisionId=${selectedDivision}&projection=_id,name`
    )
      .then((p) => setPrograms(p.programs ?? []))
      .catch(() => setError("Unable to load programs"));
  }, [selectedDivision]);

  /* --------------- fetch results when program picked --------------- */
  useEffect(() => {
    if (!selectedProgram && !resultNo) {
      setResults(null);
      setShowResults(false);
      return;
    }

    setLoading(true);
    setError("");
    setShowResults(false);

    fetchJSON(
      `/api/results?programId=${selectedProgram}&isResultDeclared=true&resultNumber=${resultNo}`
    )
      .then((r) => {
        setResultData(r.results?.[0] || []);
        const top = (r.results?.[0]?.participants ?? [])
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

  /* --------------- simplified render helper --------------- */
  const renderWinnerCard = (participant) => {
    const rank = participant.rank;
    const name = participant.participantDetails?.name || "Unknown";
    const team = participant.participantDetails?.teamId?.name || "Unknown";
    const chest = participant.participantDetails?.chestNumber;
    const grade = participant.participantDetails?.grade;
    const points = participant.points;

    // Medal and color based on rank
    const getMedal = () => {
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
    };

    const medal = getMedal();

    return (
      <div
        key={participant._id}
        className={`transition-all duration-500 ${
          showResults ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <Card
          className={`${medal.bg} border-2 ${medal.border} hover:shadow-lg transition-shadow`}
        >
          <CardContent className="p-4 sm:p-6">
            {/* Rank and Medal */}
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="text-4xl sm:text-5xl">{medal.emoji}</div>
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full ${medal.border} border-2 flex items-center justify-center font-bold text-base sm:text-lg ${medal.text}`}
              >
                {rank}
              </div>
            </div>

            {/* Participant Name */}
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 leading-tight">
              {name}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 font-medium mb-3 sm:mb-4">
              {team}
            </p>

            {/* Details */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
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
                <Badge className="bg-green-600 text-white text-xs">
                  {points} pts
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header Section - Mobile Optimized */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto py-4 sm:py-6 md:py-8 px-3 sm:px-4 text-center">
          <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2 font-medium tracking-wide">
            Recall the legacy, Reignite the light
          </p>
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-black mb-2 sm:mb-4">
            <span className="text-gray-900">esperanza</span>
            <sup className="text-lg sm:text-2xl md:text-3xl text-gray-600 ml-1 sm:ml-2">
              '25
            </sup>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-700 mb-2 sm:mb-4 font-medium">
            Sa-adiya Da-awa Fiesta
          </p>
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <div className="bg-gray-800 px-3 py-1.5 sm:px-4 sm:py-2 rounded font-bold text-white text-sm sm:text-base">
              31
            </div>
            <div className="bg-gray-700 px-3 py-1.5 sm:px-4 sm:py-2 rounded font-bold text-white text-sm sm:text-base">
              01
            </div>
            <div className="bg-gray-700 px-3 py-1.5 sm:px-4 sm:py-2 rounded font-bold text-white text-sm sm:text-base">
              02
            </div>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mt-1.5 sm:mt-2">
            Sa-adiya Da-awa College
          </p>
        </div>
      </div>

      {/* Filter Bar - Mobile Optimized */}
      <div className="bg-white/90 backdrop-blur-sm sticky top-0 z-10 border-b shadow-sm">
        <div className="max-w-6xl mx-auto p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:gap-4 max-w-3xl mx-auto">
            {/* Result No. - Full width on mobile */}
            <div className="w-full sm:hidden">
              <Input
                type="number"
                placeholder="Result No."
                value={resultNo}
                onChange={(e) => setResultNo(e.target.value)}
                className="w-full h-11"
              />
            </div>

            {/* Division and Program - Stack on mobile, side by side on tablet+ */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1">
                <MultiSelect
                  options={formatOptions(divisionOptions)}
                  value={selectedDivision}
                  onValueChange={setSelectedDivision}
                  multiSelect={false}
                  placeholder="Select Division"
                />
              </div>

              <div className="flex-1">
                <MultiSelect
                  options={formatOptions(programOptions)}
                  value={selectedProgram}
                  onValueChange={setSelectedProgram}
                  multiSelect={false}
                  placeholder="Select Program"
                />
              </div>

              {/* Result No. - Show on tablet+ */}
              <div className="flex-1 hidden sm:block">
                <Input
                  type="number"
                  placeholder="Result No."
                  value={resultNo}
                  onChange={(e) => setResultNo(e.target.value)}
                  className="w-full h-11"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Mobile Optimized */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8 md:py-12">
        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 max-w-md mx-auto">
            <p className="text-red-600 text-center text-sm sm:text-base">
              ⚠️ {error}
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12 sm:py-16">
            <div className="inline-flex items-center gap-2 sm:gap-3 bg-white rounded-full px-4 py-2 sm:px-6 sm:py-3 shadow-lg">
              <Loader2 className="animate-spin text-gray-700" size={20} />
              <span className="text-gray-700 font-medium text-sm sm:text-base">
                Loading...
              </span>
            </div>
          </div>
        )}

        {/* Empty State - No Program Selected */}
        {!loading && !error && !selectedProgram && !results && (
          <div className="text-center py-12 sm:py-16 px-4">
            <Trophy
              size={48}
              className="text-gray-400 mx-auto mb-3 sm:mb-4 sm:w-16 sm:h-16"
            />
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-4">
              Ready to Reveal Champions
            </h3>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-md mx-auto">
              Select a division and program above to see the podium winners.
            </p>
          </div>
        )}

        {/* Empty State - No Results */}
        {!loading &&
          !error &&
          selectedProgram &&
          results &&
          results.length === 0 && (
            <div className="text-center py-12 sm:py-16 px-4">
              <Trophy
                size={48}
                className="text-amber-500 mx-auto mb-3 sm:mb-4 sm:w-16 sm:h-16"
              />
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-4">
                Results Coming Soon
              </h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-md mx-auto">
                The competition results haven't been declared yet. Check back
                soon!
              </p>
            </div>
          )}

        {/* Winners Section */}
        {!loading && !error && results && results.length > 0 && (
          <div className="space-y-8 sm:space-y-12">
            {/* Section Header */}
            <div className="text-center px-4">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 mb-1 sm:mb-2">
                🏆 Champions Podium
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                Congratulations to our winners!
              </p>
            </div>

            {/* Winners Grid - Responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {results.map((participant) => renderWinnerCard(participant))}
            </div>

            {/* Result Posters Section */}
            {resultData && settings && (
              <div className="mt-8 sm:mt-12">
                <ResultPostersSection
                  resultData={resultData}
                  settings={settings}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
