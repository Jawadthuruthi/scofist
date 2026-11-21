"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ApplicationForm from "@/components/ApplicationForm";
import { LogIn, LayoutDashboard, ArrowRight } from "lucide-react";

/**
 * AuthButtons - Dignified Collegiate Actions
 * Crafted for authentic institutional identity:
 * - Natural 48px touch targets without inflated nested capsules
 * - Restrained typography and deliberate visual hierarchy
 * - Contextually honest iconography (no fake outbound arrows or radar pings)
 * - Accessible contrast ratios on dark academic palette
 */
export default function AuthButtons({ variant = "hero", className = "" }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      setIsAuthenticated(Boolean(token));
    } catch {
      setIsAuthenticated(false);
    }
  }, []);

  // Header variant removed from topbar
  if (variant === "header") {
    return null;
  }

  // Hero Variant: Authoritative, Clear Hierarchical Pair
  return (
    <nav
      className={`flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full max-w-lg mx-auto ${className}`}
      aria-label="Primary admission and portal navigation"
    >
      {/* Primary Hero CTA: Solid Ivory Academic Action */}
      <ApplicationForm
        trigger={
          <button
            type="button"
            className="group relative w-full sm:w-auto inline-flex items-center justify-center min-h-[48px] px-7 py-3 rounded-full bg-[#f7f5ee] hover:bg-white text-[#07160d] font-semibold text-sm tracking-normal transition-all duration-300 shadow-[0_4px_20px_rgba(247,245,238,0.12)] hover:shadow-[0_6px_28px_rgba(247,245,238,0.22)] active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
            aria-label="Open admission application form"
          >
            <span>Apply for Admission</span>
          </button>
        }
      />

      {/* Secondary Hero CTA: Architectural Frosted Glass */}
      <Link
        href={isAuthenticated ? "/dashboard" : "/login"}
        className="group relative w-full sm:w-auto inline-flex items-center justify-center min-h-[48px] px-6 py-3 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.12] hover:border-white/[0.22] text-[#ded9ce] hover:text-[#f7f5ee] font-medium text-sm tracking-normal transition-all duration-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
        aria-label={isAuthenticated ? "Open student & faculty dashboard" : "Log in to student and faculty portal"}
      >
        <span className="flex items-center gap-2">
          {isAuthenticated ? (
            <LayoutDashboard className="w-4 h-4 text-[#8f9b8a]" strokeWidth={1.5} />
          ) : (
            <LogIn className="w-4 h-4 text-[#8f9b8a] group-hover:text-[#f7f5ee] transition-colors" strokeWidth={1.5} />
          )}
          <span>{isAuthenticated ? "Open Dashboard" : "Student & Staff Portal"}</span>
          <ArrowRight className="w-4 h-4 text-[#8f9b8a] group-hover:text-[#f7f5ee] group-hover:translate-x-0.5 transition-all duration-300" strokeWidth={1.5} />
        </span>
      </Link>
    </nav>
  );
}





