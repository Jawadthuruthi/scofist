"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard, Sparkles, FileText, FolderCheck, FileSpreadsheet } from "lucide-react";
import BaseRoleBottomBar from "./BaseRoleBottomBar";

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
      title: "AI Search",
      label: "AI",
      href: "/dashboard/ai",
      icon: Sparkles,
      active: pathname === "/dashboard/ai" || pathname?.startsWith("/dashboard/ai"),
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
  ];

  return (
    <BaseRoleBottomBar
      user={user}
      activeRole={activeRole}
      targetRole="College Admin"
      navItems={navItems}
      ariaLabel="College Admin mobile and tablet navigation"
    />
  );
}

