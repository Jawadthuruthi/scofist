"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Trophy,
  Printer,
  X,
  Loader,
  FileText,
  Eye,
  EyeOff,
  Users,
  TrendingUp,
  ArrowUpDown,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import useCrud from "@/hooks/use-crud";
import PrintHeader from "./PrintHeader";
import { MultiSelect } from "./ui/multi-select";
import { formatOptions, cn } from "@/lib/utils";
import { useDownloadPopup } from "@/hooks/useDownloadPopup";

const ResultComponent = ({
  programs = [],
  divisions = [],
  apiKey,
  additionalProps = {},
}) => {
  const [results, setResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCategory, setSelectedType] = useState("");
  const [sortBy, setSortBy] = useState("team-points");
  const [page, setPage] = useState(0);
  const [declaring, setDeclaring] = useState({});
  const [generating, setGenerating] = useState({});
  const [teams, setTeams] = useState([]);
  const [viewPointsResult, setViewPointsResult] = useState(null);

  const printRef = useRef();
  const downloadCardRef = useRef(null);
  const viewPointsPopupRef = useRef(null);
  const [downloadingResult, setDownloadingResult] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const { handleDownload: handleViewPointsDownload } = useDownloadPopup(
    viewPointsPopupRef,
    `Expected_Team_Points.jpeg`
  );

  // Use CRUD operations
  const { useFetchItems } = useCrud("results", apiKey);
  const { useUpdateItem: useResultUpdate } = useCrud("results", apiKey);
  const { useAddItem: useResultCreate } = useCrud("results", apiKey);
  const { useFetchItems: useFetchTeams } = useCrud("teams", apiKey);

  const updateResult = useResultUpdate();
  const createResult = useResultCreate();

  // Fetch teams data for sorting
  const fetchTeamsQuery = useFetchTeams(0, 1000, { sortByPoints: "true" });

  // Fetch results
  const fetchResultsQuery = useFetchItems(
    page,
    1000,
    {
      ...(selectedDivision && { divisionId: selectedDivision }),
      ...(selectedProgram && { programId: selectedProgram }),
      ...(selectedStatus !== "all" && {
        isResultDeclared: selectedStatus === "declared",
      }),
      ...(selectedCategory && { programCategory: selectedCategory }),
    },
    {
      retry: 2,
      retryDelay: 1000,
    }
  );

  // Handle fetch errors
  useEffect(() => {
    if (fetchResultsQuery.error) {
      toast.error(
        fetchResultsQuery.error.message ||
          "Failed to fetch results. Please try again."
      );
    }
  }, [fetchResultsQuery.error]);

  // Store teams data
  useEffect(() => {
    if (fetchTeamsQuery.data) {
      setTeams(fetchTeamsQuery.data.teams || []);
    }
  }, [fetchTeamsQuery.data]);

  // Build global team totals and ranks (memoized for performance)
  const teamTotalsAndRanks = useMemo(() => {
    if (!teams.length) return { teamTotals: new Map(), teamRanks: new Map() };

    // Build team totals: teamId -> (stagePoints + offStagePoints)
    const teamTotals = new Map();
    teams.forEach((team) => {
      const total = (team.stagePoints || 0) + (team.offStagePoints || 0);
      teamTotals.set(team._id, total);
    });

    // Sort teams by total points ascending and create rank map
    const sortedTeams = [...teams].sort((a, b) => {
      const totalA = teamTotals.get(a._id);
      const totalB = teamTotals.get(b._id);
      return totalA - totalB;
    });

    // Build rank map: teamId -> rankIndex (0-based, ties get same rank)
    const teamRanks = new Map();
    let currentRank = 0;
    let lastTotal = null;

    sortedTeams.forEach((team, index) => {
      const total = teamTotals.get(team._id);
      if (lastTotal !== null && total !== lastTotal) {
        currentRank = index;
      }
      teamRanks.set(team._id, currentRank);
      lastTotal = total;
    });

    return { teamTotals, teamRanks };
  }, [teams]);

  const { teamTotals, teamRanks } = teamTotalsAndRanks;

  // Helper: Extract team IDs from result participants
  const extractTeamIds = useCallback((result) => {
    if (!result.participants || !result.participants.length) return [];

    return [
      ...new Set(
        result.participants
          .map(
            (p) =>
              p.participantDetails?.teamId?._id || p.participantDetails?.teamId
          )
          .filter(Boolean)
      ),
    ];
  }, []);

  // Helper: Build team presence map for a result (teamId -> sum of points or count)
  const buildResultTeamSums = useCallback((result) => {
    const teamSums = new Map();

    if (!result.participants || !result.participants.length) return teamSums;

    result.participants.forEach((participant) => {
      const teamId =
        participant.participantDetails?.teamId?._id ||
        participant.participantDetails?.teamId;

      if (!teamId) return;

      const currentSum = teamSums.get(teamId) || 0;
      // Use participant points if available, otherwise count as 1
      const pointsToAdd =
        typeof participant.points === "number" ? participant.points : 1;
      teamSums.set(teamId, currentSum + pointsToAdd);
    });

    return teamSums;
  }, []);

  // Helper: Get weakest team ID and its presence for a result
  const getWeakestTeamAndPresence = useCallback(
    (result) => {
      const teamIds = extractTeamIds(result);
      if (!teamIds.length) return { weakestTeamId: null, weakestPresence: 0 };

      // Find globally weakest team among participants (lowest rank = weakest)
      let weakestTeamId = null;
      let weakestRank = Number.MAX_SAFE_INTEGER;

      teamIds.forEach((teamId) => {
        const rank = teamRanks.get(teamId);
        if (rank !== undefined && rank < weakestRank) {
          weakestRank = rank;
          weakestTeamId = teamId;
        }
      });

      // Get presence (sum of points or count) for the weakest team
      const teamSums = buildResultTeamSums(result);
      const weakestPresence = teamSums.get(weakestTeamId) || 0;

      return { weakestTeamId, weakestPresence };
    },
    [teamRanks, extractTeamIds, buildResultTeamSums]
  );

  // Fixed helper: Get team total points
  const getTeamTotalPoints = useCallback(
    (teamId) => {
      return teamTotals.get(teamId) || 0;
    },
    [teamTotals]
  );

  // Helper: Compute expected team points if a result is declared
  const computeExpectedTeamPoints = useCallback(
    (result) => {
      // Accumulate points-per-team from this result's participants
      const additions = new Map(); // teamId -> { name, pointsGained }

      (result.participants || []).forEach((participant) => {
        if (!participant.points || participant.points <= 0) return;

        const teamId =
          participant.participantDetails?.teamId?._id ||
          participant.participantDetails?.teamId;
        const teamName =
          participant.participantDetails?.teamId?.name || "Unknown Team";

        if (!teamId) return;

        const teamIdStr = teamId?.toString();
        if (!additions.has(teamIdStr)) {
          additions.set(teamIdStr, { name: teamName, pointsGained: 0 });
        }
        additions.get(teamIdStr).pointsGained += participant.points;
      });

      // Build rows for ALL teams
      const gaining = [];
      const unchanged = [];

      teams.forEach((team) => {
        const teamIdStr = team._id?.toString();
        const currentTotal = (team.stagePoints || 0) + (team.offStagePoints || 0);
        const addition = additions.get(teamIdStr);

        if (addition) {
          gaining.push({
            teamId: teamIdStr,
            name: team.name || addition.name,
            currentTotal,
            pointsGained: addition.pointsGained,
            newTotal: currentTotal + addition.pointsGained,
          });
        } else {
          unchanged.push({
            teamId: teamIdStr,
            name: team.name,
            currentTotal,
            pointsGained: 0,
            newTotal: currentTotal,
          });
        }
      });

      // Sort gaining: by points gained desc, then new total desc
      gaining.sort((a, b) => b.pointsGained - a.pointsGained || b.newTotal - a.newTotal);
      // Sort unchanged: by current total desc
      unchanged.sort((a, b) => b.currentTotal - a.currentTotal);

      return { gaining, unchanged };
    },
    [teams]
  );

  // Fixed helper: Get average team points for a result
  const getResultAverageTeamPoints = useCallback(
    (result) => {
      if (!result.participants || result.participants.length === 0) return 0;

      const teamIds = extractTeamIds(result);
      if (teamIds.length === 0) return 0;

      // Calculate average team points
      const totalTeamPoints = teamIds.reduce(
        (sum, teamId) => sum + getTeamTotalPoints(teamId),
        0
      );

      return totalTeamPoints / teamIds.length;
    },
    [extractTeamIds, getTeamTotalPoints]
  );

  // Fixed helper: Get minimum team points for a result
  const getResultMinTeamPoints = useCallback(
    (result) => {
      if (!result?.participants?.length) return Number.POSITIVE_INFINITY;

      const teamIds = extractTeamIds(result);
      if (teamIds.length === 0) return Number.POSITIVE_INFINITY;

      let min = Number.POSITIVE_INFINITY;
      teamIds.forEach((teamId) => {
        const total = getTeamTotalPoints(teamId);
        if (total < min) min = total;
      });
      return min;
    },
    [extractTeamIds, getTeamTotalPoints]
  );

  // Process fetched data
  useEffect(() => {
    if (fetchResultsQuery.data) {
      const fetchedResults = fetchResultsQuery.data.results || [];
      setResults(fetchedResults);
    }
  }, [fetchResultsQuery.data]);

  // Filter and sort results
  useEffect(() => {
    let filtered = results;

    // Apply filters
    if (selectedDivision) {
      filtered = filtered.filter(
        (result) => result.divisionId === selectedDivision
      );
    }

    if (selectedProgram) {
      filtered = filtered.filter(
        (result) => result.programId === selectedProgram
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(
        (result) => result.programCategory === selectedCategory
      );
    }

    if (selectedStatus !== "all") {
      const isDeclared = selectedStatus === "declared";
      filtered = filtered.filter(
        (result) => result.isResultDeclared === isDeclared
      );
    }

    // Apply sorting
    if (selectedStatus === "declared") {
      filtered = filtered.sort((a, b) => (b.resultNumber || 0) - (a.resultNumber || 0));
    } else {
      switch (sortBy) {
        case "team-points":
          // New global pointsbased sorting logic
          filtered = filtered.sort((a, b) => {
            const aDecl = a.isResultDeclared ? 1 : 0;
            const bDecl = b.isResultDeclared ? 1 : 0;
  
            // Group by declaration status: pending (false) first, then declared (true)
            if (aDecl !== bDecl) {
              return aDecl - bDecl; // pending (0) comes before declared (1)
            }
  
            if (!aDecl) {
              // Both pending - sort by how well the globally weakest team performs compared to other teams
              const { weakestTeamId: aWeakest, weakestPresence: aPresence } =
                getWeakestTeamAndPresence(a);
              const { weakestTeamId: bWeakest, weakestPresence: bPresence } =
                getWeakestTeamAndPresence(b);
  
              // Get global ranks for comparison
              const aRank = aWeakest
                ? (teamRanks.get(aWeakest) ?? Number.MAX_SAFE_INTEGER)
                : Number.MAX_SAFE_INTEGER;
              const bRank = bWeakest
                ? (teamRanks.get(bWeakest) ?? Number.MAX_SAFE_INTEGER)
                : Number.MAX_SAFE_INTEGER;
  
              // Primary: Compare by weakest team's global rank (ascending - lower rank first)
              if (aRank !== bRank) {
                return aRank - bRank;
              }
  
              // Secondary: Calculate performance score (weakest vs other teams within each result)
              const aTeamSums = buildResultTeamSums(a);
              const bTeamSums = buildResultTeamSums(b);
  
              // Get max presence of other teams in result A
              let aMaxOtherPresence = 0;
              for (const [teamId, presence] of aTeamSums) {
                if (teamId !== aWeakest && presence > aMaxOtherPresence) {
                  aMaxOtherPresence = presence;
                }
              }
  
              // Get max presence of other teams in result B
              let bMaxOtherPresence = 0;
              for (const [teamId, presence] of bTeamSums) {
                if (teamId !== bWeakest && presence > bMaxOtherPresence) {
                  bMaxOtherPresence = presence;
                }
              }
  
              // Calculate performance scores
              const aScore = aMaxOtherPresence
                ? aPresence / aMaxOtherPresence
                : aPresence;
              const bScore = bMaxOtherPresence
                ? bPresence / bMaxOtherPresence
                : bPresence;
  
              // Compare by score (higher first - better performance)
              if (aScore !== bScore) {
                return bScore - aScore;
              }
  
              // Tertiary: Compare by weakest team presence (higher first)
              if (aPresence !== bPresence) {
                return bPresence - aPresence;
              }
  
              // Final: Deterministic tie-breaker
              return a.programName.localeCompare(b.programName);
            } else {
              // Both declared - sort by result number descending
              return (b.resultNumber || 0) - (a.resultNumber || 0);
            }
          });
          break;
  
        case "status":
          // Sort by declaration status, then by program name
          filtered = filtered.sort((a, b) => {
            if (a.isResultDeclared !== b.isResultDeclared) {
              return b.isResultDeclared - a.isResultDeclared;
            }
            return a.programName.localeCompare(b.programName);
          });
          break;
  
        case "program":
        default:
          // Sort alphabetically by program name
          filtered = filtered.sort((a, b) =>
            a.programName.localeCompare(b.programName)
          );
          break;
      }
    }

    setFilteredResults(filtered);
  }, [
    selectedDivision,
    selectedProgram,
    selectedCategory,
    selectedStatus,
    sortBy,
    results,
    getWeakestTeamAndPresence,
    teamRanks,
    getResultAverageTeamPoints,
    getResultMinTeamPoints,
  ]);

  // Get available programs for selected division
  const availablePrograms = programs.filter(
    (p) => p.divisionId === selectedDivision
  );
  // Generate results for a program
  const handleGenerateResult = async (programId) => {
    try {
      setGenerating((prev) => ({ ...prev, [programId]: true }));

      await createResult.mutateAsync({
        data: {
          programId,
          ...additionalProps,
        },
      });

      await fetchResultsQuery.refetch();
      toast.success("Results generated successfully!");
    } catch (error) {
      console.error("Error generating results:", error);
      toast.error(error.message || "Failed to generate results");
    } finally {
      setGenerating((prev) => ({ ...prev, [programId]: false }));
    }
  };

  // Declare/Undeclare result
  const handleDeclareResult = async (resultId, currentStatus) => {
    try {
      setDeclaring((prev) => ({ ...prev, [resultId]: true }));

      const newStatus = !currentStatus;

      await updateResult.mutateAsync({
        data: {
          resultId,
          isResultDeclared: newStatus,
          ...additionalProps,
        },
      });

      await fetchResultsQuery.refetch();
      toast.success(
        `Result ${newStatus ? "declared" : "undeclared"} successfully!`
      );
    } catch (error) {
      console.error("Error updating result declaration:", error);
      toast.error(error.message || "Failed to update result declaration");
    } finally {
      setDeclaring((prev) => ({ ...prev, [resultId]: false }));
    }
  };

  // Get declared results for printing
  const declaredResults = filteredResults.filter(
    (result) => result.isResultDeclared
  );

  // Handle print
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Results - ${
      selectedProgram
        ? programs.find((p) => p._id === selectedProgram)?.name
        : selectedDivision
          ? divisions.find((d) => d._id === selectedDivision)?.name
          : "All Programs"
    }`,
    pageStyle: `
      @page {
        size: A4 portrait;
        margin: 0.5in;
      }
      @media print {
        body { 
          -webkit-print-color-adjust: exact; 
          font-size: 12px;
          line-height: 1.2;
        }
        .no-print { display: none !important; }
        
        .print-container {
          width: 100%;
          height: 100vh;
        }
        
        /* Result section - exactly half page height */
        .result-section {
          height: 50vh !important;
          max-height: 50vh !important;
          overflow: hidden;
          page-break-inside: avoid;
          margin-bottom: 0 !important;
          display: flex;
          flex-direction: column;
        }
        
        /* Every two result sections should be on a new page */
        .result-section:nth-child(odd) {
          page-break-before: avoid;
        }
        
        .result-section:nth-child(2n+1):not(:first-child) {
          page-break-before: always;
        }
        
        /* Result info header */
        .result-info {
          height: auto !important;
          flex-shrink: 0;
          overflow: hidden;
          font-size: 12px !important;
          border: 1px solid #000 !important;
        }
        
        /* Table container - flexible height */
        .table-container {
          flex: 1;
          overflow: visible !important;
          display: flex;
          flex-direction: column;
          min-height: 0;
          border: none !important;
        }
        
        table {
          border-collapse: collapse !important;
          border: 1px solid #000 !important;
          width: 100% !important;
        }

        thead, thead tr, thead th {
          position: static !important;
        }
        
        table th, table td {
          border: 1px solid #000 !important;
          padding: 6px 8px !important;
          vertical-align: middle;
          line-height: 1.2 !important;
          font-size: 12px !important;
        }
        
        table th {
          background-color: #f5f5f5 !important;
          border: 1px solid #000 !important;
          height: auto !important;
          font-weight: bold !important;
          color: #000 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        table td {
          font-weight: 500 !important;
        }
        
        .trophy-icon {
          display: inline-block !important;
          width: 8px !important;
          height: 8px !important;
        }
      }
    `,
  });

  // Handle download full result as image
  const handleDownloadFullResult = useCallback(
    async (result) => {
      if (!result || downloadingId) return;
      setDownloadingId(result._id);
      setDownloadingResult(result);

      const toastId = toast.loading(`Preparing full result download for ${result.programName}...`);

      try {
        // Wait for offscreen DOM to mount and render
        await new Promise((resolve) => setTimeout(resolve, 200));

        const el = downloadCardRef.current;
        if (!el) {
          throw new Error("Download element not available");
        }

        // Wait for fonts
        if (typeof document !== "undefined" && document.fonts && document.fonts.ready) {
          try {
            await document.fonts.ready;
          } catch (_) {}
        }

        // Wait for images inside el
        const images = Array.from(el.querySelectorAll("img"));
        if (images.length > 0) {
          await Promise.all(
            images.map(async (img) => {
              if (!img.crossOrigin && img.src && !img.src.startsWith("data:")) {
                img.crossOrigin = "anonymous";
              }
              if (!img.complete) {
                await new Promise((res) => {
                  img.onload = res;
                  img.onerror = res;
                });
              }
              if (img.decode) {
                try {
                  await img.decode();
                } catch (_) {}
              }
            })
          );
        }

        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

        const html2canvas = (await import("html2canvas")).default;
        const canvas = await html2canvas(el, {
          scale: 3,
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#ffffff",
          logging: false,
        });

        const cleanProgramName = (result.programName || "Result").replace(/[^a-zA-Z0-9_-]/g, "_");
        const filename = `Result_${result.resultNumber || "Full"}_${cleanProgramName}.jpeg`;

        const link = document.createElement("a");
        link.download = filename;
        link.href = canvas.toDataURL("image/jpeg", 0.95);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success(`Result #${result.resultNumber || ""} downloaded successfully!`, { id: toastId });
      } catch (error) {
        console.error("Failed to download full result:", error);
        toast.error("Failed to download result image", { id: toastId });
      } finally {
        setDownloadingId(null);
        setDownloadingResult(null);
      }
    },
    [downloadingId]
  );

  const clearFilters = () => {
    setSelectedDivision("");
    setSelectedProgram("");
    setSelectedType("");
    setSelectedStatus("all");
    setSortBy("team-points");
  };

  const hasActiveFilters = Boolean(
    selectedDivision ||
    selectedProgram ||
    selectedCategory ||
    selectedStatus !== "all" ||
    sortBy !== "team-points"
  );

  const isLoading = fetchResultsQuery.isLoading || fetchTeamsQuery.isLoading;
  const totalResults = filteredResults.length;
  const declaredResultsCount = filteredResults.filter(
    (r) => r.isResultDeclared
  ).length;
  const pendingResults = totalResults - declaredResultsCount;
  const totalParticipants = filteredResults.reduce(
    (sum, result) => sum + result.participants.length,
    0
  );

  // Get position medal/badge variant
  const getPositionVariant = (rank) => {
    switch (rank) {
      case 1:
        return "default"; // Gold
      case 2:
        return "secondary"; // Silver
      case 3:
        return "outline"; // Bronze
      default:
        return "destructive";
    }
  };

  const getPositionIcon = (rank) => {
    if (rank <= 3) return <Trophy className="h-3 w-3 trophy-icon" />;
    return null;
  };

  return (
    <div className="space-y-6 ">
      {/* Controls */}
      <div className="no-print">
        <div className="flex flex-col gap-3">
          {/* Status Tabs */}
          <div className="flex w-full sm:w-auto bg-muted/50 p-1 rounded-lg self-start">
            {["all", "declared", "pending"].map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={cn(
                  "flex-1 sm:flex-none px-6 py-2 text-sm font-medium rounded-md transition-all capitalize",
                  selectedStatus === status
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {status === "pending" ? "Undeclared" : status}
              </button>
            ))}
          </div>

          {/* Controls Row */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-2 sm:gap-3 w-full">
            {/* Division and Category - side by side on mobile */}
            <div className="grid grid-cols-2 gap-2 lg:flex lg:items-center lg:gap-3 shrink-0 w-full lg:w-auto">
              {/* Division */}
              <div className="w-full lg:w-36 xl:w-40">
                <Select
                  value={selectedDivision || "all"}
                  onValueChange={(val) => {
                    setSelectedDivision(val === "all" ? "" : val);
                    setSelectedProgram("");
                  }}
                >
                  <SelectTrigger className="h-10 w-full text-sm">
                    <SelectValue placeholder="All Divisions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Divisions</SelectItem>
                    {divisions.map((division) => (
                      <SelectItem key={division._id} value={division._id}>
                        {division.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div className="w-full lg:w-32 xl:w-36">
                <Select
                  value={selectedCategory || "all"}
                  onValueChange={(val) =>
                    setSelectedType(val === "all" ? "" : val)
                  }
                >
                  <SelectTrigger className="h-10 w-full text-sm">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Stage">Stage</SelectItem>
                    <SelectItem value="Off-Stage">Off-Stage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Program — grows to fill remaining space */}
            <div className="w-full lg:flex-1 min-w-0">
              <MultiSelect
                value={selectedProgram}
                onValueChange={setSelectedProgram}
                options={formatOptions(availablePrograms)}
                placeholder="All Programs"
                multiSelect={false}
                noBadge={true}
                className="h-10 min-h-10 w-full text-sm"
              />
            </div>

            {/* Sort + Clear + Print */}
            <div className="flex items-center gap-2 shrink-0 lg:flex-none">
              <div className="flex-1 min-w-0 lg:w-40 xl:w-48 flex items-center gap-1.5">
                <ArrowUpDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-10 w-full text-sm">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team-points">Team Priority</SelectItem>
                    <SelectItem value="program">Name</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={clearFilters}
                  className="h-10 w-9 sm:w-10 shrink-0"
                  title="Clear Filters"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}

              <Button
                variant="default"
                onClick={handlePrint}
                className="h-10 px-2.5 sm:px-3 shrink-0 whitespace-nowrap bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 border-0 btn-print"
              >
                <Printer className="mr-1.5 h-4 w-4" />
                Print
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>{totalResults} results</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{totalParticipants} participants</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4 text-green-500" />
              <span>{declaredResultsCount} declared</span>
            </div>
            <div className="flex items-center gap-1">
              <EyeOff className="h-4 w-4 text-orange-500" />
              <span>{pendingResults} pending</span>
            </div>
            {sortBy === "team-points" && pendingResults > 0 && (
              <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                <TrendingUp className="h-4 w-4" />
                <span>Weakest teams prioritized</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Printable Content */}
      <div ref={printRef} className="print-container">
        <style>{`
          @media print {
            .print-container table {
              border-collapse: collapse !important;
              border: 1px solid #000 !important;
              width: 100% !important;
            }
            .print-container thead,
            .print-container thead tr,
            .print-container thead th {
              position: static !important;
            }
            .print-container table th {
              border: 1px solid #000 !important;
              background-color: #f5f5f5 !important;
              color: #000 !important;
              font-weight: bold !important;
              height: auto !important;
              padding: 6px 8px !important;
              font-size: 12px !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print-container table td {
              border: 1px solid #000 !important;
              padding: 6px 8px !important;
              font-size: 12px !important;
            }
            .print-container .result-info {
              border: 1px solid #000 !important;
            }
          }
        `}</style>
        {/* Results Tables */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2">
              <Loader className="animate-spin h-6 w-6" />
              <span>Loading results...</span>
            </div>
          </div>
        ) : filteredResults.length > 0 ? (
          <div className="space-y-8 print:space-y-0">
            {filteredResults.map((result, resultIndex) => {
              const avgTeamPoints = getResultAverageTeamPoints(result);
              const minTeamPoints = getResultMinTeamPoints(result);
              const { weakestTeamId, weakestPresence } =
                getWeakestTeamAndPresence(result);
              const weakestTeamRank = weakestTeamId
                ? teamRanks.get(weakestTeamId)
                : null;

              return (
                <div key={result._id} className="result-section">
                  {/* Header - only for declared results in print */}
                  {result.isResultDeclared && (
                    <PrintHeader apiKey={apiKey} isFestival={true} />
                  )}

                  {/* Result Header - Attached directly to table below */}
                  <div className="result-info relative flex items-center justify-between gap-1.5 sm:gap-3 bg-muted/60 border border-border rounded-t-lg px-2 sm:px-4 py-2 print:bg-gray-200 print:border print:border-black print:rounded-none">
                    {/* Left: Result Number Badge (declared) or View Points icon (undeclared, mobile only) */}
                    <div className="shrink-0 flex items-center no-print">
                      {result.isResultDeclared && result.resultNumber ? (
                        <Badge
                          variant="outline"
                          onClick={() => handleDownloadFullResult(result)}
                          role="button"
                          title="Download result"
                          className="bg-background text-foreground border-border text-base sm:text-lg font-bold px-2.5 sm:px-3 py-1 sm:py-1 min-w-[2.25rem] sm:min-w-[2.5rem] text-center shadow-xs cursor-pointer hover:bg-muted/80 active:scale-95 transition-all select-none"
                        >
                          {downloadingId === result._id ? (
                            <Loader className="h-4 w-4 animate-spin" />
                          ) : (
                            result.resultNumber
                          )}
                        </Badge>
                      ) : result._id && !result.isResultDeclared ? (
                        /* Mobile: View Points button on left side */
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const maxNum = results.reduce((max, r) => r.resultNumber > max ? r.resultNumber : max, 0);
                            setViewPointsResult({ ...result, _nextResultNumber: maxNum + 1 });
                          }}
                          className="sm:hidden h-7 w-7 p-0 border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950"
                          title="Preview team points if declared"
                        >
                          <BarChart3 className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <div className="w-8 sm:w-0" />
                      )}
                    </div>

                    {/* Centre: Program details (Centered on mobile, left-aligned on desktop) */}
                    <div className="flex-1 min-w-0 flex items-center justify-center sm:justify-start text-center sm:text-left text-xs sm:text-sm font-semibold text-foreground print:text-black print:text-xs">
                      {/* Mobile: 4 lines, centered */}
                      <div className="flex flex-col items-center justify-center sm:hidden print:hidden leading-tight py-0.5 px-0.5">
                        <span className="capitalize">
                          <strong>Program:</strong> {result.programName}
                        </span>
                        <span>
                          <strong>Division:</strong> {result.divisionName}
                        </span>
                        <span className="capitalize">
                          <strong>Type:</strong> {result.programType}
                        </span>
                        <span className="capitalize">
                          <strong>Category:</strong> {result.programCategory}
                        </span>
                      </div>

                      {/* Desktop & Print: Pipe-separated inline */}
                      <div className="hidden sm:flex print:flex items-center flex-wrap print:justify-center print:w-full">
                        {result.isResultDeclared && result.resultNumber && (
                          <>
                            <span className="hidden print:inline whitespace-nowrap pr-2">
                              <strong>Result No.:</strong> {result.resultNumber}
                            </span>
                            <span className="text-muted-foreground select-none hidden print:inline">|</span>
                          </>
                        )}
                        <span className="capitalize whitespace-nowrap pr-2 print:px-2">
                          <strong>Program:</strong> {result.programName}
                        </span>
                        <span className="text-muted-foreground select-none">|</span>
                        <span className="whitespace-nowrap px-2">
                          <strong>Division:</strong> {result.divisionName}
                        </span>
                        <span className="text-muted-foreground select-none">|</span>
                        <span className="capitalize whitespace-nowrap px-2">
                          <strong>Type:</strong> {result.programType}
                        </span>
                        <span className="text-muted-foreground select-none">|</span>
                        <span className="capitalize whitespace-nowrap pl-2">
                          <strong>Category:</strong> {result.programCategory}
                        </span>
                      </div>
                    </div>

                    {/* Right: Action button (Declare / Undeclare / Generate) */}
                    <div className="shrink-0 flex items-center gap-1.5 no-print z-10">
                      {!result._id && (
                        <Button
                          onClick={() =>
                            handleGenerateResult(result.programId)
                          }
                          disabled={generating[result.programId]}
                          size="sm"
                          variant="outline"
                          className="h-7 sm:h-8 px-2 sm:px-2.5 text-xs"
                        >
                          {generating[result.programId] ? (
                            <Loader className="animate-spin h-3 w-3 mr-1" />
                          ) : (
                            <TrendingUp className="h-3 w-3 mr-1" />
                          )}
                          Generate
                        </Button>
                      )}

                      {/* View Points button — desktop only (mobile is on left side) */}
                      {result._id && !result.isResultDeclared && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const maxNum = results.reduce((max, r) => r.resultNumber > max ? r.resultNumber : max, 0);
                            setViewPointsResult({ ...result, _nextResultNumber: maxNum + 1 });
                          }}
                          className="hidden sm:flex h-7 sm:h-8 px-2 sm:px-2.5 text-xs border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950"
                          title="Preview team points if declared"
                        >
                          <BarChart3 className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      )}

                      {result._id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant={
                                result.isResultDeclared
                                  ? "destructive"
                                  : "default"
                              }
                              disabled={declaring[result._id]}
                              className="h-7 sm:h-8 px-2 sm:px-2.5 text-xs"
                            >
                              {declaring[result._id] ? (
                                <Loader className="animate-spin h-3 w-3 mr-1" />
                              ) : result.isResultDeclared ? (
                                <EyeOff className="h-3 w-3 mr-1" />
                              ) : (
                                <Eye className="h-3 w-3 mr-1" />
                              )}
                              <span>
                                {result.isResultDeclared
                                  ? "Undeclare"
                                  : "Declare"}
                              </span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="sm:max-w-lg flex flex-col p-0 gap-0 overflow-hidden rounded-2xl [&>button.absolute]:hidden">
                            <AlertDialogHeader
                              className={cn(
                                "flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 sticky top-0 z-20 backdrop-blur-md shrink-0 text-left",
                                result.isResultDeclared
                                  ? "bg-destructive/5 dark:bg-destructive/10"
                                  : "bg-primary/5 dark:bg-primary/10"
                              )}
                            >
                              <div
                                className={cn(
                                  "p-2 rounded-lg shrink-0",
                                  result.isResultDeclared
                                    ? "bg-destructive/10 text-destructive"
                                    : "bg-primary/10 text-primary"
                                )}
                              >
                                {result.isResultDeclared ? (
                                  <AlertTriangle className="h-5 w-5" />
                                ) : (
                                  <Trophy className="h-5 w-5" />
                                )}
                              </div>
                              <div className="flex-1 text-left space-y-0.5">
                                <AlertDialogTitle
                                  className={cn(
                                    "text-xl font-bold m-0",
                                    result.isResultDeclared
                                      ? "text-destructive"
                                      : "text-foreground"
                                  )}
                                >
                                  {result.isResultDeclared
                                    ? "Undeclare Result?"
                                    : "Declare Result?"}
                                </AlertDialogTitle>
                                <AlertDialogDescription className="m-0 text-sm text-muted-foreground pt-1">
                                  {result.isResultDeclared
                                    ? "Are you sure you want to undeclare this result? This will remove all participant and team points associated with this program."
                                    : "Are you sure you want to declare this result? This will update participant and team records with the final rankings and points."}
                                </AlertDialogDescription>
                              </div>
                              <AlertDialogCancel className="p-1.5 -mr-1.5 ml-1 rounded-lg border-none hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none bg-transparent h-auto mt-0">
                                <X className="h-5 w-5" />
                              </AlertDialogCancel>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="p-5 border-t bg-muted/20 flex justify-between gap-4 sm:space-x-0 w-full">
                              <AlertDialogCancel className="flex-1 mt-0">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleDeclareResult(
                                    result._id,
                                    result.isResultDeclared
                                  )
                                }
                                className={cn(
                                  "flex-1",
                                  result.isResultDeclared
                                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                                )}
                              >
                                {result.isResultDeclared
                                  ? "Undeclare"
                                  : "Declare"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>

                  {/* Results Table - Attached directly to header above */}
                  <div className="table-container border border-t-0 border-border rounded-b-lg overflow-hidden print:rounded-none print:border-none">
                    <div className="overflow-x-auto print:overflow-visible h-full">
                      <Table className="min-w-full">
                        <TableHeader className="print:static">
                          <TableRow className="print:border-b-black">
                            <TableHead className="w-16 text-center whitespace-nowrap border border-border print:!border print:!border-black">
                              Rank
                            </TableHead>
                            <TableHead className="w-20 text-center whitespace-nowrap border border-border print:!border print:!border-black">
                              Chest Number
                            </TableHead>
                            <TableHead className="w-20 text-center whitespace-nowrap border border-border print:!border print:!border-black">
                              Code Letter
                            </TableHead>
                            <TableHead className="min-w-[150px] whitespace-nowrap border border-border print:!border print:!border-black">
                              Name
                            </TableHead>
                            <TableHead className="whitespace-nowrap border border-border print:!border print:!border-black">
                              Team
                            </TableHead>
                            <TableHead className="w-16 text-center whitespace-nowrap border border-border print:!border print:!border-black">
                              Grade
                            </TableHead>
                            <TableHead className="w-20 text-center whitespace-nowrap border border-border print:!border print:!border-black">
                              Points
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.participants.length > 0 ? (
                            result.participants
                              .sort((a, b) => a.rank - b.rank)
                              .filter((participant) => participant.points > 0)
                              .map((participant, index) => (
                                <TableRow key={participant._id || participant.participantDetails?._id || index}>
                                  <TableCell className="text-center font-medium whitespace-nowrap border-t border-r border-border print:border-black">
                                    <div className="flex items-center justify-center gap-1">
                                      {getPositionIcon(participant.rank)}
                                      <Badge
                                        variant={getPositionVariant(
                                          participant.rank
                                        )}
                                        className="print:hidden"
                                      >
                                        {participant.rank}
                                      </Badge>
                                      <span className="hidden print:inline">
                                        {participant.rank}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center font-medium whitespace-nowrap border-t border-r border-border print:border-black">
                                    {participant.participantDetails
                                      ?.chestNumber || "N/A"}
                                  </TableCell>
                                  <TableCell className="text-center whitespace-nowrap border-t border-r border-border print:border-black">
                                    {participant.codeLetter || "-"}
                                  </TableCell>
                                  <TableCell className="font-medium whitespace-nowrap border-t border-r border-border print:border-black">
                                    {participant.participantDetails?.name ||
                                      "N/A"}
                                  </TableCell>
                                  <TableCell className="font-medium whitespace-nowrap border-t border-r border-border print:border-black">
                                    {participant.participantDetails?.teamId?.name || "N/A"}
                                  </TableCell>
                                  <TableCell className="text-center whitespace-nowrap border-t border-r border-border print:border-black">
                                    <Badge
                                      variant="outline"
                                      className="print:hidden"
                                    >
                                      {!participant.grade || participant.grade.toLowerCase() === 'f' ? "-" : participant.grade}
                                    </Badge>
                                    <span className="hidden print:inline">
                                      {!participant.grade || participant.grade.toLowerCase() === 'f' ? "-" : participant.grade}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center font-medium whitespace-nowrap border-t border-r border-border print:border-black">
                                    <Badge
                                      variant="secondary"
                                      className="print:hidden"
                                    >
                                      {participant.points}
                                    </Badge>
                                    <span className="hidden print:inline">
                                      {participant.points}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))
                          ) : (
                            <TableRow>
                              <TableCell
                                colSpan={7}
                                className="text-center py-6 text-muted-foreground print:border-black"
                              >
                                No participants found for this result
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold">No Results Found</h3>
            <p className="text-muted-foreground">
              {selectedDivision || selectedProgram || selectedStatus !== "all"
                ? "No results found for the selected filters."
                : "No results available. Generate results from the evaluation page first."}
            </p>
            <div className="mt-4">
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* View Points Preview Dialog */}
      <Dialog open={!!viewPointsResult} onOpenChange={(open) => !open && setViewPointsResult(null)}>
        <DialogContent
          ref={viewPointsPopupRef}
          data-html2canvas-popup="true"
          className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl [&>button.absolute]:hidden"
        >
          <DialogHeader className="flex flex-row items-center gap-3 px-5 py-4 border-b space-y-0 sticky top-0 z-20 bg-blue-50/80 dark:bg-blue-950/40 backdrop-blur-md shrink-0">
            <button
              type="button"
              className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 dark:bg-blue-900 dark:hover:bg-blue-800 dark:text-blue-400 transition-colors focus:outline-none cursor-pointer shrink-0"
              onClick={handleViewPointsDownload}
              title="Download Image"
              data-html2canvas-ignore="true"
            >
              <BarChart3 className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0 text-left">
              <DialogTitle className="text-base font-bold text-foreground truncate text-left">
                Expected Team Points
                {viewPointsResult?._nextResultNumber && (
                  <span className="sm:hidden font-normal text-muted-foreground ml-1">(#{viewPointsResult._nextResultNumber})</span>
                )}
              </DialogTitle>
              {viewPointsResult && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {viewPointsResult.programName} · {viewPointsResult.divisionName} · {viewPointsResult.programCategory}
                </p>
              )}
            </div>
            {viewPointsResult?._nextResultNumber && (
              <div className="hidden sm:flex shrink-0 p-1.5 rounded-lg border border-border bg-background items-center justify-center h-8 w-8 text-sm font-bold text-foreground">
                {viewPointsResult._nextResultNumber}
              </div>
            )}
            <DialogClose
              onClick={() => setViewPointsResult(null)}
              className="p-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none shrink-0"
              data-html2canvas-ignore="true"
            >
              <X className="h-5 w-5" />
            </DialogClose>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">
            {viewPointsResult && (() => {
              const { gaining, unchanged } = computeExpectedTeamPoints(viewPointsResult);
              const allRows = [...gaining, ...unchanged];
              if (!allRows.length) {
                return (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <Users className="mx-auto h-8 w-8 mb-2 opacity-40" />
                    <p>No team data available.</p>
                  </div>
                );
              }

              return (
                <>
                  {/* Column header */}
                  <div className="grid grid-cols-[1fr_3rem_2.5rem_3rem] gap-x-2 items-center px-3 pb-1">
                    <span />
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Current</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-green-600 dark:text-green-400 text-right">+Add</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 text-right">Total</span>
                  </div>

                  {/* All teams — gaining first, then unchanged */}
                  <div className="space-y-1.5">
                    {gaining.map((row) => (
                      <div
                        key={row.teamId}
                        className="grid grid-cols-[1fr_3rem_2.5rem_3rem] gap-x-2 items-center rounded-lg border border-border bg-card px-3 py-2.5"
                      >
                        <span className="font-medium text-sm text-foreground truncate min-w-0">{row.name}</span>
                        <span className="text-xs text-muted-foreground text-right tabular-nums">{row.currentTotal}</span>
                        <span className="text-xs font-semibold text-green-600 dark:text-green-400 text-right tabular-nums">+{row.pointsGained}</span>
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400 text-right tabular-nums">{row.newTotal}</span>
                      </div>
                    ))}
                    {unchanged.map((row) => (
                      <div
                        key={row.teamId}
                        className="grid grid-cols-[1fr_3rem_2.5rem_3rem] gap-x-2 items-center rounded-lg border border-border bg-muted/30 px-3 py-2.5"
                      >
                        <span className="font-medium text-sm text-muted-foreground truncate min-w-0">{row.name}</span>
                        <span className="text-xs text-muted-foreground text-right tabular-nums">{row.currentTotal}</span>
                        <span className="text-xs text-muted-foreground text-right">—</span>
                        <span className="text-sm font-semibold text-foreground text-right tabular-nums">{row.currentTotal}</span>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Offscreen Download Card for downloading full result image */}
      <div
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: "800px",
          backgroundColor: "#ffffff",
          zIndex: -1,
          pointerEvents: "none",
        }}
        aria-hidden="true"
      >
        {downloadingResult && (
          <div
            ref={downloadCardRef}
            className="p-6 bg-white text-black font-sans"
            style={{ width: "800px", backgroundColor: "#ffffff" }}
          >
            {/* Festival Header */}
            <PrintHeader apiKey={apiKey} isFestival={true} displayOnScreen={true} />

            {/* Program Info Header */}
            <div className="bg-gray-100 border border-black px-4 py-2.5 my-3 flex items-center justify-center text-xs font-semibold text-black text-center flex-wrap gap-1">
              {downloadingResult.resultNumber && (
                <>
                  <span className="whitespace-nowrap pr-2">
                    <strong>Result No.:</strong> {downloadingResult.resultNumber}
                  </span>
                  <span className="text-gray-400 select-none">|</span>
                </>
              )}
              <span className="capitalize whitespace-nowrap px-2">
                <strong>Program:</strong> {downloadingResult.programName}
              </span>
              <span className="text-gray-400 select-none">|</span>
              <span className="whitespace-nowrap px-2">
                <strong>Division:</strong> {downloadingResult.divisionName}
              </span>
              <span className="text-gray-400 select-none">|</span>
              <span className="capitalize whitespace-nowrap px-2">
                <strong>Type:</strong> {downloadingResult.programType}
              </span>
              <span className="text-gray-400 select-none">|</span>
              <span className="capitalize whitespace-nowrap pl-2">
                <strong>Category:</strong> {downloadingResult.programCategory}
              </span>
            </div>

            {/* Full Results Table */}
            <div className="border border-black overflow-hidden">
              <table className="w-full text-xs text-black border-collapse" style={{ border: "1px solid #000" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f5f5f5" }}>
                    <th className="border border-black p-2 text-center w-14 font-bold">Rank</th>
                    <th className="border border-black p-2 text-center w-20 font-bold">Chest No.</th>
                    <th className="border border-black p-2 text-center w-20 font-bold">Code Letter</th>
                    <th className="border border-black p-2 text-left font-bold">Name</th>
                    <th className="border border-black p-2 text-left font-bold">Team</th>
                    <th className="border border-black p-2 text-center w-16 font-bold">Grade</th>
                    <th className="border border-black p-2 text-center w-16 font-bold">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {downloadingResult.participants &&
                  downloadingResult.participants.filter((p) => p.points > 0).length > 0 ? (
                    downloadingResult.participants
                      .filter((p) => p.points > 0)
                      .sort((a, b) => (a.rank || 999) - (b.rank || 999))
                      .map((participant, index) => (
                        <tr key={participant._id || index} style={{ borderTop: "1px solid #000" }}>
                          <td className="border border-black p-2 text-center font-bold">
                            {participant.rank || "-"}
                          </td>
                          <td className="border border-black p-2 text-center font-medium">
                            {participant.participantDetails?.chestNumber || "N/A"}
                          </td>
                          <td className="border border-black p-2 text-center">
                            {participant.codeLetter || "-"}
                          </td>
                          <td className="border border-black p-2 font-medium">
                            {participant.participantDetails?.name || "N/A"}
                          </td>
                          <td className="border border-black p-2 font-medium">
                            {participant.participantDetails?.teamId?.name || "N/A"}
                          </td>
                          <td className="border border-black p-2 text-center font-bold">
                            {!participant.grade || participant.grade.toLowerCase() === "f"
                              ? "-"
                              : participant.grade}
                          </td>
                          <td className="border border-black p-2 text-center font-bold">
                            {participant.points ?? 0}
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="border border-black p-4 text-center text-gray-500">
                        No participants found for this result
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Official Footer */}
            <div className="mt-3 pt-2 border-t border-gray-200 flex items-center justify-between text-[10px] text-gray-500">
              <span>Official Competition Result</span>
              <span>Generated on {new Date().toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};



export default ResultComponent;
