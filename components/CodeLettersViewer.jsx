"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Search, Loader2, RotateCcw, Layout, X } from "lucide-react";
import DashboardTopBar from "./DashboardTopBar";

const STEPS = {
  SEARCH: "SEARCH",
  DISPLAY: "DISPLAY"
};

export default function CodeLettersViewer({ isOpen, onClose, apiKey, onNavigate, isWhiteTheme, setIsWhiteTheme }) {
  const [step, setStep] = useState(STEPS.SEARCH);
  const [searchQuery, setSearchQuery] = useState("");
  const [codeLetter, setCodeLetter] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [error, setError] = useState("");
  const [isDaisVisible, setIsDaisVisible] = useState(false);
  
  const searchInputRef = useRef(null);
  const codeInputRef = useRef(null);

  const [programsList, setProgramsList] = useState([]);

  useEffect(() => {
    if (isOpen) {
      if (step === STEPS.SEARCH && searchInputRef.current) {
        searchInputRef.current.focus();
      } else if (step === STEPS.DISPLAY && codeInputRef.current) {
        codeInputRef.current.focus();
      }
      // Pre-fetch all programs to support Sl.No search
      fetchAllPrograms();
    }
  }, [step, isOpen]);

  const fetchAllPrograms = async () => {
    try {
      const res = await fetch(`/api/programs?limit=1000&projection=_id,name,divisionId`, {
        headers: { "api-key": apiKey },
      });
      const data = await res.json();
      if (data.programs) {
        // Programs are already sorted by name: 1 from API
        const formatted = data.programs.map((p, idx) => ({
          ...p,
          slNo: (idx + 1).toString()
        }));
        setProgramsList(formatted);
      }
    } catch (err) {
      console.error("Failed to fetch programs list:", err);
    }
  };

  const reset = useCallback(() => {
    setStep(STEPS.SEARCH);
    setSearchQuery("");
    setCodeLetter("");
    setSelectedProgram(null);
    setError("");
    setIsDaisVisible(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const fetchProgram = async () => {
    if (!searchQuery) return;
    
    // 1. Try Sl.No match first
    const slMatch = programsList.find(p => p.slNo === searchQuery);
    if (slMatch) {
      setSelectedProgram(slMatch);
      setStep(STEPS.DISPLAY);
      setTimeout(() => codeInputRef.current?.focus(), 100);
      return;
    }

    // 2. Fallback to API search by name
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/programs?name=${encodeURIComponent(searchQuery)}&limit=1`, {
        headers: { "api-key": apiKey },
      });
      const data = await res.json();
      
      if (data.programs && data.programs.length > 0) {
        setSelectedProgram(data.programs[0]);
        setStep(STEPS.DISPLAY);
        setTimeout(() => codeInputRef.current?.focus(), 100);
      } else {
        setError("Program not found. Please try another name or Sl.No.");
      }
    } catch (err) {
      setError("Failed to fetch program. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisplay = (e) => {
    if (codeLetter.trim()) {
      setIsDaisVisible(true);
      // Blur the input to hide the cursor
      if (e && e.target) {
        e.target.blur();
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (step === STEPS.SEARCH) {
        fetchProgram();
      } else if (step === STEPS.DISPLAY) {
        handleDisplay(e);
      }
    }
  };

  // Keyboard shortcut for 'B' to go back to entry
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Only handle if viewer is open and in display step
      if (!isOpen || step !== STEPS.DISPLAY) return;

      // Don't trigger if user is typing in an input field (only relevant for the SEARCH step really)
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

      if (e.key.toUpperCase() === 'B' && isDaisVisible) {
        setIsDaisVisible(false);
        setCodeLetter(""); // Clear the input field for new entry
        // Focus the code input again after a short delay
        setTimeout(() => codeInputRef.current?.focus(), 100);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, step, isDaisVisible]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={`max-w-none w-screen h-screen m-0 p-0 rounded-none border-none overflow-hidden flex flex-col font-sans transition-colors duration-500 ${isWhiteTheme ? 'bg-zinc-50' : 'bg-black text-white'}`}
      >
        <DialogTitle className="sr-only">Code Letters Announcement</DialogTitle>
        
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none opacity-30">
          <div className="absolute top-0 right-1/4 w-[40rem] h-[40rem] rounded-full blur-[120px] animate-pulse bg-emerald-500/10" style={{ animationDuration: '6s' }} />
          <div className="absolute bottom-0 left-1/4 w-[40rem] h-[40rem] rounded-full blur-[120px] animate-pulse bg-blue-500/10" style={{ animationDuration: '8s' }} />
        </div>

        <DashboardTopBar 
            currentView="code-letters"
            onNavigate={onNavigate}
            isWhiteTheme={isWhiteTheme}
            toggleTheme={() => setIsWhiteTheme(!isWhiteTheme)}
            onClose={onClose}
            leftContent={
                <div className="flex items-center gap-4 px-2" onClick={(e) => e.stopPropagation()}>
                    {step === STEPS.SEARCH ? (
                        <div className="relative w-64">
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Program Name/Code..."
                                className={`w-full bg-transparent border-b-2 text-left text-xl font-black focus:outline-none py-1 transition-all opacity-40 focus:opacity-100 placeholder:uppercase ${isWhiteTheme ? 'border-zinc-200 focus:border-zinc-900 text-zinc-900 placeholder:text-zinc-300' : 'border-zinc-800 focus:border-white text-white placeholder:text-zinc-700'}`}
                            />
                            <div className="absolute right-0 bottom-1.5 opacity-30">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={reset}
                                className={`p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}
                                title="Change Program"
                            >
                                <RotateCcw className="h-5 w-5" />
                            </button>
                            <div className="relative w-32">
                                <input
                                    ref={codeInputRef}
                                    type="text"
                                    value={codeLetter}
                                    onChange={(e) => {
                                        const val = e.target.value.toUpperCase();
                                        if (val.length <= 3) {
                                            setCodeLetter(val);
                                            setIsDaisVisible(false); // Hide on change
                                        }
                                    }}
                                    onKeyDown={handleKeyDown}
                                    placeholder="LETTER..."
                                    className={`w-full bg-transparent border-b-2 text-center text-xl font-black focus:outline-none py-1 transition-all placeholder:uppercase ${isWhiteTheme ? 'border-zinc-200 focus:border-zinc-900 text-zinc-900 placeholder:text-zinc-300' : 'border-zinc-800 focus:border-white text-white placeholder:text-zinc-700'}`}
                                />
                            </div>
                        </div>
                    )}
                    {error && <p className="text-red-500 text-[10px] font-bold absolute top-12 left-2 animate-pulse">{error}</p>}
                </div>
            }
        />

        {/* Content Arena */}
        <div className="flex-1 relative z-10 flex flex-col items-center justify-center p-6 text-center pt-24">
            
            {step === STEPS.SEARCH && (
                <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700">
                    <div className="flex flex-col items-center gap-4">
                        <div className={`p-6 rounded-full ${isWhiteTheme ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-900/40 text-emerald-500'}`}>
                            <Layout className="w-16 h-16" />
                        </div>
                        <h2 className={`text-3xl font-black uppercase tracking-[0.3em] opacity-40 ${isWhiteTheme ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            Select Program
                        </h2>
                    </div>
                </div>
            )}

            {step === STEPS.DISPLAY && selectedProgram && (
                <div className="w-full max-w-[90vw] mx-auto flex flex-col items-center justify-center min-h-[90vh]">
                    {!isDaisVisible ? (
                        /* INITIAL DISPLAY: BIG PROGRAM & DIVISION */
                        <div className="space-y-4 md:space-y-6 animate-in fade-in zoom-in-95 duration-1000 text-center">
                            <div className={`text-3xl md:text-5xl font-bold uppercase tracking-[0.5em] opacity-60 ${isWhiteTheme ? 'text-zinc-600' : 'text-zinc-400'}`}>
                                {selectedProgram.divisionName}
                            </div>
                            <h1 className={`text-6xl md:text-[12rem] font-black uppercase tracking-tighter drop-shadow-2xl leading-[0.9] ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>
                                {selectedProgram.name}
                            </h1>
                            <div className="pt-8 animate-pulse">
                                <p className={`text-xl md:text-3xl font-bold uppercase tracking-[0.3em] opacity-30 ${isWhiteTheme ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                    Enter Code & Press Enter
                                </p>
                            </div>
                        </div>
                    ) : (
                        /* REVEAL DISPLAY: CINEMATIC STACK */
                        <div className="w-full space-y-2 md:space-y-4 animate-in fade-in slide-in-from-bottom-10 duration-700">
                            {/* Header: Division & Program Name */}
                            <div className="space-y-1 md:space-y-2 text-center">
                                <div className={`text-3xl md:text-6xl font-extrabold uppercase tracking-[0.5em] opacity-80 ${isWhiteTheme ? 'text-zinc-600' : 'text-zinc-400'}`}>
                                    {selectedProgram.divisionName}
                                </div>
                                <h1 className={`text-5xl md:text-[8rem] font-black uppercase tracking-tight drop-shadow-2xl leading-none ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>
                                    {selectedProgram.name}
                                </h1>
                            </div>

                            {/* Reveal Container */}
                            <div className="flex flex-col items-center justify-center -space-y-6 md:-space-y-12">
                                {/* "CODE LETTER" Label */}
                                <div className="animate-in fade-in zoom-in-95 duration-700 delay-100">
                                    <h2 className={`text-3xl md:text-6xl font-black uppercase tracking-[0.6em] opacity-40 ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>
                                        CODE LETTER
                                    </h2>
                                </div>

                                {/* The Actual Code Letter */}
                                <div className="relative group animate-in fade-in zoom-in-75 duration-700 delay-300">
                                    <div className={`absolute inset-0 blur-[150px] rounded-full animate-pulse group-hover:scale-110 transition-transform ${isWhiteTheme ? 'bg-zinc-400/30' : 'bg-white/20'}`} />
                                    <h1 className={`relative text-[20rem] md:text-[42rem] leading-[0.75] font-black uppercase tracking-tighter drop-shadow-2xl animate-[float_6s_ease-in-out_infinite] ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>
                                        {codeLetter}
                                    </h1>
                                </div>

                                {/* "ON THE DAIS" Label */}
                                <div className="animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500 pt-8 md:pt-16">
                                    <h3 className={`text-5xl md:text-[8rem] font-black uppercase tracking-[0.4em] ${isWhiteTheme ? 'text-zinc-900' : 'text-white'}`}>
                                        ON THE DAIS
                                    </h3>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>

        <style jsx global>{`
            @keyframes float {
                0%, 100% { transform: translateY(0) scale(1); }
                50% { transform: translateY(-20px) scale(1.02); }
            }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
