"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle, BookOpen, FileText, Award, ListChecks } from "lucide-react";
import BaseRoleBottomBar from "./BaseRoleBottomBar";

export default function JudgeBottomBar({ user, activeRole }) {
  const pathname = usePathname();
  const router = useRouter();
  // Marks should be open by default
  const [judgeTab, setJudgeTab] = useState("Marks");

  // Listen for tab changes dispatched from JudgePortal component
  useEffect(() => {
    const handleTabUpdated = (e) => {
      if (e?.detail) {
        setJudgeTab(e.detail);
      }
    };

    window.addEventListener("judge-active-tab-updated", handleTabUpdated);
    return () => window.removeEventListener("judge-active-tab-updated", handleTabUpdated);
  }, []);

  const handleSelectTab = (tabName) => {
    setJudgeTab(tabName);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("judge-tab-change", { detail: tabName }));
    }
    if (pathname !== "/judge-portal") {
      router.push("/judge-portal");
    }
  };

  const navItems = [
    {
      title: "Criteria",
      label: "Criteria",
      icon: CheckCircle,
      active: judgeTab === "Criteria",
      onClick: () => handleSelectTab("Criteria"),
    },
    {
      title: "Rules",
      label: "Rules",
      icon: BookOpen,
      active: judgeTab === "Rules",
      onClick: () => handleSelectTab("Rules"),
    },
    {
      title: "Topics",
      label: "Topics",
      icon: FileText,
      active: judgeTab === "Topics",
      onClick: () => handleSelectTab("Topics"),
    },
    {
      title: "Grade Scheme",
      label: "Grade",
      icon: Award,
      active: judgeTab === "Grade",
      onClick: () => handleSelectTab("Grade"),
    },
    {
      title: "Marks Entry",
      label: "Marks",
      icon: ListChecks,
      active: judgeTab === "Marks",
      onClick: () => handleSelectTab("Marks"),
    },
  ];

  return (
    <BaseRoleBottomBar
      user={user}
      activeRole={activeRole}
      targetRole="Judge"
      navItems={navItems}
      className="md:hidden print:hidden"
      ariaLabel="Judge mobile navigation"
    />
  );
}

