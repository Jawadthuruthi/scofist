"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function ReassignChestNumbersButton({ apiKey }) {
  const [loading, setLoading] = useState(false);

  const handleReassign = async () => {
    if (
      !confirm(
        "This will reassign chest numbers for ALL existing participants in every division, ordered by participant ID. Continue?"
      )
    )
      return;

    setLoading(true);
    try {
      const res = await fetch("/api/participants/reassign-chest-numbers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Failed to reassign chest numbers.");
        return;
      }

      toast.success(data.message);
    } catch (err) {
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleReassign}
      disabled={loading}
      className="whitespace-nowrap"
      id="reassign-chest-numbers-btn"
    >
      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Reassigning..." : "Reassign Chest Numbers"}
    </Button>
  );
}
