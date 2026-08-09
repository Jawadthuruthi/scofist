"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Calendar, Users, BookOpen, CheckCircle2, Trophy,
  LayoutGrid, UserSquare2, X, ChevronRight,
} from "lucide-react";

import useCrud from "@/hooks/use-crud";
import Header from "@/components/Header";
import { formatDateForDisplay } from "@/lib/utils";
import ProgramPostersViewer from "./ProgramPostersViewer";
import WinnerPostersViewer from "./WinnerPostersViewer";
import TeamPointsViewer from "./TeamPointsViewer";
import ChampionsPostersViewer from "./ChampionsPostersViewer";
import IndividualToppersViewer from "./IndividualToppersViewer";
import TeamPointsProgressionViewer from "./TeamPointsProgressionViewer";
import DeclaringResultViewer from "./DeclaringResultViewer";
import CodeLettersViewer from "./CodeLettersViewer";
import GeneralDisplayViewer from "./GeneralDisplayViewer";

// ===== STAT CARD =====
function StatCard({ title, value, icon: Icon, color, isLoading, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border bg-card shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 group ${onClick ? "cursor-pointer" : ""}`}
      style={{ borderColor: `${color}30` }}
    >
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity"
        style={{ background: color }}
      />
      <div className="relative p-7 flex items-center gap-4 min-h-[110px]">
        <div className="flex-shrink-0 p-3 rounded-xl" style={{ background: `${color}18` }}>
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground truncate">
            {title}
          </p>
          {isLoading ? (
            <div className="mt-1 h-8 w-16 rounded-md bg-muted animate-pulse" />
          ) : (
            <p className="text-3xl font-bold tracking-tight mt-0.5" style={{ color }}>
              {value ?? "—"}
            </p>
          )}
        </div>
        {onClick && (
          <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-30 group-hover:opacity-70 transition-opacity" style={{ color }} />
        )}
      </div>
    </div>
  );
}

// ===== LIST DIALOG =====
function ListDialog({ open, onClose, title, icon: Icon, color, isLoading, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-2xl border w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ background: `${color}10` }}>
          <div className="p-2 rounded-lg" style={{ background: `${color}20` }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <h2 className="font-semibold text-lg flex-1">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : children}
        </div>
      </div>
    </div>
  );
}

function ListRow({ index, primary, secondary, badge, badgeColor }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors">
      <span className="text-xs font-bold text-muted-foreground w-6 text-right flex-shrink-0">
        {index}.
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{primary}</p>
        {secondary && <p className="text-xs text-muted-foreground truncate">{secondary}</p>}
      </div>
      {badge !== undefined && (
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: `${badgeColor}18`, color: badgeColor }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

// ===== MAIN DASHBOARD COMPONENT =====
export default function FestDashboard({ apiKey, activeRole }) {
  const currentDate = formatDateForDisplay(new Date());
  const [showPosters, setShowPosters] = useState(false);
  const [showWinners, setShowWinners] = useState(false);
  const [showTeamPoints, setShowTeamPoints] = useState(false);
  const [showChampions, setShowChampions] = useState(false);
  const [showToppers, setShowToppers] = useState(false);
  const [showProgression, setShowProgression] = useState(false);
  const [showDeclaring, setShowDeclaring] = useState(false);
  const [showCodeLetters, setShowCodeLetters] = useState(false);
  const [showDisplay, setShowDisplay] = useState(false);
  const [displayValue, setDisplayValue] = useState("");
  const [isWhiteTheme, setIsWhiteTheme] = useState(false);

  // ===== STATS DATA FETCHING =====
  const isProgramRole = activeRole === "Program Leader" || activeRole === "Program Committee";

  const { useFetchItems: useFetchParticipants } = useCrud("participants", apiKey);
  const { useFetchItems: useFetchPrograms } = useCrud("programs", apiKey);
  const { useFetchItems: useFetchResults } = useCrud("results", apiKey);
  const { useFetchItems: useFetchTeams } = useCrud("teams", apiKey);
  const { useFetchItems: useFetchDivisions } = useCrud("divisions", apiKey);

  // Count-only queries (limit=1)
  const participantsCountQuery = useFetchParticipants(0, 1, {}, { enabled: isProgramRole, staleTime: 30000 });
  const programsCountQuery = useFetchPrograms(0, 1, {}, { enabled: isProgramRole, staleTime: 30000 });
  const declaredResultsCountQuery = useFetchResults(0, 1, { isResultDeclared: "true" }, { enabled: isProgramRole, staleTime: 30000 });

  // Full data (used for teams/divisions stats AND their dialogs)
  const teamsAllQuery = useFetchTeams(0, 0, {}, { enabled: isProgramRole, staleTime: 30000 });
  const divisionsAllQuery = useFetchDivisions(0, 0, {}, { enabled: isProgramRole, staleTime: 30000 });

  // ===== DIALOG STATE =====
  const [openDialog, setOpenDialog] = useState(null);

  // Lazy full-list queries — only triggered when their dialog opens
  const participantsListQuery = useFetchParticipants(0, 0, {}, {
    enabled: isProgramRole && openDialog === "participants",
    staleTime: 30000,
  });
  const programsListQuery = useFetchPrograms(0, 0, {}, {
    enabled: isProgramRole && openDialog === "programs",
    staleTime: 30000,
  });
  const declaredResultsListQuery = useFetchResults(0, 0, { isResultDeclared: "true" }, {
    enabled: isProgramRole && openDialog === "results",
    staleTime: 30000,
  });

  const totalTeamPoints = useMemo(() => {
    const teams = teamsAllQuery.data?.teams || [];
    return teams.reduce((sum, t) => sum + ((t.stagePoints || 0) + (t.offStagePoints || 0)), 0);
  }, [teamsAllQuery.data?.teams]);

  // ===== STAT CARD DEFINITIONS =====
  const stats = [
    {
      id: "teams",
      title: "Total Teams",
      value: teamsAllQuery.data?.teams?.length ?? 0,
      icon: UserSquare2,
      color: "#ec4899",
      isLoading: teamsAllQuery.isLoading || teamsAllQuery.isFetching,
    },
    {
      id: "divisions",
      title: "Total Divisions",
      value: divisionsAllQuery.data?.pagination?.total ?? 0,
      icon: LayoutGrid,
      color: "#a855f7",
      isLoading: divisionsAllQuery.isLoading || divisionsAllQuery.isFetching,
    },
    {
      id: "programs",
      title: "Total Programs",
      value: programsCountQuery.data?.pagination?.total ?? 0,
      icon: BookOpen,
      color: "#0ea5e9",
      isLoading: programsCountQuery.isLoading || programsCountQuery.isFetching,
    },
    {
      id: "participants",
      title: "Total Participants",
      value: participantsCountQuery.data?.pagination?.total ?? 0,
      icon: Users,
      color: "#6366f1",
      isLoading: participantsCountQuery.isLoading || participantsCountQuery.isFetching,
    },
    {
      id: "results",
      title: "Declared Results",
      value: declaredResultsCountQuery.data?.pagination?.total ?? 0,
      icon: CheckCircle2,
      color: "#22c55e",
      isLoading: declaredResultsCountQuery.isLoading || declaredResultsCountQuery.isFetching,
    },
    {
      id: "teampoints",
      title: "Total Team Points",
      value: totalTeamPoints,
      icon: Trophy,
      color: "#f59e0b",
      isLoading: teamsAllQuery.isLoading || teamsAllQuery.isFetching,
    },
  ];

  // ===== DIALOG CONTENT =====
  const teams = teamsAllQuery.data?.teams || [];
  const divisions = divisionsAllQuery.data?.divisions || [];
  const participants = participantsListQuery.data?.participants || [];
  const programs = programsListQuery.data?.programs || [];
  const declaredResults = declaredResultsListQuery.data?.results || [];

  const getDialogProps = () => {
    switch (openDialog) {
      case "participants":
        return {
          title: `Participants (${participantsCountQuery.data?.pagination?.total ?? "…"})`,
          icon: Users, color: "#6366f1",
          isLoading: participantsListQuery.isLoading || participantsListQuery.isFetching,
          content: participants.length === 0
            ? <p className="text-center text-muted-foreground py-8 text-sm">No participants found</p>
            : <div className="space-y-1">{participants.map((p, i) => (
                <ListRow key={p._id} index={i + 1} primary={p.name}
                  secondary={`${p.teamName || ""}${p.divisionName ? " · " + p.divisionName : ""}`}
                  badge={p.chestNumber != null ? `#${p.chestNumber}` : undefined} badgeColor="#6366f1" />
              ))}</div>,
        };

      case "programs":
        return {
          title: `Programs (${programsCountQuery.data?.pagination?.total ?? "…"})`,
          icon: BookOpen, color: "#0ea5e9",
          isLoading: programsListQuery.isLoading || programsListQuery.isFetching,
          content: programs.length === 0
            ? <p className="text-center text-muted-foreground py-8 text-sm">No programs found</p>
            : <div className="space-y-1">{programs.map((p, i) => (
                <ListRow key={p._id} index={i + 1} primary={p.name}
                  secondary={`${p.category} · ${p.type}${p.divisionName ? " · " + p.divisionName : ""}`}
                  badge={p.pointScheme} badgeColor="#0ea5e9" />
              ))}</div>,
        };

      case "results":
        return {
          title: `Declared Results (${declaredResultsCountQuery.data?.pagination?.total ?? "…"})`,
          icon: CheckCircle2, color: "#22c55e",
          isLoading: declaredResultsListQuery.isLoading || declaredResultsListQuery.isFetching,
          content: declaredResults.length === 0
            ? <p className="text-center text-muted-foreground py-8 text-sm">No declared results found</p>
            : <div className="space-y-1">{declaredResults.map((r, i) => (
                <ListRow key={r._id} index={i + 1} primary={r.programName}
                  secondary={`${r.divisionName || ""}${r.programCategory ? " · " + r.programCategory : ""}`}
                  badge={r.resultNumber != null ? `#${r.resultNumber}` : undefined} badgeColor="#22c55e" />
              ))}</div>,
        };

      case "teampoints":
        return {
          title: `Team Points (Total: ${totalTeamPoints})`,
          icon: Trophy, color: "#f59e0b",
          isLoading: teamsAllQuery.isLoading || teamsAllQuery.isFetching,
          content: teams.length === 0
            ? <p className="text-center text-muted-foreground py-8 text-sm">No teams found</p>
            : <div className="space-y-1">{[...teams].sort((a, b) => b.totalPoints - a.totalPoints).map((t, i) => (
                <ListRow key={t._id} index={i + 1} primary={t.name}
                  secondary={`Stage: ${t.stagePoints ?? 0}  ·  Off-Stage: ${t.offStagePoints ?? 0}`}
                  badge={t.totalPoints} badgeColor="#f59e0b" />
              ))}</div>,
        };

      case "divisions":
        return {
          title: `Divisions (${divisionsAllQuery.data?.pagination?.total ?? "…"})`,
          icon: LayoutGrid, color: "#a855f7",
          isLoading: divisionsAllQuery.isLoading || divisionsAllQuery.isFetching,
          content: divisions.length === 0
            ? <p className="text-center text-muted-foreground py-8 text-sm">No divisions found</p>
            : <div className="space-y-1">{divisions.map((d, i) => (
                <ListRow key={d._id} index={i + 1} primary={d.name}
                  secondary={[d.type, d.participantsCount != null && `${d.participantsCount} participants`, d.programsCount != null && `${d.programsCount} programs`].filter(Boolean).join("  ·  ")}
                  badge={`#${d.chestNumberStartsAt ?? 0}`} badgeColor="#a855f7" />
              ))}</div>,
        };

      case "teams":
        return {
          title: `Teams (${teams.length})`,
          icon: UserSquare2, color: "#ec4899",
          isLoading: teamsAllQuery.isLoading || teamsAllQuery.isFetching,
          content: teams.length === 0
            ? <p className="text-center text-muted-foreground py-8 text-sm">No teams found</p>
            : <div className="space-y-1">{teams.map((t, i) => (
                <ListRow key={t._id} index={i + 1} primary={t.name}
                  secondary={`Leader: ${t.leaderName || "N/A"}  ·  Members: ${t.membersCount ?? 0}`}
                  badge={t.totalPoints} badgeColor="#ec4899" />
              ))}</div>,
        };

      default: return null;
    }
  };

  const dialogProps = getDialogProps();

  const navigateTo = (view) => {
    setShowPosters(view === "programs");
    setShowWinners(view === "winners");
    setShowTeamPoints(view === "teams");
    setShowChampions(view === "champions");
    setShowToppers(view === "toppers");
    setShowProgression(view === "graph");
    setShowDeclaring(view === "results");
    setShowCodeLetters(view === "code-letters");
    setShowDisplay(view === "display");
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) return;
      const key = e.key.toUpperCase();
      switch (key) {
        case "L": navigateTo("code-letters"); break;
        case "R": navigateTo("results"); break;
        case "W": navigateTo("winners"); break;
        case "P": navigateTo("programs"); break;
        case "T": navigateTo("teams"); break;
        case "G": navigateTo("graph"); break;
        case "I": navigateTo("toppers"); break;
        case "C": navigateTo("champions"); break;
        case "D": navigateTo("display"); break;
        default: break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col space-y-2">
      <Header
        title="DASHBOARD"
        subTitle={currentDate}
        icon={<Calendar className="h-5 w-5 text-muted-foreground" />}
      />

      {/* 6 Stat Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.id} {...stat} onClick={() => setOpenDialog(stat.id)} />
        ))}
      </div>

      {/* Detail Dialog */}
      {dialogProps && (
        <ListDialog
          open={!!openDialog}
          onClose={() => setOpenDialog(null)}
          title={dialogProps.title}
          icon={dialogProps.icon}
          color={dialogProps.color}
          isLoading={dialogProps.isLoading}
        >
          {dialogProps.content}
        </ListDialog>
      )}

      <DeclaringResultViewer isOpen={showDeclaring} onClose={() => setShowDeclaring(false)} onNavigate={navigateTo} apiKey={apiKey} isWhiteTheme={isWhiteTheme} setIsWhiteTheme={setIsWhiteTheme} />
      <CodeLettersViewer isOpen={showCodeLetters} onClose={() => setShowCodeLetters(false)} onNavigate={navigateTo} apiKey={apiKey} isWhiteTheme={isWhiteTheme} setIsWhiteTheme={setIsWhiteTheme} />
      <ProgramPostersViewer isOpen={showPosters} onClose={() => setShowPosters(false)} onNavigate={navigateTo} apiKey={apiKey} isWhiteTheme={isWhiteTheme} setIsWhiteTheme={setIsWhiteTheme} />
      <WinnerPostersViewer isOpen={showWinners} onClose={() => setShowWinners(false)} onNavigate={navigateTo} apiKey={apiKey} isWhiteTheme={isWhiteTheme} setIsWhiteTheme={setIsWhiteTheme} />
      <TeamPointsViewer isOpen={showTeamPoints} onClose={() => setShowTeamPoints(false)} onNavigate={navigateTo} apiKey={apiKey} isWhiteTheme={isWhiteTheme} setIsWhiteTheme={setIsWhiteTheme} />
      <ChampionsPostersViewer isOpen={showChampions} onClose={() => setShowChampions(false)} onNavigate={navigateTo} apiKey={apiKey} isWhiteTheme={isWhiteTheme} setIsWhiteTheme={setIsWhiteTheme} />
      <IndividualToppersViewer isOpen={showToppers} onClose={() => setShowToppers(false)} onNavigate={navigateTo} apiKey={apiKey} isWhiteTheme={isWhiteTheme} setIsWhiteTheme={setIsWhiteTheme} />
      <TeamPointsProgressionViewer isOpen={showProgression} onClose={() => setShowProgression(false)} onNavigate={navigateTo} apiKey={apiKey} isWhiteTheme={isWhiteTheme} setIsWhiteTheme={setIsWhiteTheme} />
      <GeneralDisplayViewer isOpen={showDisplay} onClose={() => setShowDisplay(false)} onNavigate={navigateTo} apiKey={apiKey} isWhiteTheme={isWhiteTheme} setIsWhiteTheme={setIsWhiteTheme} initialText={displayValue} />
    </div>
  );
}
