"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard, GraduationCap, CreditCard, BookUser } from "lucide-react";
import BaseRoleBottomBar from "./BaseRoleBottomBar";

export default function SparkAdminBottomBar({ user, activeRole }) {
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
      title: "Alumnies",
      label: "Alumnies",
      href: "/dashboard/alumnies",
      icon: GraduationCap,
      active: pathname?.startsWith("/dashboard/alumnies"),
    },
    {
      title: "Finance",
      label: "Finance",
      href: "/dashboard/spark/finance",
      icon: CreditCard,
      active: pathname?.startsWith("/dashboard/spark/finance"),
    },
    {
      title: "Contacts",
      label: "Contacts",
      href: "/dashboard/spark/contacts",
      icon: BookUser,
      active: pathname?.startsWith("/dashboard/spark/contacts"),
    },
  ];

  return (
    <BaseRoleBottomBar
      user={user}
      activeRole={activeRole}
      targetRole="Spark Admin"
      navItems={navItems}
      ariaLabel="Spark Admin mobile and tablet navigation"
    />
  );
}

