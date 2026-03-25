"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X, Play, Pause, ChevronLeft, ChevronRight, Trophy, Crown, Medal, User as UserIcon, Sun, Moon } from "lucide-react";
import DashboardTopBar from "./DashboardTopBar";

// Same gradient hash function as others
const getTeamBgColor = (teamName) => {
  if (!teamName) return "bg-zinc-600";
  const colors = [
    "from-blue-600 to-blue-900 border-blue-400 text-blue-50",
    "from-emerald-600 to-emerald-900 border-emerald-400 text-emerald-50",
    "from-rose-600 to-rose-900 border-rose-400 text-rose-50",
    "from-purple-600 to-purple-900 border-purple-400 text-purple-50",
    "from-orange-600 to-orange-900 border-orange-400 text-orange-50",
    "from-cyan-600 to-cyan-900 border-cyan-400 text-cyan-50",
    "from-fuchsia-600 to-fuchsia-900 border-fuchsia-400 text-fuchsia-50",
    "from-lime-600 to-lime-900 border-lime-400 text-lime-50",
    "from-indigo-600 to-indigo-900 border-indigo-400 text-indigo-50",
    "from-teal-600 to-teal-900 border-teal-400 text-teal-50"
  ];
  let hash = 0;
  for (let i = 0; i < teamName.length; i++) {
    hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function ChampionsPostersViewer({ isOpen, onClose, onNavigate, apiKey, isWhiteTheme, setIsWhiteTheme }) {
  const [champions, setChampions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setIsPlaying(true);
      fetchChampions();
    } else {
      setIsPlaying(false);
    }
  }, [isOpen]);

  // Slideshow interval
  useEffect(() => {
    let intervalId;
    if (isPlaying && champions.length > 0) {
      intervalId = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % champions.length);
      }, 5000);
    }
    return () => clearInterval(intervalId);
  }, [isPlaying, champions.length]);

  const fetchChampions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/champions-posters", {
        headers: { "api-key": apiKey },
      });
      const data = await res.json();
      if (data.success) {
        setChampions(data.data);
      } else {
        setError(data.message || "Failed to load champions");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % champions.length);
    setIsPlaying(false);
  };
  const handlePrev = () => {
    setCurrentIndex(prev => (prev - 1 + champions.length) % champions.length);
    setIsPlaying(false);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-none w-screen h-screen m-0 p-0 rounded-none border-none transition-colors duration-500 overflow-hidden flex flex-col data-[state=open]:duration-500 [&>button]:hidden ${isWhiteTheme ? 'bg-zinc-50' : 'bg-black'}`}>
        <DialogTitle className="sr-only">Champions Posters Viewer</DialogTitle>
        <DialogDescription className="sr-only">Displays full screen posters with champions and leader photos</DialogDescription>
        
        <DashboardTopBar 
          currentView="champions"
          onNavigate={onNavigate}
          isWhiteTheme={isWhiteTheme}
          toggleTheme={() => setIsWhiteTheme(!isWhiteTheme)}
          onClose={onClose}
          leftContent={champions.length > 0 && (
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-3 rounded-full backdrop-blur-md transition-all shadow-xl hover:scale-[1.15] active:scale-95 flex items-center justify-center border cursor-pointer ${isWhiteTheme ? 'bg-black/5 hover:bg-black/10 text-zinc-900 border-zinc-200' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'}`}
                title={isPlaying ? "Pause Slideshow" : "Play Slideshow"}
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
              </button>
              <div className={`px-4 py-2 rounded-xl backdrop-blur-sm border font-bold text-sm tracking-widest uppercase ${isWhiteTheme ? 'bg-white/50 text-zinc-500 border-zinc-200' : 'bg-zinc-900/50 text-zinc-400 border-zinc-800'}`}>
                Champions Slideshow 
              </div>
            </div>
          )}
        />

        {loading && (
          <div className={`flex flex-col items-center justify-center space-y-4 h-full ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>
            <div className={`w-16 h-16 border-4 rounded-full animate-spin shadow-[0_0_30px_rgba(234,179,8,0.3)] ${isWhiteTheme ? 'border-zinc-200 border-t-yellow-500' : 'border-zinc-800 border-t-yellow-500'}`}></div>
            <p className="text-xl font-medium tracking-widest uppercase opacity-60 animate-pulse">Summoning Champions...</p>
          </div>
        )}

        {error && (
          <div className={`flex flex-col items-center justify-center space-y-4 h-full ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>
            <p className="text-xl font-medium text-red-500">{error}</p>
            <button onClick={onClose} className={`px-6 py-2 font-bold uppercase tracking-wider rounded-md transition ${isWhiteTheme ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-zinc-200'}`}>Close</button>
          </div>
        )}

        {!loading && !error && champions.length > 0 && (
          <div className={`relative w-full h-full flex items-center justify-center overflow-hidden group transition-colors duration-500 pt-20 ${isWhiteTheme ? 'bg-zinc-50 bg-[radial-gradient(ellipse_at_center,_#ffffff_0%,_#f4f4f5_100%)]' : 'bg-zinc-950 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black'}`}>
            
            {/* Navigation Buttons */}
            <button
              onClick={handlePrev}
              className={`absolute left-6 top-1/2 -translate-y-1/2 p-4 rounded-full backdrop-blur-md transition-all opacity-0 flex group-hover:opacity-100 hover:scale-110 z-50 border ${isWhiteTheme ? 'bg-black/5 hover:bg-black/10 text-zinc-900 border-zinc-200' : 'bg-white/5 hover:bg-white/10 text-white border-white/10'}`}
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
            <button
              onClick={handleNext}
              className={`absolute right-6 top-1/2 -translate-y-1/2 p-4 rounded-full backdrop-blur-md transition-all opacity-0 flex group-hover:opacity-100 hover:scale-110 z-50 border ${isWhiteTheme ? 'bg-black/5 hover:bg-black/10 text-zinc-900 border-zinc-200' : 'bg-white/5 hover:bg-white/10 text-white border-white/10'}`}
            >
              <ChevronRight className="h-8 w-8" />
            </button>

            {/* Content Container (Fixed structure avoiding layout shifts) */}
            <div className="relative w-full h-full flex flex-col items-center justify-center overflow-y-auto no-scrollbar scroll-smooth">
                {champions.map((team, idx) => {
                  if (idx !== currentIndex) return null;
                  const theme = getTeamBgColor(team.name);
                  
                  // Ranking visual logic
                  let RankIcon = Trophy;
                  let rankColor = "text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]";
                  if (team.rank === 1) {
                    RankIcon = Crown;
                  } else if (team.rank === 2) {
                    RankIcon = Medal;
                    rankColor = "text-zinc-300 drop-shadow-[0_0_15px_rgba(212,212,216,0.5)]";
                  } else {
                    RankIcon = Medal;
                    rankColor = "text-amber-600 drop-shadow-[0_0_15px_rgba(217,119,6,0.5)]";
                  }

                  return (
                    <div key={team._id} className="w-full h-full flex flex-col items-center justify-center p-8 px-6 md:px-12 animate-in fade-in zoom-in-95 duration-[1s]">
                      
                      {/* The Huge Decorative Ranking Title & Team Name */}
                      <div className="w-full text-center shrink-0 z-20 flex flex-col items-center justify-center">
                        <h2 className={`text-4xl md:text-7xl lg:text-[8rem] font-black uppercase tracking-widest flex items-center justify-center gap-6 md:gap-12 drop-shadow-2xl leading-none ${isWhiteTheme ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-amber-800' : 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-yellow-200 to-yellow-600'}`}>
                          <RankIcon className={`w-16 h-16 md:w-32 md:h-32 lg:w-40 lg:h-40 ${rankColor}`} />
                          {team.title}
                          <RankIcon className={`w-16 h-16 md:w-32 md:h-32 lg:w-40 lg:h-40 ${rankColor}`} />
                        </h2>
                        
                        {/* Team Name Title Moved Here */}
                        <h1 className={`text-6xl md:text-[8rem] lg:text-[10rem] font-black uppercase tracking-tighter drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)] leading-[0.9] mt-2 md:mt-4 ${isWhiteTheme ? 'text-zinc-900 drop-shadow-sm' : 'text-white'}`}>
                          {team.name}
                        </h1>
                      </div>

                      {/* The Centerpiece Card - Now Ultra Wide for Side-By-Side layout */}
                      <div className={`relative w-full max-w-[95rem] h-auto flex flex-col items-center justify-center p-8 md:p-16 mt-0 md:mt-2 rounded-[4rem] bg-gradient-to-tr ${theme} shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden shrink-0 z-10 mx-auto transition-all duration-700 ${isWhiteTheme ? 'ring-8 ring-white shadow-xl' : ''}`}>
                         <div className="absolute inset-0 bg-white/5 opacity-0 hover:opacity-100 transition-opacity" />
                         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
                         
                         {/* Content Grid Wrapper - Vertically Stacked */}
                         <div className="relative w-full flex flex-col items-center justify-center gap-6 lg:gap-12 z-20">
                            
                            {/* TOP: Leader Photo & Name (Side-by-Side) */}
                            <div className="flex flex-col md:flex-row items-center justify-center gap-4 lg:gap-8 shrink-0">
                              
                              {/* Photo */}
                              <div className="relative w-56 h-56 lg:w-[22rem] lg:h-[22rem] shrink-0">
                                <div className={`absolute inset-0 rounded-full flex items-center justify-center ${!team.leaderPhoto ? 'bg-zinc-800' : 'bg-black'} shadow-[0_0_80px_rgba(0,0,0,0.6)] overflow-hidden ${isWhiteTheme ? 'ring-4 ring-white/50' : ''}`}>
                                  {team.leaderPhoto ? (
                                    <img src={team.leaderPhoto} alt="Team Leader" className="w-full h-full object-cover" />
                                  ) : (
                                    <img src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${team.leaderName}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf,ffd5dc`} alt="Default Leader Avatar" className="w-full h-full object-cover opacity-90" />
                                  )}
                                </div>
                              </div>
                              
                              {/* Leader Name Text */}
                              <div className="flex flex-col items-center md:items-start text-center md:text-left justify-center">
                                <span className={`font-mono text-xl lg:text-3xl font-bold uppercase tracking-widest mb-1 lg:mb-2 ${isWhiteTheme ? 'text-zinc-900/60' : 'text-white/80'}`}>Team Leader</span>
                                <span className={`text-5xl md:text-6xl lg:text-[7rem] font-black uppercase tracking-tighter drop-shadow-2xl leading-[0.9] ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>
                                  {team.leaderName.split(" ").length > 1 ? (
                                    <>
                                      {team.leaderName.split(" ")[0]}
                                      <br />
                                      {team.leaderName.split(" ").slice(1).join(" ")}
                                    </>
                                  ) : (
                                    team.leaderName
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* BOTTOM: Un-bolded, Team-Name Sized Points Text */}
                            <div className="flex w-full items-baseline justify-center gap-4 lg:gap-8 mt-4 md:mt-2">
                              <span className={`font-normal text-6xl md:text-[8rem] lg:text-[10rem] text-transparent bg-clip-text bg-gradient-to-b drop-shadow-[0_20px_30px_rgba(0,0,0,0.6)] leading-[0.9] ${isWhiteTheme ? 'from-zinc-900 to-zinc-700' : 'from-white to-white/80'}`}>
                                {team.points}
                              </span>
                              <span className={`font-normal text-6xl md:text-[8rem] lg:text-[10rem] uppercase tracking-tighter drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)] leading-[0.9] ${isWhiteTheme ? 'text-zinc-900' : 'text-white/95'}`}>
                                POINTS
                              </span>
                            </div>
                         </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
