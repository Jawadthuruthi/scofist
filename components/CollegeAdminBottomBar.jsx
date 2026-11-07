"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Sparkles, FileText, FolderCheck, FileSpreadsheet } from "lucide-react";
import BaseRoleBottomBar from "./BaseRoleBottomBar";
import AIChatDrawer from "./ai/AIChatDrawer";

function GreenRoundBlinkingAIIcon() {
  return (
    <div className="relative flex items-center justify-center">
      <div className="h-7 w-7 rounded-full bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-sm flex items-center justify-center">
        <Sparkles className="h-3.5 w-3.5 text-white animate-pulse" />
      </div>
      {/* Blinking green status dot */}
      <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white dark:border-zinc-900"></span>
      </span>
    </div>
  );
}

export default function CollegeAdminBottomBar({ user, activeRole }) {
  const pathname = usePathname();
  const [isAiOpen, setIsAiOpen] = useState(false);

  // Close AI chat whenever the route changes
  useEffect(() => {
    setIsAiOpen(false);
  }, [pathname]);

  const handleCloseAi = useCallback(() => {
    setIsAiOpen(false);
  }, []);

  const handleToggleAi = useCallback(() => {
    setIsAiOpen((prev) => !prev);
  }, []);

  // Listen to global open/close events (e.g. from Dashboard.jsx on desktop)
  useEffect(() => {
    const handleOpen = () => setIsAiOpen(true);
    const handleClose = () => setIsAiOpen(false);
    const handleToggle = () => setIsAiOpen((prev) => !prev);

    window.addEventListener("open-ai-chat", handleOpen);
    window.addEventListener("close-ai-chat", handleClose);
    window.addEventListener("toggle-ai-chat", handleToggle);

    return () => {
      window.removeEventListener("open-ai-chat", handleOpen);
      window.removeEventListener("close-ai-chat", handleClose);
      window.removeEventListener("toggle-ai-chat", handleToggle);
    };
  }, []);

  const navItems = [
    {
      title: "Dashboard",
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: !isAiOpen && pathname === "/dashboard",
      onClick: handleCloseAi,
    },
    {
      title: "Accounts",
      label: "Accounts",
      href: "/dashboard/accounts",
      icon: FileText,
      active: !isAiOpen && Boolean(pathname?.startsWith("/dashboard/accounts")),
      onClick: handleCloseAi,
    },
    {
      title: "Applications",
      label: "Applications",
      href: "/dashboard/applications",
      icon: FolderCheck,
      active: !isAiOpen && Boolean(pathname?.startsWith("/dashboard/applications")),
      onClick: handleCloseAi,
    },
    {
      title: "Marks",
      label: "Marks",
      href: "/dashboard/marks",
      icon: FileSpreadsheet,
      active: !isAiOpen && Boolean(pathname?.startsWith("/dashboard/marks")),
      onClick: handleCloseAi,
    },
    {
      title: "AI Assistant",
      label: "AI",
      icon: GreenRoundBlinkingAIIcon,
      onClick: handleToggleAi,
      active: isAiOpen,
    },
  ];

  return (
    <>
      <BaseRoleBottomBar
        user={user}
        activeRole={activeRole}
        targetRole="College Admin"
        navItems={navItems}
        ariaLabel="College Admin mobile and tablet navigation"
      />
      <AIChatDrawer
        open={isAiOpen}
        onOpenChange={setIsAiOpen}
        hideFloatingButton={true}
      />
    </>
  );
}

