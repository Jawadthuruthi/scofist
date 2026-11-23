"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

/**
 * ThemeToggle — Sun/Moon icon button that switches between light and dark themes.
 * Renders a placeholder during SSR to avoid hydration mismatch.
 */
export default function ThemeToggle({ className = "" }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`w-8 h-8 rounded-full ${className}`} aria-hidden="true" />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={`
        w-8 h-8 rounded-full flex items-center justify-center shrink-0
        transition-all duration-200 cursor-pointer
        border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50
        ${isDark
          ? "bg-white/[0.06] border-white/[0.14] text-[#c8c4ba] hover:text-white hover:bg-white/[0.12]"
          : "bg-black/[0.05] border-black/[0.09] text-[#4a5a44] hover:text-[#1a2217] hover:bg-black/[0.09]"
        }
        ${className}
      `}
    >
      {isDark ? (
        <Sun className="w-4 h-4" strokeWidth={1.75} />
      ) : (
        <Moon className="w-4 h-4" strokeWidth={1.75} />
      )}
    </button>
  );
}
