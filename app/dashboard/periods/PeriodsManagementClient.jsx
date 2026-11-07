"use client";

import { useState, useEffect, useMemo } from "react";
import DynamicDataTable from "@/components/DynamicDataTable";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ConfirmationPopup from "@/components/ConfirmationPopup";
import {
  Loader2,
  CalendarDays,
  Plus,
  Trash2,
  Check,
  X,
  Pencil,
  Clock,
} from "lucide-react";
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
  { accessorKey: "periodNumber", header: "Period", minWidth: 80 },
  { accessorKey: "startTime", header: "Start Time", type: ["time"], minWidth: 120 },
  { accessorKey: "endTime", header: "End Time", type: ["time"], minWidth: 120 },
];

const formFields = [
  {
    name: "periodNumber",
    label: "Period",
    type: "number",
    placeholder: "Period",
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
  { id: "periodNumber", label: "Period" },
  { id: "startTime", label: "Start Time" },
  { id: "endTime", label: "End Time" },
];

function addMinutesToTime(timeStr, minutesToAdd = 30) {
  if (!timeStr || typeof timeStr !== "string") return "";
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) return "";
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return "";

  const totalMinutes = (h * 60 + m + minutesToAdd + 24 * 60) % (24 * 60);
  const newH = Math.floor(totalMinutes / 60);
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

function getDurationMinutes(startTime, endTime) {
  if (!startTime || !endTime) return null;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return null;
  let diff = eh * 60 + em - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return diff;
}

export default function PeriodsManagementClient({
  apiKey,
  initialActiveSchedule,
  initialSchedules = [],
  initialAutoThursdaySchedule = false,
}) {
  const [schedules, setSchedules] = useState(
    initialSchedules.length > 0
      ? initialSchedules
      : [
        { id: "normal", name: "Normal Schedule", isDefault: true },
        { id: "thursday", name: "Thursday Schedule", isDefault: true },
      ]
  );
  const [activeScheduleId, setActiveScheduleId] = useState(
    initialActiveSchedule || "normal"
  );
  // Schedule currently being viewed/edited in the table (allows editing without changing active schedule)
  const [selectedScheduleId, setSelectedScheduleId] = useState(
    initialActiveSchedule || "normal"
  );
  const [autoThursdaySchedule, setAutoThursdaySchedule] = useState(
    Boolean(initialAutoThursdaySchedule)
  );

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newScheduleName, setNewScheduleName] = useState("");
  const [copyFromScheduleId, setCopyFromScheduleId] = useState("");
  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  const [isDeletingSchedule, setIsDeletingSchedule] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // States for Edit Periods popup modal
  const [editingScheduleForPeriods, setEditingScheduleForPeriods] = useState(null);
  const [periodRows, setPeriodRows] = useState([]);
  const [is30MinMode, setIs30MinMode] = useState(true);
  const [isLoadingPeriods, setIsLoadingPeriods] = useState(false);
  const [isSavingPeriods, setIsSavingPeriods] = useState(false);

  // Fetch latest schedules and period counts when popup opens
  const fetchSchedules = async () => {
    try {
      const res = await fetch("/api/periods/schedules", {
        headers: { "api-key": apiKey },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.schedules) {
          setSchedules(data.schedules);
        }
        if (data.activeSchedule) {
          setActiveScheduleId(data.activeSchedule);
        }
        if (data.autoThursdaySchedule !== undefined) {
          setAutoThursdaySchedule(Boolean(data.autoThursdaySchedule));
        }
      }
    } catch (err) {
      console.error("Error fetching schedules:", err);
    }
  };

  useEffect(() => {
    if (isScheduleModalOpen) {
      fetchSchedules();
    }
  }, [isScheduleModalOpen]);

  const activeScheduleObj = useMemo(() => {
    return (
      schedules.find((s) => s.id === activeScheduleId) || {
        id: activeScheduleId,
        name: activeScheduleId === "thursday" ? "Thursday Schedule" : "Normal Schedule",
      }
    );
  }, [schedules, activeScheduleId]);

  const selectedScheduleObj = useMemo(() => {
    return (
      schedules.find((s) => s.id === selectedScheduleId) ||
      activeScheduleObj || {
        id: selectedScheduleId,
        name: selectedScheduleId === "thursday" ? "Thursday Schedule" : "Normal Schedule",
      }
    );
  }, [schedules, selectedScheduleId, activeScheduleObj]);

  // Activate a schedule globally for the college
  const handleActivateSchedule = async (scheduleId) => {
    try {
      setIsActivating(true);
      const res = await fetch("/api/periods/schedules", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({ activeSchedule: scheduleId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to update active schedule");
      }

      const data = await res.json();
      setActiveScheduleId(scheduleId);
      setSelectedScheduleId(scheduleId);
      setRefreshKey((prev) => prev + 1);

      toast.success(
        `"${data.activeScheduleName || scheduleId}" is now active!`
      );
    } catch (err) {
      console.error("Error activating schedule:", err);
      toast.error(err.message || "Failed to activate schedule");
    } finally {
      setIsActivating(false);
    }
  };

  // Determine if the schedule currently being edited is a 30 Minutes Schedule
  const is30MinutesSchedule = useMemo(() => {
    if (!editingScheduleForPeriods) return false;
    return (
      /30/i.test(editingScheduleForPeriods.name || "") ||
      /30/i.test(editingScheduleForPeriods.id || "")
    );
  }, [editingScheduleForPeriods]);

  // Open Edit Periods modal for a schedule without selecting/activating it
  const handleOpenEditPeriods = async (schedule) => {
    setEditingScheduleForPeriods(schedule);
    setIsScheduleModalOpen(false);

    // Auto-detect 30-min schedule mode from schedule name or id
    const is30 =
      /30/i.test(schedule.name || "") || /30/i.test(schedule.id || "");
    setIs30MinMode(is30);

    try {
      setIsLoadingPeriods(true);
      const res = await fetch(`/api/periods?schedule=${schedule.id}&limit=100`, {
        headers: { "api-key": apiKey },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.periods && data.periods.length > 0) {
          const sorted = [...data.periods].sort(
            (a, b) => a.periodNumber - b.periodNumber
          );
          setPeriodRows(
            sorted.map((p, idx) => ({
              periodNumber: p.periodNumber || idx + 1,
              startTime: p.startTime || "",
              endTime: p.endTime || "",
            }))
          );
        } else {
          // Default 5 period template
          setPeriodRows([
            { periodNumber: 1, startTime: "", endTime: "" },
            { periodNumber: 2, startTime: "", endTime: "" },
            { periodNumber: 3, startTime: "", endTime: "" },
            { periodNumber: 4, startTime: "", endTime: "" },
            { periodNumber: 5, startTime: "", endTime: "" },
          ]);
        }
      }
    } catch (err) {
      console.error("Error loading periods for schedule:", err);
      toast.error("Failed to load periods for this schedule");
    } finally {
      setIsLoadingPeriods(false);
    }
  };

  // Calculation when start time changes:
  // In 30 Minutes schedule: sets 30m for that period and cascades to all after it.
  // In other schedules: if this period had a duration, shifts end time and cascades to next period until changed manually.
  const handleStartTimeChange = (index, newStartTime) => {
    setPeriodRows((prev) => {
      const updated = prev.map((p) => ({ ...p }));
      const oldStartTime = updated[index].startTime;
      updated[index].startTime = newStartTime;

      if (!/^\d{2}:\d{2}$/.test(newStartTime)) {
        return updated;
      }

      if (is30MinutesSchedule) {
        // Set this period's end time to +30 minutes
        const newEndTime = addMinutesToTime(newStartTime, 30);
        updated[index].endTime = newEndTime;

        // Cascade 30 minutes to all periods AFTER this period
        let currentEnd = newEndTime;
        for (let i = index + 1; i < updated.length; i++) {
          updated[i].startTime = currentEnd;
          updated[i].endTime = addMinutesToTime(currentEnd, 30);
          currentEnd = updated[i].endTime;
        }
      } else {
        // In other schedules: if this period already had a duration, shift its endTime and cascade
        const currentDuration = getDurationMinutes(oldStartTime, updated[index].endTime);
        if (currentDuration && currentDuration > 0) {
          const oldEnd = updated[index].endTime;
          const newEnd = addMinutesToTime(newStartTime, currentDuration);
          updated[index].endTime = newEnd;

          let prevEnd = newEnd;
          let priorOldEnd = oldEnd;
          for (let i = index + 1; i < updated.length; i++) {
            if (updated[i].startTime === priorOldEnd) {
              const nextDur = getDurationMinutes(updated[i].startTime, updated[i].endTime);
              priorOldEnd = updated[i].endTime;
              updated[i].startTime = prevEnd;
              if (nextDur && nextDur > 0) {
                updated[i].endTime = addMinutesToTime(prevEnd, nextDur);
                prevEnd = updated[i].endTime;
              } else {
                break;
              }
            } else {
              break;
            }
          }
        }
      }

      return updated;
    });
  };

  // Calculation when end time changes manually:
  // In 30 Minutes schedule: cascades 30 minutes to all periods after this period starting from newEndTime.
  // In other schedules: sets start time of next period automatically from end time of previous period until changed manually.
  const handleEndTimeChange = (index, newEndTime) => {
    setPeriodRows((prev) => {
      const updated = prev.map((p) => ({ ...p }));
      const oldEndTime = updated[index].endTime;
      updated[index].endTime = newEndTime;

      if (!/^\d{2}:\d{2}$/.test(newEndTime)) {
        return updated;
      }

      if (is30MinutesSchedule) {
        let currentEnd = newEndTime;
        for (let i = index + 1; i < updated.length; i++) {
          updated[i].startTime = currentEnd;
          updated[i].endTime = addMinutesToTime(currentEnd, 30);
          currentEnd = updated[i].endTime;
        }
      } else {
        // Other schedule: set next period start time automatically from previous end time
        let prevEnd = newEndTime;
        let priorOldEnd = oldEndTime;

        for (let i = index + 1; i < updated.length; i++) {
          const nextStart = updated[i].startTime;
          // If next period's start was empty or matched previous period's old end time, update it automatically
          const shouldUpdate = !nextStart || (priorOldEnd && nextStart === priorOldEnd);

          if (shouldUpdate) {
            const nextDur = getDurationMinutes(updated[i].startTime, updated[i].endTime);
            priorOldEnd = updated[i].endTime;
            updated[i].startTime = prevEnd;

            if (nextDur && nextDur > 0) {
              updated[i].endTime = addMinutesToTime(prevEnd, nextDur);
              prevEnd = updated[i].endTime;
            } else {
              break;
            }
          } else {
            // User manually set this period's start time to something else, stop cascading
            break;
          }
        }
      }

      return updated;
    });
  };

  // Add a new period row
  const handleAddPeriod = () => {
    setPeriodRows((prev) => {
      const nextNum = prev.length + 1;
      const last = prev[prev.length - 1];
      let nextStart = "";
      let nextEnd = "";

      if (last && last.endTime) {
        nextStart = last.endTime;
        if (is30MinutesSchedule) {
          nextEnd = addMinutesToTime(nextStart, 30);
        }
      }

      return [
        ...prev,
        {
          periodNumber: nextNum,
          startTime: nextStart,
          endTime: nextEnd,
        },
      ];
    });
  };

  // Remove a period row
  const handleRemovePeriod = (index) => {
    setPeriodRows((prev) => {
      if (prev.length <= 1) {
        toast.error("At least one period is required");
        return prev;
      }
      const filtered = prev.filter((_, i) => i !== index);
      const reindexed = filtered.map((p, i) => ({
        ...p,
        periodNumber: i + 1,
      }));

      // In 30-min schedule: cascade forward with 30m intervals
      if (is30MinutesSchedule && index < reindexed.length) {
        const prevPeriod = index > 0 ? reindexed[index - 1] : null;
        if (prevPeriod && prevPeriod.endTime) {
          let currentEnd = prevPeriod.endTime;
          for (let i = index; i < reindexed.length; i++) {
            reindexed[i].startTime = currentEnd;
            reindexed[i].endTime = addMinutesToTime(currentEnd, 30);
            currentEnd = reindexed[i].endTime;
          }
        }
      } else if (!is30MinutesSchedule && index < reindexed.length) {
        // Other schedule: set next period's start time to previous period's end time
        const prevPeriod = index > 0 ? reindexed[index - 1] : null;
        if (prevPeriod && prevPeriod.endTime) {
          reindexed[index].startTime = prevPeriod.endTime;
        }
      }

      return reindexed;
    });
  };

  // Toggle 30-minute mode
  const handleToggle30MinMode = () => {
    const nextMode = !is30MinMode;
    setIs30MinMode(nextMode);

    if (nextMode) {
      setPeriodRows((prev) => {
        if (!prev || prev.length === 0 || !prev[0].startTime) return prev;
        const updated = prev.map((p) => ({ ...p }));
        let currentEnd = addMinutesToTime(updated[0].startTime, 30);
        updated[0].endTime = currentEnd;
        for (let i = 1; i < updated.length; i++) {
          updated[i].startTime = currentEnd;
          updated[i].endTime = addMinutesToTime(currentEnd, 30);
          currentEnd = updated[i].endTime;
        }
        return updated;
      });
      toast.info("30 Minutes auto-calculation enabled");
    } else {
      toast.info("Manual timing mode enabled");
    }
  };

  // Save all periods for editingScheduleForPeriods
  const handleSavePeriods = async () => {
    if (!editingScheduleForPeriods) return;

    if (periodRows.length === 0) {
      toast.error("Please add at least one period");
      return;
    }

    // Validate periods
    for (const p of periodRows) {
      if (!p.startTime || !p.endTime) {
        toast.error(
          `Period ${p.periodNumber}: Please specify both start time and end time`
        );
        return;
      }

      const sDate = new Date(`2000-01-01T${p.startTime}`);
      const eDate = new Date(`2000-01-01T${p.endTime}`);
      if (sDate >= eDate) {
        toast.error(
          `Period ${p.periodNumber}: Start time must be before end time`
        );
        return;
      }
    }

    // Sequence / overlap validation
    for (let i = 1; i < periodRows.length; i++) {
      const prev = periodRows[i - 1];
      const curr = periodRows[i];
      const prevEnd = new Date(`2000-01-01T${prev.endTime}`);
      const currStart = new Date(`2000-01-01T${curr.startTime}`);
      if (currStart < prevEnd) {
        toast.error(
          `Period ${curr.periodNumber} (${curr.startTime}) cannot start before Period ${prev.periodNumber} ends (${prev.endTime})`
        );
        return;
      }
    }

    try {
      setIsSavingPeriods(true);
      const res = await fetch("/api/periods", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({
          schedule: editingScheduleForPeriods.id,
          periods: periodRows.map((p) => ({
            periodNumber: p.periodNumber,
            startTime: p.startTime,
            endTime: p.endTime,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to save periods");
      }

      toast.success(
        `Periods for "${editingScheduleForPeriods.name}" saved successfully!`
      );
      setEditingScheduleForPeriods(null);
      setRefreshKey((prev) => prev + 1);
      fetchSchedules();
    } catch (err) {
      console.error("Error saving periods:", err);
      toast.error(err.message || "Failed to save periods");
    } finally {
      setIsSavingPeriods(false);
    }
  };

  // Toggle auto Thursday schedule (when ON, Thursday schedule is automatically active on all Thursdays)
  const handleToggleAutoThursday = async (e) => {
    e?.stopPropagation();
    const nextState = !autoThursdaySchedule;
    setAutoThursdaySchedule(nextState);

    try {
      const res = await fetch("/api/periods/schedules", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({ autoThursdaySchedule: nextState }),
      });

      if (!res.ok) {
        throw new Error("Failed to update auto Thursday schedule setting");
      }

      toast.success(
        nextState
          ? "Thursday Schedule is ON for all Thursdays (active even when another schedule is selected)."
          : "Thursday Schedule auto-activation is OFF (active only when selected)."
      );
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error("Error updating auto Thursday schedule:", err);
      setAutoThursdaySchedule(!nextState);
      toast.error(err.message || "Failed to update setting");
    }
  };

  // Create a new schedule
  const handleCreateSchedule = async (e) => {
    e?.preventDefault();
    if (!newScheduleName.trim()) {
      toast.error("Please enter a schedule name");
      return;
    }

    try {
      setIsCreatingSchedule(true);
      const res = await fetch("/api/periods/schedules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({
          name: newScheduleName.trim(),
          copyFromScheduleId: copyFromScheduleId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to create schedule");
      }

      toast.success(`Schedule "${newScheduleName.trim()}" created successfully!`);
      setNewScheduleName("");
      setCopyFromScheduleId("");
      setShowAddForm(false);

      if (data.schedules) {
        setSchedules(data.schedules);
      }
      if (data.schedule?.id) {
        setActiveScheduleId(data.schedule.id);
        setSelectedScheduleId(data.schedule.id);
      }
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error("Error creating schedule:", err);
      toast.error(err.message || "Failed to create schedule");
    } finally {
      setIsCreatingSchedule(false);
    }
  };

  // Delete a schedule handler confirmed through ConfirmationPopup
  const handleConfirmDelete = async () => {
    if (!scheduleToDelete) return;

    try {
      setIsDeletingSchedule(true);
      const res = await fetch("/api/periods/schedules", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({ id: scheduleToDelete.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to delete schedule");
      }

      toast.success(`Schedule "${scheduleToDelete.name}" deleted successfully`);
      if (data.schedules) {
        setSchedules(data.schedules);
      }
      if (data.activeSchedule) {
        setActiveScheduleId(data.activeSchedule);
        if (selectedScheduleId === scheduleToDelete.id) {
          setSelectedScheduleId(data.activeSchedule);
        }
      }
      setRefreshKey((prev) => prev + 1);
      setScheduleToDelete(null);
    } catch (err) {
      console.error("Error deleting schedule:", err);
      toast.error(err.message || "Failed to delete schedule");
      throw err;
    } finally {
      setIsDeletingSchedule(false);
    }
  };

  // Action buttons placed directly before the Add Period button
  const customActions = (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => handleOpenEditPeriods(selectedScheduleObj)}
        className="h-9 px-2.5 sm:px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shrink-0 select-none hover:bg-muted text-foreground border-border shadow-xs cursor-pointer"
        title={`Edit ${selectedScheduleObj.name}`}
      >
        <Pencil className="h-4 w-4 shrink-0 text-primary" />
        <span className="hidden sm:inline">Edit</span>
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsScheduleModalOpen(true)}
        disabled={isActivating}
        className="h-9 px-2.5 sm:px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shrink-0 select-none hover:bg-muted text-foreground border-border shadow-xs cursor-pointer"
        title="Manage Schedule"
        aria-label="Manage Schedule"
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
        <span className="hidden sm:inline">Manage Schedule</span>
      </Button>
    </div>
  );

  return (
    <>
      <Header
        title="PERIODS MANAGEMENT"
        subTitle={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsScheduleModalOpen(true)}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-left text-sm"
              title="Click to select or manage schedule"
            >
              <span>Schedule: </span>
              <span className="font-semibold text-foreground">
                {selectedScheduleObj.name}
              </span>
              {selectedScheduleId === activeScheduleId ? (
                <span className="ml-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  (Active)
                </span>
              ) : (
                <span className="ml-1.5 text-xs text-amber-600 dark:text-amber-400 font-bold">
                  (Not Active)
                </span>
              )}
            </button>
            {selectedScheduleId !== activeScheduleId && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleActivateSchedule(selectedScheduleId)}
                disabled={isActivating}
                className="h-6 text-[11px] px-2 font-semibold text-primary border-primary/30 hover:bg-primary/10 cursor-pointer"
              >
                Set as Active
              </Button>
            )}
          </div>
        }
      />

      {/* Main Periods DataTable */}
      <DynamicDataTable
        key={`${selectedScheduleId}-${refreshKey}`}
        resource="periods"
        initialData={[]}
        columnsConfig={columnsConfig}
        formFields={formFields}
        apiKey={apiKey}
        createFormTitle={`Add New Period (${selectedScheduleObj.name})`}
        editFormTitle={`Edit Period (${selectedScheduleObj.name})`}
        deleteFormTitle={`Delete Period (${selectedScheduleObj.name})`}
        createSuccessMessage={`Period added to "${selectedScheduleObj.name}" successfully!`}
        editSuccessMessage={`Period updated in "${selectedScheduleObj.name}" successfully!`}
        deleteSuccessMessage={`Period deleted from "${selectedScheduleObj.name}" successfully!`}
        filterConfig={filterConfig}
        limit={20}
        enableSearch={true}
        defaultSorting={[{ id: "periodNumber", desc: false }]}
        apiFilters={{
          schedule: selectedScheduleId,
        }}
        additionalProps={{
          schedule: selectedScheduleId,
          isSpecialDay: selectedScheduleId !== "normal",
          customActions: customActions,
        }}
      />

      {/* Schedule Selection Popup Dialog */}
      <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
        <DialogContent className="rounded-2xl sm:rounded-2xl overflow-hidden max-w-lg max-h-[85vh] [&>button.absolute]:hidden flex flex-col p-0 gap-0">
          <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md shrink-0">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div className="flex-1 text-left space-y-0.5 min-w-0">
              <DialogTitle className="text-xl font-bold m-0 text-foreground">
                Select Schedule
              </DialogTitle>
              <DialogDescription asChild>
                <div className="text-sm text-muted-foreground m-0">
                  Select active schedule.
                </div>
              </DialogDescription>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <DialogClose className="p-1.5 -mr-1.5 ml-1 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none">
                <X className="h-5 w-5" />
              </DialogClose>
            </div>
          </DialogHeader>

          <div className="p-5 overflow-y-auto flex-1 min-h-0 space-y-4 max-h-[calc(85vh-75px)]">
            {/* Header row with bordered Add Schedule button */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Schedules ({schedules.length})
              </span>
              {!showAddForm && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddForm(true)}
                  className="h-8 text-xs font-semibold border border-border shadow-xs gap-1.5 px-3 hover:bg-muted"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Schedule
                </Button>
              )}
            </div>

            {/* Add Schedule Form */}
            {showAddForm && (
              <form
                onSubmit={handleCreateSchedule}
                className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5 text-primary" />
                    New Schedule
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewScheduleName("");
                      setCopyFromScheduleId("");
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">
                    Schedule Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Friday Schedule, Ramadan Schedule"
                    value={newScheduleName}
                    onChange={(e) => setNewScheduleName(e.target.value)}
                    className="h-9 text-xs"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">
                    Copy periods from (optional)
                  </label>
                  <Select
                    value={copyFromScheduleId || "none"}
                    onValueChange={(val) =>
                      setCopyFromScheduleId(val === "none" ? "" : val)
                    }
                  >
                    <SelectTrigger className="w-full h-9 text-xs">
                      <SelectValue placeholder="Start with empty periods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Start with empty periods</SelectItem>
                      {schedules.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          Copy from {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewScheduleName("");
                      setCopyFromScheduleId("");
                    }}
                    disabled={isCreatingSchedule}
                    className="h-8 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isCreatingSchedule || !newScheduleName.trim()}
                    className="h-8 text-xs font-semibold"
                  >
                    {isCreatingSchedule ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        Creating...
                      </>
                    ) : (
                      "Create"
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* Schedules list */}
            <div className="space-y-2">
              {schedules.map((schedule) => {
                const isActive = schedule.id === activeScheduleId;

                return (
                  <div
                    key={schedule.id}
                    onClick={() => !isActive && handleActivateSchedule(schedule.id)}
                    className={cn(
                      "p-3 rounded-xl border transition-all flex items-center justify-between gap-3",
                      isActive
                        ? "bg-primary/5 border-primary shadow-xs"
                        : "bg-card border-border hover:bg-muted/50 cursor-pointer"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                          isActive
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40 bg-transparent"
                        )}
                      >
                        {isActive && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">
                            {schedule.name}
                          </span>
                          {schedule.id === "thursday" && (
                            <button
                              type="button"
                              onClick={handleToggleAutoThursday}
                              className={cn(
                                "px-2 py-0.5 text-[11px] font-bold rounded-full border transition-all cursor-pointer flex items-center gap-1 select-none",
                                autoThursdaySchedule
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs hover:bg-emerald-700"
                                  : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                              )}
                              title={
                                autoThursdaySchedule
                                  ? "Auto on all Thursdays is ON. Click to turn OFF."
                                  : "Auto on all Thursdays is OFF. Click to turn ON."
                              }
                            >
                              <span>All Thursdays:</span>
                              <span
                                className={cn(
                                  "px-1 rounded text-[10px] font-extrabold",
                                  autoThursdaySchedule
                                    ? "bg-emerald-700 text-white"
                                    : "bg-background text-foreground border border-border/50"
                                )}
                              >
                                {autoThursdaySchedule ? "ON" : "OFF"}
                              </span>
                            </button>
                          )}
                        </div>
                        {schedule.id === "thursday" && autoThursdaySchedule ? (
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                            Active on all Thursdays
                          </p>
                        ) : schedule.periodsCount !== undefined ? (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {schedule.periodsCount}{" "}
                            {schedule.periodsCount === 1 ? "period" : "periods"}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isActive ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActivateSchedule(schedule.id);
                          }}
                          disabled={isActivating}
                          className="h-8 text-xs font-semibold cursor-pointer"
                        >
                          {isActivating ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            "Select"
                          )}
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 px-2 py-1">
                          <Check className="h-4 w-4" />
                          <span>Active</span>
                        </div>
                      )}

                      {/* Other than normal schedule can be deleted */}
                      {schedule.id !== "normal" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setScheduleToDelete(schedule);
                          }}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                          title={`Delete ${schedule.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Edit Periods button after Delete button (allows editing periods without selecting schedule) */}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditPeriods(schedule);
                        }}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg cursor-pointer"
                        title={`Edit periods for ${schedule.name} without selecting`}
                        aria-label={`Edit periods for ${schedule.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Periods Modal Dialog (Allows editing periods without selecting/activating schedule) */}
      <Dialog
        open={Boolean(editingScheduleForPeriods)}
        onOpenChange={(open) => {
          if (!open) setEditingScheduleForPeriods(null);
        }}
      >
        <DialogContent className="rounded-2xl sm:rounded-2xl overflow-hidden max-w-xl max-h-[88vh] [&>button.absolute]:hidden flex flex-col p-0 gap-0">
          <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-4 sm:px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md shrink-0">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div className="flex-1 text-left space-y-0.5 min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-bold m-0 text-foreground truncate">
                Edit — {editingScheduleForPeriods?.name}
              </DialogTitle>
              <DialogDescription asChild>
                <div className="text-xs text-muted-foreground m-0">
                  Configure period timings for this schedule.
                </div>
              </DialogDescription>
            </div>
            <div className="flex items-center gap-1">
              <DialogClose className="p-1.5 -mr-1.5 ml-1 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer">
                <X className="h-5 w-5" />
              </DialogClose>
            </div>
          </DialogHeader>

          <div className="p-3 sm:p-5 overflow-y-auto flex-1 min-h-0 space-y-4 max-h-[calc(88vh-130px)]">
            {/* 30-Minute Schedule Mode Toggle (Only in 30 Minutes Schedule) */}
            {is30MinutesSchedule && (
              <div className="p-3 rounded-xl border border-border bg-muted/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Clock className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-foreground">
                        30 Minutes Schedule Mode
                      </span>
                      {is30MinMode && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Set 30-min duration for all subsequent periods.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggle30MinMode}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-bold rounded-full border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 select-none",
                    is30MinMode
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  )}
                  title={
                    is30MinMode
                      ? "30 minutes auto-calculation is ON. Click to turn OFF."
                      : "30 minutes auto-calculation is OFF. Click to turn ON."
                  }
                >
                  <span>30m:</span>
                  <span className="uppercase text-[10px] font-extrabold">
                    {is30MinMode ? "ON" : "OFF"}
                  </span>
                </button>
              </div>
            )}

            {/* Loading state or period rows */}
            {isLoadingPeriods ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs">Loading periods...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Single unified table container for all periods without separate cards */}
                <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs divide-y divide-border">
                  {/* Table Header */}
                  <div className="bg-muted/50 px-2 sm:px-3 py-2 sm:py-2.5 flex items-center gap-1.5 sm:gap-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <div className="w-10 sm:w-12 shrink-0 text-center">Period</div>
                    <div className="flex-1 grid grid-cols-2 gap-1.5 sm:gap-3 min-w-0">
                      <div>Start Time</div>
                      <div>End Time</div>
                    </div>
                    <div className="w-8 sm:w-10 shrink-0 text-right">
                      <span className="hidden sm:inline">Action</span>
                    </div>
                  </div>

                  {/* Table Rows - all periods in a single column */}
                  <div className="divide-y divide-border">
                    {periodRows.map((period, index) => {
                      const duration = getDurationMinutes(
                        period.startTime,
                        period.endTime
                      );
                      const isInvalid =
                        period.startTime &&
                        period.endTime &&
                        period.startTime >= period.endTime;

                      return (
                        <div
                          key={index}
                          className={cn(
                            "px-2 sm:px-3 py-2 flex items-center gap-1.5 sm:gap-3 transition-colors hover:bg-muted/30",
                            isInvalid && "bg-destructive/10"
                          )}
                        >
                          <div className="w-10 sm:w-12 shrink-0 flex flex-col items-center justify-center text-center">
                            <span className="font-bold text-xs sm:text-sm text-foreground leading-tight">
                              {period.periodNumber}
                            </span>
                            {duration !== null && (
                              <span
                                className={cn(
                                  "text-[10px] font-semibold mt-0.5 leading-tight px-1 py-0.2 rounded",
                                  duration === 30
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "text-muted-foreground"
                                )}
                              >
                                {duration}m
                              </span>
                            )}
                          </div>

                          <div className="flex-1 grid grid-cols-2 gap-1.5 sm:gap-3 min-w-0">
                            <Input
                              type="time"
                              value={period.startTime || ""}
                              onChange={(e) =>
                                handleStartTimeChange(index, e.target.value)
                              }
                              className="h-8 px-1.5 sm:px-2.5 text-xs bg-background w-full"
                              required
                              aria-label={`Period ${period.periodNumber} Start Time`}
                            />
                            <Input
                              type="time"
                              value={period.endTime || ""}
                              onChange={(e) =>
                                handleEndTimeChange(index, e.target.value)
                              }
                              className="h-8 px-1.5 sm:px-2.5 text-xs bg-background w-full"
                              required
                              aria-label={`Period ${period.periodNumber} End Time`}
                            />
                          </div>

                          <div className="flex items-center justify-end shrink-0 w-8 sm:w-10">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemovePeriod(index)}
                              disabled={periodRows.length <= 1}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md cursor-pointer"
                              title={`Remove Period ${period.periodNumber}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Add Period row button */}
                <div className="pt-1 flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddPeriod}
                    className="h-8 text-xs font-semibold gap-1.5 border-dashed border-border hover:bg-muted cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Period {periodRows.length + 1}
                  </Button>

                  {is30MinutesSchedule && periodRows.length > 0 && periodRows[0].startTime && (
                    <button
                      type="button"
                      onClick={() => {
                        const start = periodRows[0].startTime;
                        handleStartTimeChange(0, start);
                        toast.success("Re-calculated all periods with 30m intervals");
                      }}
                      className="text-[11px] text-primary hover:underline cursor-pointer font-medium"
                    >
                      Re-apply 30m cascade
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t bg-muted/20 flex items-center justify-between gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingScheduleForPeriods(null)}
              disabled={isSavingPeriods}
              className="h-9 text-xs cursor-pointer"
            >
              Cancel
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSavePeriods}
              disabled={isSavingPeriods || isLoadingPeriods || periodRows.length === 0}
              className="h-9 text-xs font-semibold px-4 gap-1.5 cursor-pointer"
            >
              {isSavingPeriods ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Save Periods
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Same standard Delete Confirmation Popup as other pages */}
      <ConfirmationPopup
        open={Boolean(scheduleToDelete)}
        onOpenChange={(open) => !open && setScheduleToDelete(null)}
        onClick={handleConfirmDelete}
        loading={isDeletingSchedule}
        title={`Delete ${scheduleToDelete?.name || "Schedule"}`}
        description={`Are you sure you want to delete "${scheduleToDelete?.name}"? All periods configured under this schedule will also be permanently deleted.`}
        action="delete"
      />
    </>
  );
}
