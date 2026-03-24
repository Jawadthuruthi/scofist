"use client";

import { useState, useEffect, useMemo } from "react";

import { Calendar, MonitorPlay, Trophy, BarChart3, Crown, Star, TrendingUp, Award } from "lucide-react";

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

  return (
    <div className="flex flex-col space-y-6">
      <Header
        title="DASHBOARD"
        subTitle={currentDate}
        icon={<Calendar className="h-5 w-5 text-muted-foreground" />}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Declaring Result Action Card */}
        <div 
          onClick={() => setShowDeclaring(true)}
          className="bg-card hover:bg-zinc-100 dark:hover:bg-zinc-800 border-2 border-amber-500/20 rounded-xl p-6 flex items-center gap-4 cursor-pointer transition-all hover:scale-105 shadow-lg group"
        >
          <div className="p-4 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-500 rounded-full group-hover:rotate-12 transition-transform">
            <Award className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-black text-lg uppercase tracking-tight">Declaring Result</h3>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold opacity-60">Animated Entry Announcement</p>
          </div>
        </div>

        {/* Point Progression Action Card */}
        <div 
          onClick={() => setShowProgression(true)}
          className="bg-card hover:bg-zinc-100 dark:hover:bg-zinc-800 border rounded-xl p-6 flex items-center gap-4 cursor-pointer transition-colors shadow-sm"
        >
          <div className="p-4 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-500 rounded-full">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Points Progression</h3>
            <p className="text-sm text-muted-foreground">Historical chronological line graph</p>
          </div>
        </div>

        {/* Individual Toppers Action Card */}
        <div 
          onClick={() => setShowToppers(true)}
          className="bg-card hover:bg-zinc-100 dark:hover:bg-zinc-800 border rounded-xl p-6 flex items-center gap-4 cursor-pointer transition-colors shadow-sm"
        >
          <div className="p-4 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-500 rounded-full">
            <Star className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Individual Toppers</h3>
            <p className="text-sm text-muted-foreground">Individual Division high-scorers</p>
          </div>
        </div>

        {/* Champions Posters Action Card */}
        <div 
          onClick={() => setShowChampions(true)}
          className="bg-card hover:bg-zinc-100 dark:hover:bg-zinc-800 border rounded-xl p-6 flex items-center gap-4 cursor-pointer transition-colors shadow-sm"
        >
          <div className="p-4 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 rounded-full">
            <Crown className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Champions Posters</h3>
            <p className="text-sm text-muted-foreground">Top 3 overall teams spotlight</p>
          </div>
        </div>

        {/* Team Points Poster Action Card */}
        <div 
          onClick={() => setShowTeamPoints(true)}
          className="bg-card hover:bg-zinc-100 dark:hover:bg-zinc-800 border rounded-xl p-6 flex items-center gap-4 cursor-pointer transition-colors shadow-sm"
        >
          <div className="p-4 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-500 rounded-full">
            <BarChart3 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Team Points Poster</h3>
            <p className="text-sm text-muted-foreground">Animated live leaderboard</p>
          </div>
        </div>

        {/* Posters Action Card */}
        <div 
          onClick={() => setShowPosters(true)}
          className="bg-card hover:bg-zinc-100 dark:hover:bg-zinc-800 border rounded-xl p-6 flex items-center gap-4 cursor-pointer transition-colors shadow-sm"
        >
          <div className="p-4 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-500 rounded-full">
            <MonitorPlay className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Program Posters</h3>
            <p className="text-sm text-muted-foreground">View full-screen participant photos</p>
          </div>
        </div>

        {/* Winners Posters Action Card */}
        <div 
          onClick={() => setShowWinners(true)}
          className="bg-card hover:bg-zinc-100 dark:hover:bg-zinc-800 border rounded-xl p-6 flex items-center gap-4 cursor-pointer transition-colors shadow-sm"
        >
          <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-500 rounded-full">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Winners Posters</h3>
            <p className="text-sm text-muted-foreground">View full-screen winners slideshow</p>
          </div>
        </div>
      </div>

      <DeclaringResultViewer
        isOpen={showDeclaring}
        onClose={() => setShowDeclaring(false)}
        apiKey={apiKey}
      />

      <ProgramPostersViewer 
        isOpen={showPosters} 
        onClose={() => setShowPosters(false)} 
        apiKey={apiKey} 
      />

      <WinnerPostersViewer 
        isOpen={showWinners} 
        onClose={() => setShowWinners(false)} 
        apiKey={apiKey} 
      />

      <TeamPointsViewer
        isOpen={showTeamPoints}
        onClose={() => setShowTeamPoints(false)}
        apiKey={apiKey}
      />

      <ChampionsPostersViewer
        isOpen={showChampions}
        onClose={() => setShowChampions(false)}
        apiKey={apiKey}
      />

      <IndividualToppersViewer
        isOpen={showToppers}
        onClose={() => setShowToppers(false)}
        apiKey={apiKey}
      />

      <TeamPointsProgressionViewer
        isOpen={showProgression}
        onClose={() => setShowProgression(false)}
        apiKey={apiKey}
      />
    </div>
  );
}
