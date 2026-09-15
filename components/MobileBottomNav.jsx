"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { Trophy, Flame, Calendar, Camera } from "lucide-react";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const params = useParams();

  // Only show on the 4 specific pages
  const isTargetPage =
    pathname?.startsWith("/results") ||
    pathname?.startsWith("/team-points") ||
    pathname?.startsWith("/schedule") ||
    pathname?.startsWith("/gallery");

  if (!isTargetPage) return null;

  const safeYear = params?.year ? decodeURIComponent(params.year) : "2026";

  const navItems = [
    {
      icon: Trophy,
      label: "Results",
      href: `/results/${safeYear}`,
      active: pathname?.startsWith("/results"),
    },
    {
      icon: Flame,
      label: "Points",
      href: `/team-points/${safeYear}`,
      active: pathname?.startsWith("/team-points"),
    },
    {
      icon: Calendar,
      label: "Schedule",
      href: `/schedule/${safeYear}`,
      active: pathname?.startsWith("/schedule"),
    },
    {
      icon: Camera,
      label: "Gallery",
      href: `/gallery/${safeYear}`,
      active: pathname?.startsWith("/gallery"),
    },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#120d09]/95 backdrop-blur-md border-t border-white/10 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-around px-2 py-2.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1.5 w-16 transition-colors ${
                item.active ? "text-[#d4af37]" : "text-white/50 hover:text-white/90"
              }`}
            >
              <div
                className={`p-1.5 rounded-full transition-colors ${
                  item.active ? "bg-[#d4af37]/15" : "bg-transparent"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    item.active ? "text-[#d4af37] fill-[#d4af37]/20" : ""
                  }`}
                />
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  item.active ? "text-[#d4af37]" : ""
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
