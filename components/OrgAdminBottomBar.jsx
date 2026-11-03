"use client";

import { usePathname } from "next/navigation";
import { FileText, AlertTriangle, TicketPercent, Newspaper, AlertCircle } from "lucide-react";
import BaseRoleBottomBar from "./BaseRoleBottomBar";

export default function OrgAdminBottomBar({ user, activeRole }) {
  const pathname = usePathname();

  const navItems = [
    {
      title: "Accounts",
      label: "Accounts",
      href: "/dashboard/accounts",
      icon: FileText,
      active: pathname === "/dashboard/accounts" || pathname?.startsWith("/dashboard/accounts"),
    },
    {
      title: "Debtors",
      label: "Debtors",
      href: "/dashboard/debtors",
      icon: AlertTriangle,
      active: pathname?.startsWith("/dashboard/debtors"),
    },
    {
      title: "Coupon Fund",
      label: "Coupon",
      href: "/dashboard/student-coupon-fund",
      icon: TicketPercent,
      active: pathname?.startsWith("/dashboard/student-coupon-fund"),
    },
    {
      title: "Articles",
      label: "Articles",
      href: "/dashboard/articles",
      icon: Newspaper,
      active: pathname?.startsWith("/dashboard/articles"),
    },
    {
      title: "Updates",
      label: "Updates",
      href: "/dashboard/updates",
      icon: AlertCircle,
      active: pathname?.startsWith("/dashboard/updates"),
    },
  ];

  return (
    <BaseRoleBottomBar
      user={user}
      activeRole={activeRole}
      targetRole="Org Admin"
      navItems={navItems}
      ariaLabel="Org Admin mobile and tablet navigation"
    />
  );
}

