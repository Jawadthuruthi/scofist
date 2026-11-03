"use client";

import { usePathname } from "next/navigation";
import { FileType, ListChecks, Trophy, UserCheck, Award } from "lucide-react";
import BaseRoleBottomBar from "./BaseRoleBottomBar";

export default function ProgramCommitteeBottomBar({ user, activeRole }) {
  const pathname = usePathname();

  const navItems = [
    {
      title: "Code Letters",
      label: "Codes",
      href: "/dashboard/code-letters",
      icon: FileType,
      active: pathname?.startsWith("/dashboard/code-letters"),
    },
    {
      title: "Evaluation",
      label: "Evaluation",
      href: "/dashboard/evaluation",
      icon: ListChecks,
      active: pathname?.startsWith("/dashboard/evaluation"),
    },
    {
      title: "Results",
      label: "Results",
      href: "/dashboard/results",
      icon: Trophy,
      active: pathname?.startsWith("/dashboard/results"),
    },
    {
      title: "Judges",
      label: "Judges",
      href: "/dashboard/judges",
      icon: UserCheck,
      active: pathname?.startsWith("/dashboard/judges"),
    },
    {
      title: "Team Points",
      label: "Points",
      href: "/dashboard/team-points",
      icon: Award,
      active: pathname?.startsWith("/dashboard/team-points"),
    },
  ];

  return (
    <BaseRoleBottomBar
      user={user}
      activeRole={activeRole}
      targetRole="Program Committee"
      navItems={navItems}
      ariaLabel="Program Committee mobile and tablet navigation"
    />
  );
}

