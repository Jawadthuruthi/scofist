"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * PublicHeader - Dignified Collegiate Masthead
 * Crafted with architectural restraint for Sa-adiya College:
 * - Content-hugging frosted glass capsule with physical specular highlight
 * - Playfair Display institutional seal typography
 * - Clean human-authored metadata without template chrome or middle dots
 * - Accessible focus rings and smooth tactile active states
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
  const displayName = name || "Sa-adiya College of Integrated Studies";

  return (
    <header
      role="banner"
      className={cn(
        "sticky top-3.5 sm:top-5 z-50 mx-auto w-[92%] sm:w-[86%] max-w-xl md:max-w-2xl rounded-full transition-all duration-300",
        "px-4 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between",
        scrolled
          ? "bg-[#070e0a]/92 border border-white/[0.12] shadow-[0_16px_36px_-6px_rgba(0,0,0,0.75),inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-xl"
          : "bg-[#070e0a]/80 border border-white/[0.08] shadow-[0_10px_28px_-6px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-md"
      )}
    >
      <Link
        href="/"
        className="group flex items-center justify-between w-full min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070e0a] rounded-full transition-transform duration-200 active:scale-[0.995]"
        aria-label={`${displayName} — Home`}
      >
        {/* Left: Brand Crest & Institutional Title */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 pr-2">
          {displayLogo ? (
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#0d1810] border border-[#23422c]/70 p-0.5 flex items-center justify-center shrink-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_2px_4px_rgba(0,0,0,0.35)] group-hover:border-[#386444] transition-all duration-300">
              <img
                src={displayLogo}
                alt=""
                width={36}
                height={36}
                className="h-full w-full object-contain rounded-full"
              />
            </div>
          ) : (
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#0f2115] border border-[#20402b] flex items-center justify-center shrink-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)] group-hover:border-emerald-500/30 transition-colors duration-300">
              <span className="text-[#deb954] font-playfair font-bold text-[11px] sm:text-xs tracking-wider select-none">
                SDC
              </span>
            </div>
          )}

          <div className="flex flex-col text-left truncate">
            <span className="font-playfair text-xs sm:text-[14px] font-semibold tracking-tight text-[#f7f5ee] group-hover:text-white transition-colors duration-200 leading-snug truncate">
              {displayName}
            </span>
            <span className="text-[11px] text-[#98a394] font-normal tracking-normal leading-tight hidden sm:block truncate">
              Classical Islamic Sciences & University Degree Programs
            </span>
          </div>
        </div>

        {/* Right: Academic Provenance Hallmark (Non-navigational) */}
        <div className="hidden sm:flex items-center pl-4 pr-1 py-0.5 border-l border-white/[0.08] text-right shrink-0">
          <div className="flex flex-col items-end">
            <span className="font-playfair text-xs font-medium text-[#ded9ce] group-hover:text-white transition-colors duration-200 leading-tight">
              Est. 2006
            </span>
            <span className="text-[10.5px] font-sans text-[#8f9b8c] tracking-normal leading-tight">
              Kasaragod Campus
            </span>
          </div>
        </div>
      </Link>
    </header>
  );
}





