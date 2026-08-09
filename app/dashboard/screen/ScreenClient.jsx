"use client";

import { useState, useEffect } from "react";
import {
  MonitorPlay,
  Trophy,
  BarChart3,
  Crown,
  Star,
  TrendingUp,
  Award,
  Layout,
  Monitor,
} from "lucide-react";

import Header from "@/components/Header";
import ProgramPostersViewer from "@/components/ProgramPostersViewer";
import WinnerPostersViewer from "@/components/WinnerPostersViewer";
import TeamPointsViewer from "@/components/TeamPointsViewer";
import ChampionsPostersViewer from "@/components/ChampionsPostersViewer";
import IndividualToppersViewer from "@/components/IndividualToppersViewer";
import TeamPointsProgressionViewer from "@/components/TeamPointsProgressionViewer";
import DeclaringResultViewer from "@/components/DeclaringResultViewer";
import CodeLettersViewer from "@/components/CodeLettersViewer";
import GeneralDisplayViewer from "@/components/GeneralDisplayViewer";

const COLOR_CLASSES = {
  indigo: {
    border: "border-indigo-500/20",
    icon: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400",
  },
  emerald: {
    border: "border-emerald-500/20",
    icon: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400",
  },
  amber: {
    border: "border-amber-500/20",
    icon: "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400",
  },
  yellow: {
    border: "border-yellow-500/20",
    icon: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400",
  },
  blue: {
    border: "border-blue-500/20",
    icon: "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400",
  },
  purple: {
    border: "border-purple-500/20",
    icon: "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400",
  },
  teal: {
    border: "border-teal-500/20",
    icon: "bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400",
  },
  orange: {
    border: "border-orange-500/20",
    icon: "bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400",
  },
};

export default function ScreenClient({ apiKey, activeRole }) {
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.isContentEditable
      )
        return;
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

  const actionCards = [
    {
      label: "Display",
      description: "Full-screen custom announcements",
      icon: MonitorPlay,
      color: "indigo",
      onClick: () => setShowDisplay(true),
    },
    {
      label: "Code Letters",
      description: "On the Dais Announcement",
      icon: Layout,
      color: "emerald",
      onClick: () => setShowCodeLetters(true),
    },
    {
      label: "Declaring Result",
      description: "Animated Entry Announcement",
      icon: Award,
      color: "amber",
      onClick: () => setShowDeclaring(true),
    },
    {
      label: "Winners",
      description: "View full-screen winners slideshow",
      icon: Trophy,
      color: "yellow",
      onClick: () => setShowWinners(true),
    },
    {
      label: "Posters",
      description: "View full-screen participant photos",
      icon: MonitorPlay,
      color: "blue",
      onClick: () => setShowPosters(true),
    },
    {
      label: "Team Points",
      description: "Animated live leaderboard",
      icon: BarChart3,
      color: "purple",
      onClick: () => setShowTeamPoints(true),
    },
    {
      label: "Points Graph",
      description: "Historical chronological line graph",
      icon: TrendingUp,
      color: "teal",
      onClick: () => setShowProgression(true),
    },
    {
      label: "Individual Toppers",
      description: "Individual Division high-scorers",
      icon: Star,
      color: "orange",
      onClick: () => setShowToppers(true),
    },
    {
      label: "Champions",
      description: "Top 3 overall teams spotlight",
      icon: Crown,
      color: "amber",
      onClick: () => setShowChampions(true),
    },
  ];

  return (
    <div className="flex flex-col space-y-6">
      <Header
        title="SCREEN"
        subTitle="Select a display mode to launch"
        icon={<Monitor className="h-5 w-5 text-muted-foreground" />}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {actionCards.map(({ label, description, icon: Icon, color, onClick }) => {
          const { border, icon: iconCls } = COLOR_CLASSES[color];
          return (
            <div
              key={label}
              onClick={onClick}
              className={`bg-card hover:bg-zinc-100 dark:hover:bg-zinc-800 border-2 ${border} rounded-xl p-6 flex items-center gap-4 cursor-pointer transition-all hover:scale-105 shadow-lg group`}
            >
              <div className={`p-4 ${iconCls} rounded-full group-hover:rotate-12 transition-transform flex-shrink-0`}>
                <Icon className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-medium text-lg tracking-tight">{label}</h3>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold opacity-60">
                  {description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <DeclaringResultViewer
        isOpen={showDeclaring}
        onClose={() => setShowDeclaring(false)}
        onNavigate={navigateTo}
        apiKey={apiKey}
        isWhiteTheme={isWhiteTheme}
        setIsWhiteTheme={setIsWhiteTheme}
      />
      <CodeLettersViewer
        isOpen={showCodeLetters}
        onClose={() => setShowCodeLetters(false)}
        onNavigate={navigateTo}
        apiKey={apiKey}
        isWhiteTheme={isWhiteTheme}
        setIsWhiteTheme={setIsWhiteTheme}
      />
      <ProgramPostersViewer
        isOpen={showPosters}
        onClose={() => setShowPosters(false)}
        onNavigate={navigateTo}
        apiKey={apiKey}
        isWhiteTheme={isWhiteTheme}
        setIsWhiteTheme={setIsWhiteTheme}
      />
      <WinnerPostersViewer
        isOpen={showWinners}
        onClose={() => setShowWinners(false)}
        onNavigate={navigateTo}
        apiKey={apiKey}
        isWhiteTheme={isWhiteTheme}
        setIsWhiteTheme={setIsWhiteTheme}
      />
      <TeamPointsViewer
        isOpen={showTeamPoints}
        onClose={() => setShowTeamPoints(false)}
        onNavigate={navigateTo}
        apiKey={apiKey}
        isWhiteTheme={isWhiteTheme}
        setIsWhiteTheme={setIsWhiteTheme}
      />
      <ChampionsPostersViewer
        isOpen={showChampions}
        onClose={() => setShowChampions(false)}
        onNavigate={navigateTo}
        apiKey={apiKey}
        isWhiteTheme={isWhiteTheme}
        setIsWhiteTheme={setIsWhiteTheme}
      />
      <IndividualToppersViewer
        isOpen={showToppers}
        onClose={() => setShowToppers(false)}
        onNavigate={navigateTo}
        apiKey={apiKey}
        isWhiteTheme={isWhiteTheme}
        setIsWhiteTheme={setIsWhiteTheme}
      />
      <TeamPointsProgressionViewer
        isOpen={showProgression}
        onClose={() => setShowProgression(false)}
        onNavigate={navigateTo}
        apiKey={apiKey}
        isWhiteTheme={isWhiteTheme}
        setIsWhiteTheme={setIsWhiteTheme}
      />
      <GeneralDisplayViewer
        isOpen={showDisplay}
        onClose={() => setShowDisplay(false)}
        onNavigate={navigateTo}
        apiKey={apiKey}
        isWhiteTheme={isWhiteTheme}
        setIsWhiteTheme={setIsWhiteTheme}
        initialText={displayValue}
      />
    </div>
  );
}
