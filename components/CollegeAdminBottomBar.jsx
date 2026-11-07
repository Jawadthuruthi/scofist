"use client";

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

  const navItems = [
    {
      title: "Dashboard",
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
    },
    {
      title: "Accounts",
      label: "Accounts",
      href: "/dashboard/accounts",
      icon: FileText,
      active: pathname?.startsWith("/dashboard/accounts"),
    },
    {
      title: "Applications",
      label: "Applications",
      href: "/dashboard/applications",
      icon: FolderCheck,
      active: pathname?.startsWith("/dashboard/applications"),
    },
    {
      title: "Marks",
      label: "Marks",
      href: "/dashboard/marks",
      icon: FileSpreadsheet,
      active: pathname?.startsWith("/dashboard/marks"),
    },
    {
      title: "AI Assistant",
      label: "AI",
      icon: GreenRoundBlinkingAIIcon,
      onClick: () => {
        window.dispatchEvent(new CustomEvent("open-ai-chat"));
      },
      active: false,
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
      <AIChatDrawer hideFloatingButton={true} />
    </>
  );
}

