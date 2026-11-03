"use client";

import { usePathname } from "next/navigation";
import { Users, ListChecks, Calendar, BookOpen, ClipboardList } from "lucide-react";
import BaseRoleBottomBar from "./BaseRoleBottomBar";

export default function ProgramLeaderBottomBar({ user, activeRole }) {
  const pathname = usePathname();

  const navItems = [
    {
      title: "Participants",
      label: "Participants",
      href: "/dashboard/participants",
      icon: Users,
      active: pathname?.startsWith("/dashboard/participants"),
    },
    {
      title: "Programs",
      label: "Programs",
      href: "/dashboard/programs",
      icon: ListChecks,
      active: pathname?.startsWith("/dashboard/programs"),
    },
    {
      title: "Schedules",
      label: "Schedules",
      href: "/dashboard/schedules",
      icon: Calendar,
      active: pathname?.startsWith("/dashboard/schedules"),
    },
    {
      title: "Rules & Topics",
      label: "Rules",
      href: "/dashboard/rules-topics",
      icon: BookOpen,
      active: pathname?.startsWith("/dashboard/rules-topics"),
    },
    {
      title: "Registrations",
      label: "Registry",
      href: "/dashboard/program-registration",
      icon: ClipboardList,
      active: pathname?.startsWith("/dashboard/program-registration"),
    },
  ];

  return (
    <BaseRoleBottomBar
      user={user}
      activeRole={activeRole}
      targetRole="Program Leader"
      navItems={navItems}
      ariaLabel="Program Leader mobile and tablet navigation"
    />
  );
}

