"use client";

import { useState } from "react";
import DynamicDataTable from "@/components/DynamicDataTable";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const columnsConfig = [
  {
    id: "select",
    header: "Select",
    type: ["checkbox"],
    width: 50,
    maxWidth: 50,
    minWidth: 50,
  },
  { accessorKey: "periodNumber", header: "Period No." },
  { accessorKey: "startTime", header: "Start Time", type: ["time"] },
  { accessorKey: "endTime", header: "End Time", type: ["time"] },
];

const formFields = [
  {
    name: "periodNumber",
    label: "Period No.",
    type: "number",
    placeholder: "Period No.",
    required: true,
  },
  {
    name: "startTime",
    label: "Start Time",
    type: "time",
    placeholder: "Start Time",
    required: true,
    validators: {
      compareWith: [
        {
          field: "endTime",
          operator: "<",
          message: "Start time must be before end time",
          errorPath: "startTime",
        },
      ],
    },
  },
  {
    name: "endTime",
    label: "End Time",
    type: "time",
    placeholder: "End Time",
    required: true,
    validators: {
      compareWith: [
        {
          field: "startTime",
          operator: ">",
          message: "End time must be after start time",
          errorPath: "endTime",
        },
      ],
    },
  },
];

const filterConfig = [
  { id: "periodNumber", label: "Period No." },
  { id: "startTime", label: "Start Time" },
  { id: "endTime", label: "End Time" },
];

export default function PeriodsManagementClient({ apiKey, initialIsSpecialDay }) {
  const [isSpecialDay, setIsSpecialDay] = useState(Boolean(initialIsSpecialDay));
  const [isToggling, setIsToggling] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Toggle Special Day ON / OFF in settings
  const handleToggleSpecialDay = async () => {
    try {
      setIsToggling(true);
      const nextState = !isSpecialDay;

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({ isSpecialDay: nextState }),
      });

      if (!res.ok) {
        throw new Error("Failed to update special day status");
      }

      setIsSpecialDay(nextState);
      setRefreshKey((prev) => prev + 1);

      if (nextState) {
        toast.success("Special Day is ON. Special day period timings are now active.");
      } else {
        toast.success("Special Day is OFF. Normal day period timings are now active.");
      }
    } catch (err) {
      console.error("Error toggling special day:", err);
      toast.error(err.message || "Failed to toggle special day");
    } finally {
      setIsToggling(false);
    }
  };

  // Button placed directly before the Add button
  // In mobile view: icon only. In desktop view: icon + label
  const customActions = (
    <Button
      type="button"
      variant={isSpecialDay ? "default" : "outline"}
      size="sm"
      onClick={handleToggleSpecialDay}
      disabled={isToggling}
      className={cn(
        "h-9 w-9 sm:w-auto p-0 sm:px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shrink-0 select-none",
        isSpecialDay
          ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-600 shadow-sm"
          : "hover:bg-muted text-foreground border-border"
      )}
      title={
        isSpecialDay
          ? "Special Day is ON. Click to turn OFF."
          : "Special Day is OFF. Click to turn ON."
      }
      aria-label={
        isSpecialDay
          ? "Turn off Special Day"
          : "Turn on Special Day"
      }
    >
      {isToggling ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles
          className={cn(
            "h-4 w-4 shrink-0",
            isSpecialDay ? "text-amber-200 fill-amber-200" : "text-amber-500"
          )}
        />
      )}
      <span className="hidden sm:inline">
        Special Day: {isSpecialDay ? "ON" : "OFF"}
      </span>
    </Button>
  );

  return (
    <>
      <Header
        title="PERIODS MANAGEMENT"
        subTitle={
          isSpecialDay
            ? "Special Day Timetable is Currently Active"
            : "Organize and Oversee Periods"
        }
      />

      <DynamicDataTable
        key={`${isSpecialDay}-${refreshKey}`}
        resource="periods"
        initialData={[]}
        columnsConfig={columnsConfig}
        formFields={formFields}
        apiKey={apiKey}
        createFormTitle={
          isSpecialDay
            ? "Add New Period (Special Day)"
            : "Add New Period"
        }
        editFormTitle={
          isSpecialDay
            ? "Edit Period (Special Day)"
            : "Edit Period"
        }
        deleteFormTitle={
          isSpecialDay
            ? "Delete Special Day Period"
            : "Delete Period"
        }
        createSuccessMessage={
          isSpecialDay
            ? "Special Day period added successfully!"
            : "Period added successfully!"
        }
        editSuccessMessage={
          isSpecialDay
            ? "Special Day period updated successfully!"
            : "Period updated successfully!"
        }
        deleteSuccessMessage={
          isSpecialDay
            ? "Special Day period deleted successfully!"
            : "Period deleted successfully!"
        }
        filterConfig={filterConfig}
        limit={20}
        enableSearch={true}
        defaultSorting={[{ id: "periodNumber", desc: false }]}
        apiFilters={{
          isSpecialDay: isSpecialDay ? "true" : "false",
        }}
        additionalProps={{
          isSpecialDay: isSpecialDay,
          customActions: customActions,
        }}
      />
    </>
  );
}
