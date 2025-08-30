"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Medal, Trophy, X } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";
import { formatOptions } from "@/lib/utils";

/* ---------------------- helper constants ---------------------- */

// Festival color palette
const colors = {
  copper: "#9e6237",
  darkBrown: "#3f2720",
  ivory: "#fbfaf7",
  slate: "#4b4f57",
  accentGold: "#f0c76e",
};

// Metal gradients for podium cards
const metal = {
  gold: "from-[#fbc889] via-[#ffdc9b] to-[#e7b44c]",
  silver: "from-[#dfe5ea] via-[#f4f5f7] to-[#bcc3cd]",
  bronze: "from-[#c78d63] via-[#e2a67a] to-[#9c6644]",
};

// Geometric pattern SVG for overlays
const patternSvg = `data:image/svg+xml,${encodeURIComponent(`
  <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="geom" width="60" height="60" patternUnits="userSpaceOnUse">
        <path d="M30 0L45 15L30 30L15 15Z" fill="none" stroke="rgba(158,98,55,0.1)" stroke-width="1"/>
        <path d="M0 30L15 45L30 30L15 15Z" fill="none" stroke="rgba(158,98,55,0.1)" stroke-width="1"/>
        <path d="M30 30L45 45L60 30L45 15Z" fill="none" stroke="rgba(158,98,55,0.1)" stroke-width="1"/>
        <path d="M30 30L15 45L0 30L15 15Z" fill="none" stroke="rgba(158,98,55,0.1)" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#geom)"/>
  </svg>
`)}`;

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
    if (!selectedProgram) {
      setResults(null);
      setShowResults(false);
      return;
    }

    setLoading(true);
    setError("");
    setShowResults(false);

    fetchJSON(`/api/results?programId=${selectedProgram}&isResultDeclared=true`)
      .then((r) => {
        const top = (r.results?.[0]?.participants ?? [])
          .filter((p) => p.rank <= 3)
          .sort((a, b) => a.rank - b.rank);
        setResults(top);
        setTimeout(() => setShowResults(true), 100);
      })
      .catch(() => setError("Unable to load results"))
      .finally(() => setLoading(false));
  }, [selectedProgram]);

  /* --------------- memoized options --------------- */
  const divisionOptions = useMemo(
    () => divisions.map((d) => ({ value: d._id, label: d.name })),
    [divisions]
  );

  const programOptions = useMemo(
    () => programs.map((p) => ({ value: p._id, label: p.name })),
    [programs]
  );

  /* --------------- render helpers --------------- */
  const renderPodiumCard = (participant, index) => {
    const rank = participant.rank;
    const metalGradient =
      rank === 1 ? metal.gold : rank === 2 ? metal.silver : metal.bronze;
    const isFirst = rank === 1;
    const delay = rank === 2 ? 0 : rank === 1 ? 200 : 400;

    // Better text colors for contrast
    const textColor =
      rank === 1
        ? "text-yellow-900"
        : rank === 2
          ? "text-gray-800"
          : "text-amber-100";
    const badgeColor =
      rank === 1
        ? "bg-yellow-100/90 text-yellow-900"
        : rank === 2
          ? "bg-gray-100/90 text-gray-800"
          : "bg-amber-100/90 text-amber-900";

    return (
      <div
        key={participant._id}
        className={`
          relative transition-all duration-700 ease-out transform
          ${showResults ? "translate-y-0 scale-100 opacity-100" : "translate-y-8 scale-95 opacity-0"}
          ${isFirst ? "md:order-2" : rank === 2 ? "md:order-1" : "md:order-3"}
          hover:scale-105 hover:-translate-y-2 hover:shadow-2xl
        `}
        style={{ transitionDelay: `${delay}ms` }}
      >
        <Card
          className={`
          relative overflow-hidden bg-gradient-to-br ${metalGradient}
          border-2 border-white/20 shadow-xl backdrop-blur-sm
           h-80
          group cursor-pointer
        `}
        >
          {/* Background pattern overlay */}
          <div
            className="absolute inset-0 opacity-20"
            style={{ backgroundImage: `url("${patternSvg}")` }}
          />

          {/* Card content */}
          <div className="relative h-full flex flex-col items-center justify-center p-6 text-center">
            {/* Rank number - large and beveled */}
            <div
              className={`
              absolute -top-4 -right-4 w-16 h-16 rounded-full 
              bg-gradient-to-br ${metalGradient} border-4 border-white/30
              flex items-center justify-center shadow-2xl
              text-2xl font-black ${textColor}
              transform rotate-12 group-hover:rotate-0 transition-transform duration-300
            `}
            >
              #{rank}
            </div>

            {/* Medal icon with emboss effect */}
            <div className="mb-4 relative">
              <Medal
                size={isFirst ? 64 : 48}
                className={`${textColor} drop-shadow-lg filter`}
                style={{
                  filter: "drop-shadow(2px 2px 4px rgba(0,0,0,0.3))",
                }}
              />
              <div className="absolute inset-0 bg-white/20 rounded-full blur-sm -z-10" />
            </div>

            {/* Participant details */}
            <div className="mb-4">
              <h3
                className={`
              font-bold ${textColor} drop-shadow-sm
              ${isFirst ? "text-xl" : "text-lg"}
            `}
              >
                {participant.participantDetails?.name || "Unknown"}
              </h3>
              <h5 className={`text-sm ${textColor} font-semibold`}>
                {participant.participantDetails?.teamId?.name || "Unknown"}
              </h5>
            </div>

            <div className="space-y-2 space-x-2 w-full">
              <Badge
                variant="secondary"
                className={`${badgeColor} border-white/30 text-sm font-medium`}
              >
                Chest No: {participant.participantDetails?.chestNumber ?? "?"}
              </Badge>

              {participant.participantDetails?.grade && (
                <Badge
                  variant="outline"
                  className={`${badgeColor} border-white/30 text-sm`}
                >
                  {participant.participantDetails.grade}
                </Badge>
              )}

              <Badge
                className={`
                bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-900 
                font-semibold border-0 text-sm
              `}
              >
                {participant.points || 0} pts
              </Badge>
            </div>
          </div>

          {/* Subtle confetti effect on hover */}
          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`
                  absolute w-2 h-2 bg-yellow-300 rounded-full
                  animate-ping
                `}
                style={{
                  left: `${20 + i * 12}%`,
                  top: `${10 + (i % 2) * 20}%`,
                  animationDelay: `${i * 100}ms`,
                  animationDuration: "2s",
                }}
              />
            ))}
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fbfaf7] via-[#f5f3f0] to-[#e8e6e3]">
      {/* Print Header Section */}
      <div className="relative overflow-hidden bg-[#fbfaf7] border-b-2 border-[#9e6237]/20">
        {/* Geometric pattern borders */}
        <div className="absolute left-0 top-0 w-48 h-full opacity-20">
          <div
            className="w-full h-full"
            style={{ backgroundImage: `url("${patternSvg}")` }}
          />
        </div>
        <div className="absolute right-0 top-0 w-48 h-full opacity-20">
          <div
            className="w-full h-full"
            style={{ backgroundImage: `url("${patternSvg}")` }}
          />
        </div>

        <div className="relative z-10 py-8 px-4">
          <div className="max-w-6xl mx-auto text-center">
            {/* Tagline */}
            <p className="text-lg text-[#3f2720] mb-2 font-medium tracking-wide">
              "Recall the legacy, Reignite the light"
            </p>

            {/* Main title */}
            <h1 className="text-6xl md:text-8xl font-black mb-4">
              <span className="text-[#3f2720]">esperanza</span>
              <sup className="text-3xl md:text-4xl text-[#9e6237] ml-2">25</sup>
            </h1>

            {/* Subtitle */}
            <p className="text-xl text-[#3f2720] mb-4 font-medium">
              Sa-adiya Da-awa Fiesta
            </p>

            {/* Dates */}
            <div className="flex items-center justify-center gap-4 text-[#fbfaf7]">
              <div className="bg-[#3f2720] px-4 py-2 rounded font-bold text-lg">
                31
              </div>
              <div className="bg-[#9e6237] px-4 py-2 rounded font-bold text-lg">
                01
              </div>
              <div className="bg-[#9e6237] px-4 py-2 rounded font-bold text-lg">
                02
              </div>
            </div>

            <p className="text-sm text-[#4b4f57] mt-2">
              Sa-adiya Da-awa College
            </p>
          </div>
        </div>
      </div>

      {/* Sticky Filter Bar */}
      <div className=" bg-white/60   border-b border-white/20">
        <div className="max-w-6xl mx-auto p-4 h-full flex items-center justify-center">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full max-w-2xl">
            {/* Division Select */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <MultiSelect
                  options={formatOptions(divisionOptions)}
                  value={selectedDivision}
                  onValueChange={setSelectedDivision}
                  multiSelect={false}
                  placeholder="Select Division"
                />
              </div>
            </div>

            {/* Program Select */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
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

        {/* Empty State - No Program Selected */}
        {!loading && !error && !selectedProgram && (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-[#9e6237]/20 to-[#f0c76e]/20 rounded-full flex items-center justify-center">
                <Trophy size={48} className="text-[#9e6237]" />
              </div>
              <h3 className="text-2xl font-bold text-[#3f2720] mb-4">
                Ready to Reveal Champions
              </h3>
              <p className="text-[#4b4f57] leading-relaxed">
                Select a division and program above to see the podium winners.
                Results will be revealed soon for all declared competitions.
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
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full flex items-center justify-center">
                  <Trophy size={48} className="text-amber-600" />
                </div>
                <h3 className="text-2xl font-bold text-[#3f2720] mb-4">
                  Results Coming Soon
                </h3>
                <p className="text-[#4b4f57] leading-relaxed">
                  The competition results for this program haven't been declared
                  yet. Check back soon to see the winners!
                </p>
              </div>
            </div>
          )}

        {/* Podium Section */}
        {!loading && !error && results && results.length > 0 && (
          <div className="space-y-12">
            {/* Section header with geometric border */}
            <div className="text-center relative">
              <div className="h-px bg-gradient-to-r from-transparent via-[#9e6237] to-transparent mb-8"></div>
              <h2 className="text-4xl font-black text-[#3f2720] mb-4">
                🏆 Champions Podium
              </h2>
              <p className="text-[#4b4f57] text-lg">
                Congratulations to our winners!
              </p>
            </div>

            {/* Podium Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
              {results.map((participant, index) =>
                renderPodiumCard(participant, index)
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom spacing */}
      <div className="h-16"></div>
    </div>
  );
}
