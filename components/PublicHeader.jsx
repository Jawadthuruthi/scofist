"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AuthButtons from "@/components/AuthButtons";
import { cn } from "@/lib/utils";

/**
 * PublicHeader - Dignified Collegiate Masthead
 * Features:
 * - Single-layer frosted architectural glass enclosure
 * - Authentic institutional typography and brand crest
 * - Quiet collegiate navigation anchors
 * - Streamlined, distraction-free actions
 */
export default function PublicHeader({
  logo,
  name,
  leftLogo,
  centerLogo,
  rightLogo,
  rightName,
  centered = false,
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const displayLogo = centerLogo || logo || leftLogo;
  const displayName = name || "Sa-adiya College";

  return (
    <header
      className={cn(
        "sticky top-3 sm:top-4 z-50 mx-auto w-[94%] sm:w-[90%] max-w-2xl rounded-full transition-all duration-500",
        "px-3.5 sm:px-4 py-2 flex items-center justify-between gap-3 sm:gap-4",
        scrolled
          ? "bg-[#080d09]/95 border border-white/[0.12] shadow-[0_16px_40px_-8px_rgba(0,0,0,0.85)] backdrop-blur-xl"
          : "bg-[#080d09]/85 border border-white/[0.08] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.65)] backdrop-blur-xl"
      )}
    >
      {/* Left: Brand Crest & Institutional Title */}
      <Link
        href="/"
        className="group flex items-center gap-2.5 sm:gap-3 rounded-full py-0.5 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
        aria-label={`${displayName} Home`}
      >
        {displayLogo ? (
          <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-full bg-white/[0.04] border border-white/10 p-0.5 flex items-center justify-center shrink-0 shadow-inner group-hover:border-white/20 transition-colors duration-300">
            <img
              src={displayLogo}
              alt={displayName}
              width={36}
              height={36}
              className="h-full w-full object-contain rounded-full"
            />
          </div>
        ) : (
          <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-full bg-[#0f2115] border border-[#20402b] flex items-center justify-center text-[#d4af37] font-playfair font-bold text-xs tracking-wider shrink-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)] group-hover:border-emerald-500/30 transition-colors duration-300">
            SDC
          </div>
        )}
        <div className="flex flex-col text-left truncate">
          <span className="text-xs sm:text-sm font-semibold tracking-tight text-[#f7f5ee] group-hover:text-white transition-colors duration-300 truncate">
            {displayName}
          </span>
          <span className="text-xs text-[#a6b09f] hidden md:block font-normal tracking-wide truncate">
            Kasaragod, Kerala · Est. 2006
          </span>
        </div>
      </Link>

      {/* Right Actions: Header Variant AuthButtons */}
      <div className="shrink-0 flex items-center">
        <AuthButtons variant="header" />
      </div>
    </header>
  );
}





