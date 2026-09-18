"use client";

import { useState } from "react";
import { toast } from "sonner";
import ConfirmationPopup from "@/components/ConfirmationPopup";

export default function PublishTeamPointsButton({ activeRole, activeYear }) {
  const [isLoading, setIsLoading] = useState(false);

  // Only render for Program Committee
  if (activeRole !== "Program Committee") {
    return null;
  }

  const handlePublish = async () => {
    setIsLoading(true);
    try {
      const url = activeYear ? `/api/team-points-publish?year=${encodeURIComponent(activeYear)}` : "/api/team-points-publish";
      const response = await fetch(url, {
        method: "POST",
      });

      const result = await response.json();

      if (response.ok) {
        toast?.success?.(result.message) || window.alert(result.message);
      } else {
        toast?.error?.(result.message || "Failed to publish") || window.alert(result.message || "Failed to publish");
      }
    } catch (error) {
      console.error("Error publishing team points:", error);
      toast?.error?.("An unexpected error occurred") || window.alert("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center mt-6 mb-10">
      <ConfirmationPopup
        title="Publish Team Points"
        action="Publish"
        loading={isLoading}
        onClick={handlePublish}
        icon={<span className="font-bold uppercase tracking-wider px-4 py-2">Publish Team Points</span>}
        triggerClass="h-11 px-8 bg-primary text-primary-foreground shadow hover:bg-primary/90"
      />
    </div>
  );
}
