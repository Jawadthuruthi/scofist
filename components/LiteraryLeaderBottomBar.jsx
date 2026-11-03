"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, ClipboardList, FileSpreadsheet, UserCheck } from "lucide-react";
import BaseRoleBottomBar from "./BaseRoleBottomBar";

export default function LiteraryLeaderBottomBar({ user, activeRole }) {
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
      title: "Literary Groups",
      label: "Groups",
      href: "/dashboard/literary-groups",
      icon: Users,
      active: pathname?.startsWith("/dashboard/literary-groups"),
    },
    {
      title: "Attendance",
      label: "Attendance",
      href: "/dashboard/literary-attendance",
      icon: ClipboardList,
      active: pathname === "/dashboard/literary-attendance",
    },
    {
      title: "Attendance Sheet",
      label: "Sheet",
      href: "/dashboard/literary-attendance/attendance-sheet",
      icon: FileSpreadsheet,
      active: pathname?.startsWith("/dashboard/literary-attendance/attendance-sheet"),
    },
    {
      title: "Attendance History",
      label: "History",
      href: "/dashboard/literary-attendance/attendance-tracking",
      icon: UserCheck,
      active: pathname?.startsWith("/dashboard/literary-attendance/attendance-tracking"),
    },
  ];

  return (
    <BaseRoleBottomBar
      user={user}
      activeRole={activeRole}
      targetRole="Literary Leader"
      navItems={navItems}
      ariaLabel="Literary Leader mobile and tablet navigation"
    />
  );
}

