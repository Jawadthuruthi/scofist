"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X, Trophy, Award, Search, Loader2, Sun, Moon, Sparkles, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = {
  INPUT: "INPUT",
  ANNOUNCEMENT: "ANNOUNCEMENT",
  PROGRAM_HEADER: "PROGRAM_HEADER",
  FIRST_PLACE: "FIRST_PLACE",
  SECOND_PLACE: "SECOND_PLACE",
  THIRD_PLACE: "THIRD_PLACE",
  OTHERS: "OTHERS",
  PODIUM: "PODIUM"
};

const getRankTheme = (rank, isWhiteTheme) => {
  switch (rank) {
    case 1:
      return {
        text: "text-amber-500",
        bg: "from-yellow-400 to-yellow-600",
        border: "border-yellow-400",
        shadow: "shadow-[0_0_50px_rgba(250,204,21,0.3)]",
        label: "1ST PLACE"
      };
    case 2:
      return {
        text: "text-slate-300",
        bg: "from-slate-300 to-slate-500",
        border: "border-slate-300",
        shadow: "shadow-[0_0_50px_rgba(203,213,225,0.3)]",
        label: "2ND PLACE"
      };
    case 3:
      return {
        text: "text-amber-700",
        bg: "from-amber-600 to-amber-800",
        border: "border-amber-600",
        shadow: "shadow-[0_0_50px_rgba(217,119,6,0.3)]",
        label: "3RD PLACE"
      };
    default:
      return {
        text: isWhiteTheme ? "text-zinc-500" : "text-zinc-400",
        bg: "from-zinc-400 to-zinc-600",
        border: "border-zinc-500",
        shadow: "shadow-none",
        label: "CONSOLATION"
      };
  }
};

const getTeamBgColor = (teamName) => {
  if (!teamName) return "bg-zinc-600 text-white";
  const colors = [
    "bg-blue-600 text-blue-50",
    "bg-emerald-600 text-emerald-50",
    "bg-rose-600 text-rose-50",
    "bg-purple-600 text-purple-50",
    "bg-orange-600 text-orange-50",
    "bg-cyan-600 text-cyan-50",
    "bg-fuchsia-600 text-fuchsia-50",
    "bg-lime-600 text-lime-50",
    "bg-indigo-600 text-indigo-50",
    "bg-teal-600 text-teal-50"
  ];
  let hash = 0;
  for (let i = 0; i < teamName.length; i++) {
    hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function DeclaringResultViewer({ isOpen, onClose, apiKey }) {
  const [step, setStep] = useState(STEPS.INPUT);
  const [resultNumber, setResultNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [isWhiteTheme, setIsWhiteTheme] = useState(false);
  const [error, setError] = useState("");

  const reset = useCallback(() => {
    setStep(STEPS.INPUT);
    setResultNumber("");
    setResultData(null);
    setError("");
  }, []);

  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const fetchResult = async () => {
    if (!resultNumber) return;
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/results?resultNumber=${resultNumber}`, {
        headers: { "api-key": apiKey },
      });
      const data = await res.json();
      if (data.success && data.results.length > 0) {
        setResultData(data.results[0]);
        setStep(STEPS.ANNOUNCEMENT);
      } else {
        setError("Result not found. Please check the number.");
      }
    } catch (err) {
      setError("Failed to fetch result. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = useCallback(() => {
    if (step === STEPS.INPUT) {
        fetchResult();
        return;
    }

    const sequence = [
      STEPS.ANNOUNCEMENT,
      STEPS.PROGRAM_HEADER,
      STEPS.FIRST_PLACE,
      STEPS.SECOND_PLACE,
      STEPS.THIRD_PLACE,
      STEPS.OTHERS,
      STEPS.PODIUM
    ];

    const currentIndex = sequence.indexOf(step);
    if (currentIndex < sequence.length - 1) {
      const next = sequence[currentIndex + 1];
      
      // Skip steps if no participants for that rank
      if (next === STEPS.FIRST_PLACE && !resultData?.participants.some(p => p.rank === 1)) {
        setStep(STEPS.SECOND_PLACE);
        setTimeout(nextStep, 0);
        return;
      }
      if (next === STEPS.SECOND_PLACE && !resultData?.participants.some(p => p.rank === 2)) {
        setStep(STEPS.THIRD_PLACE);
        setTimeout(nextStep, 0);
        return;
      }
      if (next === STEPS.THIRD_PLACE && !resultData?.participants.some(p => p.rank === 3)) {
        setStep(STEPS.OTHERS);
        setTimeout(nextStep, 0);
        return;
      }
      if (next === STEPS.OTHERS && !resultData?.participants.some(p => p.rank > 3)) {
        setStep(STEPS.PODIUM);
        return;
      }

      setStep(next);
    }
  }, [step, resultData, resultNumber]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === "Enter") {
        nextStep();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, nextStep]);

  if (!isOpen) return null;

  const WinnerCard = ({ p, rank }) => {
    const theme = getRankTheme(rank, isWhiteTheme);
    return (
      <div className={`relative flex flex-col items-center p-8 rounded-[2.5rem] border-2 transition-all duration-700 animate-in fade-in zoom-in-95 slide-in-from-bottom-12 ${isWhiteTheme ? 'bg-white border-zinc-200' : 'bg-zinc-900/80 border-zinc-700'} ${theme.shadow}`}>
        <div className={`absolute -top-6 px-6 py-2 rounded-full ${theme.bg} text-black font-black text-sm tracking-widest shadow-lg`}>
          {theme.label}
        </div>
        
        {/* Photo */}
        <div className={`w-40 h-40 md:w-56 md:h-56 rounded-full overflow-hidden border-4 mb-6 shadow-inner ${theme.border}`}>
            {p.participantDetails?.profilePic ? (
                <img src={p.participantDetails.profilePic} alt={p.participantDetails.name} className="w-full h-full object-cover" />
            ) : (
                <div className={`w-full h-full flex items-center justify-center text-5xl font-black ${isWhiteTheme ? 'bg-zinc-100 text-zinc-300' : 'bg-zinc-800 text-zinc-600'}`}>
                    {p.participantDetails?.name?.charAt(0) || "?"}
                </div>
            )}
        </div>

        <h3 className={`text-2xl md:text-4xl font-black text-center mb-2 uppercase tracking-tight ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>
            {p.participantDetails?.name || "Unknown"}
        </h3>
        
        <div className="flex flex-col items-center gap-3">
            <div className={`px-4 py-1.5 rounded-full font-black text-xs md:text-sm uppercase tracking-widest shadow-md ${getTeamBgColor(p.participantDetails?.teamId?.name)}`}>
                {p.participantDetails?.teamId?.name || "Independent"}
            </div>
            
            <div className="flex items-center gap-4 mt-2">
                {p.participantDetails?.chestNumber && (
                    <div className={`px-3 py-1 rounded-lg border font-bold text-xs ${isWhiteTheme ? 'bg-zinc-50 border-zinc-200 text-zinc-500' : 'bg-zinc-950/50 border-zinc-800 text-zinc-400'}`}>
                        CHEST <span className={`ml-1 text-sm ${isWhiteTheme ? 'text-zinc-900' : 'text-zinc-100'}`}>{p.participantDetails.chestNumber}</span>
                    </div>
                )}
                <div className={`px-3 py-1 rounded-lg border font-bold text-xs ${isWhiteTheme ? 'bg-zinc-50 border-zinc-200 text-zinc-500' : 'bg-zinc-950/50 border-zinc-800 text-zinc-400'}`}>
                    PTS <span className={`ml-1 text-sm ${theme.text} text-base`}>{p.points}</span>
                </div>
            </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={`max-w-none w-screen h-screen m-0 p-0 rounded-none border-none overflow-hidden flex flex-col font-sans transition-colors duration-500 cursor-pointer ${isWhiteTheme ? 'bg-zinc-50' : 'bg-zinc-950'}`}
        onClick={() => step !== STEPS.INPUT && nextStep()}
      >
        <DialogTitle className="sr-only">Declaring Result</DialogTitle>
        
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none opacity-30">
          <div className={`absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay`} />
          <div className={`absolute top-0 right-1/4 w-[40rem] h-[40rem] rounded-full blur-[120px] animate-pulse ${isWhiteTheme ? 'bg-indigo-200' : 'bg-indigo-500/10'}`} style={{ animationDuration: '6s' }} />
          <div className={`absolute bottom-0 left-1/4 w-[40rem] h-[40rem] rounded-full blur-[120px] animate-pulse ${isWhiteTheme ? 'bg-amber-200' : 'bg-amber-500/10'}`} style={{ animationDuration: '8s' }} />
        </div>

        {/* Top Controls */}
        <div className="absolute top-6 right-6 z-[100] flex items-center gap-4">
          <button 
            onClick={(e) => { e.stopPropagation(); setIsWhiteTheme(!isWhiteTheme); }}
            className={`p-3 rounded-full backdrop-blur-md transition-all border ${isWhiteTheme ? 'bg-white/80 border-zinc-200 text-zinc-900' : 'bg-zinc-900/80 border-zinc-700 text-white'} hover:scale-110`}
          >
            {isWhiteTheme ? <Moon className="h-6 w-6" /> : <Sun className="h-6 w-6" />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className={`p-3 rounded-full backdrop-blur-md transition-all border ${isWhiteTheme ? 'bg-white/80 border-zinc-200 text-zinc-900' : 'bg-zinc-900/80 border-zinc-700 text-white'} hover:scale-110`}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* content Arena */}
        <div className="flex-1 relative z-10 flex flex-col items-center justify-center p-6 text-center">
            
            {step === STEPS.INPUT && (
                <div className="w-full max-w-2xl space-y-8 animate-in fade-in zoom-in-95 duration-500" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-center mb-8">
                        <div className={`p-6 rounded-3xl ${isWhiteTheme ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-900 text-white'}`}>
                            <Award className="w-16 h-16 animate-bounce" />
                        </div>
                    </div>
                    <h1 className={`text-5xl font-black uppercase tracking-tighter ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>
                        Declare Result
                    </h1>
                    <div className="relative group">
                        <input
                            type="number"
                            autoFocus
                            value={resultNumber}
                            onChange={(e) => setResultNumber(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchResult()}
                            placeholder="Type Result Number..."
                            className={`w-full bg-transparent border-b-4 text-center text-7xl font-black focus:outline-none py-4 transition-all ${isWhiteTheme ? 'border-zinc-200 focus:border-zinc-900 text-zinc-900' : 'border-zinc-800 focus:border-white text-white'}`}
                        />
                        <div className="absolute right-0 bottom-4 opacity-30 group-hover:opacity-100 transition-opacity">
                            {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Search className="w-8 h-8" />}
                        </div>
                    </div>
                    {error && <p className="text-red-500 font-bold animate-pulse">{error}</p>}
                    <p className={`text-sm font-bold uppercase tracking-widest ${isWhiteTheme ? 'text-zinc-400' : 'text-zinc-500'}`}>Press Enter to Begin Announcement</p>
                </div>
            )}

            {step === STEPS.ANNOUNCEMENT && (
                <div className="space-y-6 animate-in fade-in zoom-in-75 duration-700">
                    <h3 className={`text-4xl md:text-6xl font-black uppercase tracking-[0.5em] animate-pulse ${isWhiteTheme ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        NOW DECLARING
                    </h3>
                    <h1 className={`text-[10rem] md:text-[15rem] leading-none font-black uppercase tracking-tighter animate-[float_6s_ease-in-out_infinite] ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>
                        Result <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-600 drop-shadow-2xl">
                            No {resultNumber}
                        </span>
                    </h1>
                </div>
            )}

            {step === STEPS.PROGRAM_HEADER && (
                <div className="space-y-4 md:space-y-8 animate-in fade-in slide-in-from-bottom-20 duration-1000">
                    <div className={`flex items-center justify-center gap-4 text-sm md:text-2xl font-bold uppercase tracking-[0.3em] ${isWhiteTheme ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        <span>{resultData.divisionName}</span>
                        <div className={`w-2 h-2 rounded-full ${isWhiteTheme ? 'bg-zinc-300' : 'bg-zinc-700'}`} />
                        <span>{resultData.programCategory}</span>
                    </div>
                    <h1 className={`text-5xl md:text-8xl lg:text-9xl font-black uppercase tracking-tight text-balance max-w-6xl mx-auto leading-tight ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>
                        {resultData.programName}
                    </h1>
                    <div className="flex justify-center pt-8">
                        <div className="h-1 w-32 bg-gradient-to-r from-transparent via-yellow-500 to-transparent rounded-full animate-pulse" />
                    </div>
                </div>
            )}

            {(step === STEPS.FIRST_PLACE || step === STEPS.SECOND_PLACE || step === STEPS.THIRD_PLACE) && (
                <div className="w-full flex flex-col items-center">
                    <div className="grid grid-cols-1 gap-8 w-full max-w-4xl justify-items-center">
                        {resultData.participants
                            .filter(p => p.rank === (step === STEPS.FIRST_PLACE ? 1 : step === STEPS.SECOND_PLACE ? 2 : 3))
                            .map((p, idx) => (
                                <WinnerCard key={p._id || idx} p={p} rank={p.rank} />
                            ))
                        }
                    </div>
                </div>
            )}

            {step === STEPS.OTHERS && (
                <div className="w-full max-w-6xl space-y-8 animate-in fade-in duration-700">
                    <h2 className={`text-4xl font-black uppercase tracking-widest ${isWhiteTheme ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        Consolation Prizes
                    </h2>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                        {resultData.participants
                            .filter(p => p.rank > 3)
                            .map((p, idx) => (
                                <div key={p._id || idx} className={`p-6 rounded-3xl border flex items-center gap-4 transition-all hover:scale-105 ${isWhiteTheme ? 'bg-white border-zinc-100' : 'bg-zinc-900/50 border-zinc-800'}`}>
                                    <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 border-2 border-zinc-500/30">
                                        {p.participantDetails?.profilePic ? (
                                            <img src={p.participantDetails.profilePic} alt={p.participantDetails.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-500 font-bold">
                                                {p.participantDetails?.name?.charAt(0) || "?"}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-left">
                                        <h4 className={`font-bold text-lg leading-tight ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>{p.participantDetails?.name}</h4>
                                        <p className="text-xs text-zinc-500 font-mono mt-1">{p.participantDetails?.teamId?.name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-bold text-zinc-400">PTS</span>
                                            <span className="text-sm font-black text-amber-500">{p.points}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </div>
            )}

            {step === STEPS.PODIUM && (
                <div className="w-full h-full flex flex-col pt-20">
                    <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-yellow-200 to-yellow-600 uppercase tracking-widest mb-12 animate-pulse">
                        Top Honor Roll
                    </h2>
                    <div className="flex-1 w-full max-w-7xl mx-auto flex items-end justify-center gap-4 md:gap-8 pb-32">
                        {/* 2nd Place */}
                        <PodiumCard rank={2} data={resultData.participants.find(p => p.rank === 2)} isWhiteTheme={isWhiteTheme} />
                        {/* 1st Place */}
                        <PodiumCard rank={1} data={resultData.participants.find(p => p.rank === 1)} isWhiteTheme={isWhiteTheme} isLarge />
                        {/* 3rd Place */}
                        <PodiumCard rank={3} data={resultData.participants.find(p => p.rank === 3)} isWhiteTheme={isWhiteTheme} />
                    </div>
                    {/* Program footer */}
                    <div className={`mt-auto pb-12 w-full text-center ${isWhiteTheme ? 'text-zinc-400' : 'text-zinc-500'} font-bold uppercase tracking-widest text-sm`}>
                         Congratulations to all participants!
                    </div>
                </div>
            )}
        </div>

        {/* Footer Hint */}
        <div className="absolute bottom-8 w-full flex justify-center pointer-events-none">
            <div className={`px-4 py-2 rounded-full text-[10px] md:text-xs font-black tracking-[0.2em] uppercase border transition-opacity duration-1000 ${step === STEPS.INPUT ? 'opacity-0' : 'opacity-40'} ${isWhiteTheme ? 'bg-white border-zinc-200 text-zinc-400' : 'bg-black/20 border-zinc-800 text-zinc-500'}`}>
                Click or Press Enter to Progress
            </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
            @keyframes float {
                0%, 100% { transform: translateY(0) scale(1); }
                50% { transform: translateY(-30px) scale(1.05); }
            }
        ` }} />
      </DialogContent>
    </Dialog>
  );
}

function PodiumCard({ rank, data, isWhiteTheme, isLarge = false }) {
    if (!data) return <div className={`flex-1 ${isLarge ? 'h-[70%]' : 'h-[50%]'} max-w-[18rem] opacity-0`} />;
    const theme = getRankTheme(rank, isWhiteTheme);
    
    return (
        <div className={`relative flex flex-col items-center flex-1 max-w-[12rem] md:max-w-[22rem] animate-in fade-in slide-in-from-bottom-20 duration-1000 delay-${rank === 1 ? '500' : rank === 2 ? '200' : '700'}`}>
            <div className={`w-full flex flex-col items-center mb-4 transition-transform hover:scale-105 group`}>
                <div className={`relative rounded-full overflow-hidden border-4 shadow-2xl transition-all duration-500 group-hover:border-white mb-4 ${isLarge ? 'w-24 h-24 md:w-48 md:h-48' : 'w-16 h-16 md:w-32 md:h-32'} ${theme.border}`}>
                    {data.participantDetails?.profilePic ? (
                        <img src={data.participantDetails.profilePic} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className={`w-full h-full flex items-center justify-center font-black ${isLarge ? 'text-4xl' : 'text-2xl'} uppercase ${isWhiteTheme ? 'bg-zinc-100 text-zinc-300' : 'bg-zinc-800 text-zinc-700'}`}>
                            {data.participantDetails?.name?.charAt(0)}
                        </div>
                    )}
                </div>
                <h4 className={`font-black text-center uppercase tracking-tight line-clamp-2 px-2 text-xs md:text-xl drop-shadow-md ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>
                    {data.participantDetails?.name}
                </h4>
            </div>

            <div className={`w-full rounded-t-3xl border-t-8 border-x bg-gradient-to-b shadow-2xl relative flex flex-col items-center justify-start pt-6 ${theme.bg} ${theme.border} ${isLarge ? 'h-72 md:h-[28rem]' : rank === 2 ? 'h-52 md:h-[22rem]' : 'h-40 md:h-[18rem]'}`}>
                <span className="text-5xl md:text-9xl font-black text-black/20">{rank}</span>
                <span className="absolute bottom-4 font-black text-black/40 text-[10px] md:text-lg tracking-widest">{data.points} PTS</span>
                {rank === 1 && (
                    <div className="absolute -top-10 animate-bounce">
                        <Trophy className="w-12 h-12 text-yellow-100 drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]" />
                    </div>
                )}
            </div>
        </div>
    );
}
