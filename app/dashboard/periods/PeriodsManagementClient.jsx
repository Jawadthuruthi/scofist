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

  // Activate a schedule
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

  // Manage schedule button placed directly before the Add Period button
  const customActions = (
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
  );

  return (
    <>
      <Header
        title="PERIODS MANAGEMENT"
        subTitle={
          <button
            type="button"
            onClick={() => setIsScheduleModalOpen(true)}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-left"
            title="Click to select schedule"
          >
            {activeScheduleObj.name} is Active
          </button>
        }
      />

      {/* Main Periods DataTable */}
      <DynamicDataTable
        key={`${activeScheduleId}-${refreshKey}`}
        resource="periods"
        initialData={[]}
        columnsConfig={columnsConfig}
        formFields={formFields}
        apiKey={apiKey}
        createFormTitle={`Add New Period (${activeScheduleObj.name})`}
        editFormTitle={`Edit Period (${activeScheduleObj.name})`}
        deleteFormTitle={`Delete Period (${activeScheduleObj.name})`}
        createSuccessMessage={`Period added to "${activeScheduleObj.name}" successfully!`}
        editSuccessMessage={`Period updated in "${activeScheduleObj.name}" successfully!`}
        deleteSuccessMessage={`Period deleted from "${activeScheduleObj.name}" successfully!`}
        filterConfig={filterConfig}
        limit={20}
        enableSearch={true}
        defaultSorting={[{ id: "periodNumber", desc: false }]}
        apiFilters={{
          schedule: activeScheduleId,
        }}
        additionalProps={{
          schedule: activeScheduleId,
          isSpecialDay: activeScheduleId !== "normal",
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

                    <div className="flex items-center gap-2 shrink-0">
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
                          className="h-8 text-xs font-semibold"
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
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                          title={`Delete ${schedule.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
