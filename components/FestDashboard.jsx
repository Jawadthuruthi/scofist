"use client";

import { useState, useEffect, useMemo } from "react";

import { Calendar } from "lucide-react";

import useCrud from "@/hooks/use-crud";
import Header from "@/components/Header";
import { formatDateForDisplay } from "@/lib/utils";

// ===== MAIN DASHBOARD COMPONENT =====
export default function FestDashboard({ apiKey, activeRole }) {
  const currentDate = formatDateForDisplay(new Date());

  return (
    <div className="flex flex-col space-y-6">
      <Header
        title="DASHBOARD"
        subTitle={currentDate}
        icon={<Calendar className="h-5 w-5 text-muted-foreground" />}
      />
    </div>
  );
}
