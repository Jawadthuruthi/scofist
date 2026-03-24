"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, X, ChevronLeft, ChevronRight, Play, Pause, Trophy, Sun, Moon } from "lucide-react";

const getRankTheme = (rank, isWhiteTheme) => {
  switch (rank) {
    case 1:
      return { 
        border: isWhiteTheme ? "border-yellow-200" : "border-yellow-400", 
        bg: "bg-gradient-to-br from-yellow-300 to-yellow-600", 
        shadow: "shadow-[0_20px_40px_-15px_rgba(250,204,21,0.4)]", 
        text: isWhiteTheme ? "text-amber-600" : "text-yellow-500", 
        glow: isWhiteTheme ? "hover:shadow-[0_0_50px_-10px_rgba(250,204,21,0.3)]" : "group-hover/card:shadow-[0_0_50px_-10px_rgba(250,204,21,0.6)]" 
      };
    case 2:
      return { 
        border: isWhiteTheme ? "border-slate-200" : "border-slate-300", 
        bg: "bg-gradient-to-br from-slate-200 to-slate-500", 
        shadow: "shadow-[0_20px_40px_-15px_rgba(203,213,225,0.4)]", 
        text: isWhiteTheme ? "text-slate-600" : "text-slate-300", 
        glow: isWhiteTheme ? "hover:shadow-[0_0_50px_-10px_rgba(203,213,225,0.3)]" : "group-hover/card:shadow-[0_0_50px_-10px_rgba(203,213,225,0.6)]" 
      };
    case 3:
      return { 
        border: isWhiteTheme ? "border-amber-200" : "border-amber-600", 
        bg: "bg-gradient-to-br from-amber-500 to-amber-800", 
        shadow: "shadow-[0_20px_40px_-15px_rgba(217,119,6,0.4)]", 
        text: isWhiteTheme ? "text-amber-700" : "text-amber-600", 
        glow: isWhiteTheme ? "hover:shadow-[0_0_50px_-10px_rgba(217,119,6,0.3)]" : "group-hover/card:shadow-[0_0_50px_-10px_rgba(217,119,6,0.6)]" 
      };
    default:
      return { 
        border: isWhiteTheme ? "border-zinc-200" : "border-zinc-500", 
        bg: "bg-gradient-to-br from-zinc-400 to-zinc-600", 
        shadow: "shadow-[0_20px_40px_-15px_rgba(113,113,122,0.4)]", 
        text: isWhiteTheme ? "text-zinc-600" : "text-zinc-400", 
        glow: isWhiteTheme ? "hover:shadow-[0_0_50px_-10px_rgba(113,113,122,0.3)]" : "group-hover/card:shadow-[0_0_50px_-10px_rgba(113,113,122,0.6)]" 
      };
  }
};

const getRankString = (rank) => {
  switch(rank) {
    case 1: return "1st";
    case 2: return "2nd";
    case 3: return "3rd";
    default: return `${rank}th`;
  }
};

const getTeamBgColor = (teamName) => {
  if (!teamName) return "bg-zinc-600 border-zinc-500 text-white";
  const colors = [
    "bg-blue-600 border-blue-500 text-blue-50",
    "bg-emerald-600 border-emerald-500 text-emerald-50",
    "bg-rose-600 border-rose-500 text-rose-50",
    "bg-purple-600 border-purple-500 text-purple-50",
    "bg-orange-600 border-orange-500 text-orange-50",
    "bg-cyan-600 border-cyan-500 text-cyan-50",
    "bg-fuchsia-600 border-fuchsia-500 text-fuchsia-50",
    "bg-lime-600 border-lime-500 text-lime-50",
    "bg-indigo-600 border-indigo-500 text-indigo-50",
    "bg-teal-600 border-teal-500 text-teal-50"
  ];
  let hash = 0;
  for (let i = 0; i < teamName.length; i++) {
    hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const getTeamCardTheme = (teamName, isWhiteTheme) => {
  if (!teamName) return isWhiteTheme ? "bg-white border-zinc-200" : "bg-zinc-900/60 border-zinc-700/50";
  const themes = [
    isWhiteTheme ? "bg-blue-50/90 border-blue-200 hover:bg-blue-100/90" : "bg-blue-900/40 border-blue-500/50 hover:bg-blue-900/60",
    isWhiteTheme ? "bg-emerald-50/90 border-emerald-200 hover:bg-emerald-100/90" : "bg-emerald-900/40 border-emerald-500/50 hover:bg-emerald-900/60",
    isWhiteTheme ? "bg-rose-50/90 border-rose-200 hover:bg-rose-100/90" : "bg-rose-900/40 border-rose-500/50 hover:bg-rose-900/60",
    isWhiteTheme ? "bg-purple-50/90 border-purple-200 hover:bg-purple-100/90" : "bg-purple-900/40 border-purple-500/50 hover:bg-purple-900/60",
    isWhiteTheme ? "bg-orange-50/90 border-orange-200 hover:bg-orange-100/90" : "bg-orange-900/40 border-orange-500/50 hover:bg-orange-900/60",
    isWhiteTheme ? "bg-cyan-50/90 border-cyan-200 hover:bg-cyan-100/90" : "bg-cyan-900/40 border-cyan-500/50 hover:bg-cyan-900/60",
    isWhiteTheme ? "bg-fuchsia-50/90 border-fuchsia-200 hover:bg-fuchsia-100/90" : "bg-fuchsia-900/40 border-fuchsia-500/50 hover:bg-fuchsia-900/60",
    isWhiteTheme ? "bg-lime-50/90 border-lime-200 hover:bg-lime-100/90" : "bg-lime-900/40 border-lime-500/50 hover:bg-lime-900/60",
    isWhiteTheme ? "bg-indigo-50/90 border-indigo-200 hover:bg-indigo-100/90" : "bg-indigo-900/40 border-indigo-500/50 hover:bg-indigo-900/60",
    isWhiteTheme ? "bg-teal-50/90 border-teal-200 hover:bg-teal-100/90" : "bg-teal-900/40 border-teal-500/50 hover:bg-teal-900/60"
  ];
  let hash = 0;
  for (let i = 0; i < teamName.length; i++) {
    hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return themes[Math.abs(hash) % themes.length];
};

export default function WinnerPostersViewer({ isOpen, onClose, apiKey }) {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isWhiteTheme, setIsWhiteTheme] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPrograms();
      setCurrentIndex(0);
      setIsPlaying(true);
    }
  }, [isOpen]);

  useEffect(() => {
    let interval;
    if (isPlaying && isOpen && programs.length > 0) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % programs.length);
      }, 6000); // Wait 6 seconds for winners to give time to read
    }
    return () => clearInterval(interval);
  }, [isPlaying, isOpen, programs.length]);

  const handleOpenChange = (open) => {
    if (!open) onClose();
  };

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/winner-posters", {
        headers: { "api-key": apiKey },
      });
      const data = await res.json();
      if (data.success) {
        setPrograms(data.programs || []);
      } else {
        setError(data.message || "Failed to fetch winners");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % programs.length);
    setIsPlaying(false);
  };

  const handlePrev = () => {
    setCurrentIndex(prev => (prev - 1 + programs.length) % programs.length);
    setIsPlaying(false);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className={`max-w-none w-screen h-screen m-0 p-0 rounded-none border-none transition-colors duration-500 overflow-hidden flex items-center justify-center data-[state=open]:duration-500 [&>button]:hidden ${isWhiteTheme ? 'bg-zinc-50' : 'bg-zinc-950'}`}>
        <DialogTitle className="sr-only">Winner Posters Viewer</DialogTitle>
        <DialogDescription className="sr-only">Displays full screen posters with winners' photos</DialogDescription>
        
        {loading && (
          <div className={`flex flex-col items-center justify-center space-y-4 h-full ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>
            <Loader2 className="h-12 w-12 animate-spin text-yellow-500" />
            <p className="text-xl font-medium tracking-widest uppercase opacity-60">Loading Winners...</p>
          </div>
        )}

        {error && (
          <div className={`flex flex-col items-center justify-center space-y-4 h-full ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>
            <p className="text-xl text-red-500 font-medium">{error}</p>
            <button onClick={onClose} className={`px-6 py-2 font-bold uppercase tracking-wider rounded-md transition ${isWhiteTheme ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-zinc-200'}`}>Close</button>
          </div>
        )}

        {!loading && !error && programs.length === 0 && (
          <div className={`flex flex-col items-center justify-center space-y-4 h-full ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>
            <p className="text-xl font-medium">No declared results with winners found.</p>
            <button onClick={onClose} className={`px-6 py-2 font-bold uppercase tracking-wider rounded-md transition ${isWhiteTheme ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-zinc-200'}`}>Close</button>
          </div>
        )}

        {!loading && !error && programs.length > 0 && (
          <div className={`relative w-full h-full flex items-center justify-center overflow-hidden group transition-colors duration-500 ${isWhiteTheme ? 'bg-zinc-50 bg-[radial-gradient(ellipse_at_center,_#ffffff_0%,_#f4f4f5_100%)]' : 'bg-zinc-950 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black'}`}>
            


            {/* Navigation Buttons */}
            <button 
              onClick={handlePrev}
              className={`absolute left-6 z-50 p-4 rounded-full backdrop-blur-md transition-all border shadow-2xl hover:scale-110 hover:-translate-x-1 opacity-0 group-hover:opacity-100 ${isWhiteTheme ? 'bg-black/5 hover:bg-black/10 text-zinc-900 border-zinc-200' : 'bg-white/5 hover:bg-white/10 text-white border-white/10'}`}
            >
              <ChevronLeft className="h-8 w-8" />
            </button>

            <button 
              onClick={handleNext}
              className={`absolute right-6 z-50 p-4 rounded-full backdrop-blur-md transition-all border shadow-2xl hover:scale-110 hover:translate-x-1 opacity-0 group-hover:opacity-100 ${isWhiteTheme ? 'bg-black/5 hover:bg-black/10 text-zinc-900 border-zinc-200' : 'bg-white/5 hover:bg-white/10 text-white border-white/10'}`}
            >
              <ChevronRight className="h-8 w-8" />
            </button>

            {/* Current Poster Content Container */}
            <div 
              key={currentIndex} 
              className="w-full h-full pt-16 md:pt-24 pb-32 px-4 md:px-12 flex flex-col items-center justify-start overflow-y-auto no-scrollbar scroll-smooth animate-in fade-in slide-in-from-bottom-16 zoom-in-95 duration-700"
            >
                {/* Poster Header */}
                <div className="w-full text-center space-y-2 md:space-y-4 md:max-w-4xl mx-auto shrink-0 pb-2">
                   <div className={`flex items-center justify-center gap-4 text-sm md:text-lg font-bold font-sans uppercase tracking-[0.2em] ${isWhiteTheme ? 'text-zinc-500' : 'text-zinc-400'}`}>
                      <span>{programs[currentIndex].division}</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${isWhiteTheme ? 'bg-zinc-300' : 'bg-zinc-600'}`}></span>
                      <span className={`${isWhiteTheme ? 'text-amber-600' : 'text-yellow-500/90'}`}>{programs[currentIndex].category}</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${isWhiteTheme ? 'bg-zinc-300' : 'bg-zinc-600'}`}></span>
                      <span>{programs[currentIndex].type}</span>
                   </div>
                   <h1 className={`text-4xl md:text-6xl lg:text-[4.5rem] leading-[1.1] font-black uppercase tracking-tight drop-shadow-lg break-words whitespace-normal text-balance w-full max-w-[95vw] mx-auto px-4 ${isWhiteTheme ? 'text-black' : 'text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400'}`}>
                      {programs[currentIndex].name}
                   </h1>
                   <h2 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-yellow-200 to-yellow-600 uppercase tracking-widest mt-2 md:mt-4">
                      WINNERS
                   </h2>
                </div>

               <div className="w-full max-w-[100vw] px-4 lg:px-12 flex flex-row flex-nowrap items-end justify-start xl:justify-center overflow-x-auto no-scrollbar gap-8 md:gap-16 lg:gap-20 pb-12 pt-12 shrink-0">
                  {programs[currentIndex].winners.map((p, idx) => {
                    const theme = getRankTheme(p.rank, isWhiteTheme);
                    
                    // Uniform fixed size for all ranks to ensure identical layout
                    const cardSize = "p-8 md:p-10 w-80 md:w-[28rem] h-[38rem] md:h-[50rem] z-20 justify-center shrink-0 flex-none";
                    const imgSize = "w-48 h-48 md:w-64 md:h-64 mb-6 md:mb-10 border-[6px]";
                    const nameSize = "text-3xl md:text-4xl";
                    const rankBadgeSize = "-top-8 w-20 h-20 text-4xl";

                    return (
                      <div key={p._id || idx} className={`group/card relative flex flex-col items-center rounded-[2.5rem] border transition-all duration-500 hover:-translate-y-4 mt-12 md:mt-16 ${theme.shadow} ${theme.glow} ${cardSize} ${getTeamCardTheme(p.teamName, isWhiteTheme)} animate-in fade-in zoom-in-90 fill-mode-both`} style={{ animationDelay: `${idx * 150}ms`, animationDuration: '800ms' }}>
                         
                         {/* Rank Floating Badge */}
                         <div className={`absolute ${rankBadgeSize} ${theme.bg} text-black font-black rounded-full flex flex-col items-center justify-center shadow-2xl transform group-hover/card:scale-110 transition-transform duration-300 border-4 ${isWhiteTheme ? 'border-zinc-100' : 'border-zinc-950'}`}>
                           {p.rank}
                         </div>

                         {/* Trophy Icon */}
                         <Trophy className={`absolute -top-4 -right-4 w-12 h-12 ${theme.text} opacity-20 group-hover/card:opacity-100 transition-opacity duration-500 z-10 transform -rotate-12`} />

                         {/* Profile Picture */}
                         <div className={`${imgSize} rounded-full overflow-hidden shadow-inner transition-colors duration-300 relative z-10 ${isWhiteTheme ? 'border-zinc-100 bg-zinc-50 group-hover/card:border-yellow-500/20' : 'border-zinc-800 bg-zinc-800 group-hover/card:border-white/20'}`}>
                           {p.profilePic ? (
                             <img src={p.profilePic} alt={p.name} className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110" />
                           ) : (
                             <div className={`w-full h-full flex items-center justify-center font-black text-6xl uppercase ${isWhiteTheme ? 'bg-zinc-100 text-zinc-400' : 'bg-zinc-800/80 text-zinc-600'}`}>
                               {p.name.charAt(0)}
                             </div>
                           )}
                         </div>

                         {/* Details */}
                         <div className="text-center w-full space-y-3 z-10 px-2">
                           <h3 className={`font-black ${nameSize} leading-tight break-words text-balance w-full transition-colors ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`} title={p.name}>
                             {p.name}
                           </h3>
                           <div className="flex justify-center w-full">
                             <div className={`px-5 py-2 rounded-full border-2 ${getTeamBgColor(p.teamName)} text-xs md:text-sm font-black tracking-[0.2em] uppercase break-words inline-block shadow-inner`}>
                               {p.teamName}
                             </div>
                           </div>
                           
                           {/* Chest and Code Letters */}
                           <div className="flex justify-center items-center gap-3 w-full pt-2">
                             {p.chestNumber && p.chestNumber !== "N/A" && (
                               <div className={`border rounded-lg px-2.5 py-1 text-[10px] md:text-xs font-bold tracking-widest shadow-inner text-center ${isWhiteTheme ? 'bg-zinc-100 border-zinc-200 text-zinc-500' : 'bg-zinc-950/40 border-zinc-700/50 text-zinc-400'}`}>
                                 CHEST <span className={`${isWhiteTheme ? 'text-zinc-900' : 'text-zinc-100'} ml-1 text-xs md:text-sm`}>{p.chestNumber}</span>
                               </div>
                             )}
                             {p.codeLetter && p.codeLetter.trim() !== "" && (
                               <div className={`border rounded-lg px-2.5 py-1 text-[10px] md:text-xs font-bold tracking-widest shadow-inner text-center ${isWhiteTheme ? 'bg-zinc-100 border-zinc-200 text-zinc-500' : 'bg-zinc-950/40 border-zinc-700/50 text-zinc-400'}`}>
                                 CODE <span className={`${isWhiteTheme ? 'text-zinc-900' : 'text-zinc-100'} ml-1 text-xs md:text-sm`}>{p.codeLetter}</span>
                               </div>
                             )}
                           </div>

                           {(p.grade !== "-" || p.points > 0) && (
                             <div className={`mt-4 pt-4 border-t flex flex-col items-center justify-center gap-2 w-full ${isWhiteTheme ? 'border-zinc-200' : 'border-zinc-800/80'}`}>
                               {p.grade && p.grade !== "-" && (
                                 <div className="flex items-center gap-4">
                                   <span className={`font-mono text-xl md:text-3xl font-bold uppercase tracking-wider ${isWhiteTheme ? 'text-zinc-400' : 'text-zinc-500'}`}>GRADE</span>
                                   <span className={`${theme.text} font-black text-4xl md:text-5xl drop-shadow-lg leading-none`}>{p.grade}</span>
                                 </div>
                               )}
                               {p.points > 0 && (
                                 <div className="flex items-center gap-4">
                                   <span className={`font-mono text-xl md:text-3xl font-bold uppercase tracking-wider ${isWhiteTheme ? 'text-zinc-400' : 'text-zinc-500'}`}>PTS</span>
                                   <span className={`${theme.text} font-black text-4xl md:text-5xl drop-shadow-lg leading-none`}>{p.points}</span>
                                 </div>
                               )}
                             </div>
                           )}
                         </div>
                      </div>
                    );
                  })}
               </div>
            </div>
            
            {/* Dynamic Progress Indicator */}
            {isPlaying && programs.length > 1 && (
              <div className="absolute bottom-0 left-0 h-1.5 bg-yellow-500/80 animate-[progress_6s_linear_infinite] w-full origin-left" style={{ animation: 'progress linear 6s infinite' }}>
                <style>{`
                  @keyframes progress {
                    0% { transform: scaleX(0); }
                    100% { transform: scaleX(1); }
                  }
                `}</style>
              </div>
            )}

            {/* Footer Progress & Info */}
            <div className="absolute bottom-8 w-full px-12 flex justify-center items-center pointer-events-none z-50">
              <div className={`font-mono text-xs md:text-sm font-bold tracking-widest px-6 py-3 rounded-full border shadow-2xl backdrop-blur-md pointer-events-auto flex items-center gap-3 transition-all ${isWhiteTheme ? 'bg-white/80 text-zinc-600 border-zinc-200' : 'bg-zinc-900/80 text-zinc-400 border-zinc-800'}`}>
                {isPlaying && <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse hidden md:inline-block"></span>}
                DISPLAYING {currentIndex + 1} OF {programs.length} RESULTS
              </div>
            </div>

            <div className="absolute top-6 right-6 z-[100] flex items-center gap-4">
              <button 
                onClick={() => setIsWhiteTheme(!isWhiteTheme)}
                className={`p-3 rounded-full backdrop-blur-md transition-all shadow-xl hover:scale-[1.15] active:scale-95 flex items-center justify-center border cursor-pointer pointer-events-auto ${isWhiteTheme ? 'bg-black/5 hover:bg-black/10 text-zinc-900 border-zinc-200' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'}`}
                title={isWhiteTheme ? "Dark Theme" : "White Theme"}
              >
                {isWhiteTheme ? <Moon className="h-6 w-6" /> : <Sun className="h-6 w-6" />}
              </button>

              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-3 rounded-full backdrop-blur-md transition-all shadow-xl hover:scale-[1.15] active:scale-95 flex items-center justify-center border cursor-pointer pointer-events-auto ${isWhiteTheme ? 'bg-black/5 hover:bg-black/10 text-zinc-900 border-zinc-200' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'}`}
                title={isPlaying ? "Pause Slideshow" : "Play Slideshow"}
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
              </button>
              
              <button 
                onClick={onClose}
                className={`p-3 rounded-full backdrop-blur-md transition-all shadow-xl hover:scale-[1.15] active:scale-95 flex items-center justify-center border cursor-pointer pointer-events-auto ${isWhiteTheme ? 'bg-black/5 hover:bg-black/10 text-zinc-900 border-zinc-200' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'}`}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
