"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ClipboardList } from "lucide-react";
import PendingRequestsDialog from "@/components/PendingRequestsDialog";
import ProfileComparisonDialog from "@/components/ProfileComparisonDialog";
import useCrud from "@/hooks/use-crud";

export default function PendingTeacherRequestsWrapper({ apiKey }) {
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [comparisonTeacher, setComparisonTeacher] = useState(null);

  const { useFetchItems } = useCrud("users", apiKey);

  const { data: pendingRequestsData } = useFetchItems(
    0,
    100,
    {
      roles: "Teacher",
      profileUpdateStatus: "Pending",
    },
    {
      refetchInterval: 15000,
    }
  );

  const pendingRequestsCount = pendingRequestsData?.users?.length || 0;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={pendingRequestsCount > 0 ? "destructive" : "outline"}
        onClick={() => setIsRequestsOpen(true)}
        className={`h-9 px-3 shrink-0 print:hidden gap-2 ${pendingRequestsCount > 0 ? "bg-red-500 hover:bg-red-600 text-white" : ""}`} 
      >
        <ClipboardList className="h-4 w-4" />
        <span className="hidden md:inline">Requests</span>
        {pendingRequestsCount > 0 && (
          <span className="ml-1 bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
            {pendingRequestsCount}
          </span>
        )}
      </Button>

      <PendingRequestsDialog
        open={isRequestsOpen}
        onClose={() => setIsRequestsOpen(false)}
        apiKey={apiKey}
        role="Teacher"
        onView={(teacher) => {
          setIsRequestsOpen(false);
          setComparisonTeacher(teacher);
          setIsComparisonOpen(true);
        }}
      />

      <ProfileComparisonDialog
        student={comparisonTeacher}
        open={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        onActionComplete={() => {
          setIsComparisonOpen(false);
          window.location.reload();
        }}
      />
    </div>
  );
}
