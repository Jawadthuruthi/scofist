"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  UserCheck,
  Plus,
  Trash2,
  Loader,
  CheckCircle,
  Clock,
  Users,
  BookOpen,
  Filter,
  Pencil,
  Bell,
  X,
  AlertTriangle,
} from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";
import { formatOptions } from "@/lib/utils";
import { useRef } from "react";

const JudgeNameInput = ({ value, onChange, placeholder, savedNames, onRemove }) => {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={onChange}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        placeholder={placeholder}
      />
      {isOpen && savedNames.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border shadow-md rounded-md max-h-60 overflow-auto">
          {savedNames.map((name) => (
            <div
              key={name}
              className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted"
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent blur
                onChange({ target: { value: name } });
                setIsOpen(false);
              }}
            >
              <span className="text-sm">{name}</span>
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive p-1 rounded-md"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onRemove(name, e);
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const JudgesManagement = ({
  programs = [],
  divisions = [],
  judges = [],
  apiKey,
  activeYear,
  userId,
}) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedJudgeNames, setSavedJudgeNames] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem("savedJudgeNames");
    if (saved) {
      try {
        setSavedJudgeNames(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const addSavedName = useCallback((name) => {
    if (!name || !name.trim()) return;
    setSavedJudgeNames((prev) => {
      if (prev.includes(name.trim())) return prev;
      const newSaved = [...prev, name.trim()];
      localStorage.setItem("savedJudgeNames", JSON.stringify(newSaved));
      return newSaved;
    });
  }, []);

  const removeSavedName = useCallback((nameToRemove, e) => {
    if (e) e.stopPropagation();
    setSavedJudgeNames((prev) => {
      const newSaved = prev.filter((n) => n !== nameToRemove);
      localStorage.setItem("savedJudgeNames", JSON.stringify(newSaved));
      return newSaved;
    });
  }, []);

  // Row selection state
  const [selectedRows, setSelectedRows] = useState(new Set());

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editJudgeId, setEditJudgeId] = useState("");
  const [editJudgeName, setEditJudgeName] = useState("");
  const [editJudgeNumber, setEditJudgeNumber] = useState("");

  // Add form state
  const [newJudges, setNewJudges] = useState([{ id: "", name: "", number: "" }]);
  const [currentJudgeIndex, setCurrentJudgeIndex] = useState(0);

  const updateNewJudge = (index, field, value) => {
    const updated = [...newJudges];
    updated[index] = { ...updated[index], [field]: value };
    setNewJudges(updated);
  };

  // Alert dialog state
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [alertAssignment, setAlertAssignment] = useState(null);
  const [alertMessage, setAlertMessage] = useState("");

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAssignmentTarget, setDeleteAssignmentTarget] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const openDeleteDialog = (assignment) => {
    setDeleteAssignmentTarget(assignment);
    setDeleteConfirmText("");
    setDeleteDialogOpen(true);
  };

  const filteredPrograms = programs.filter(
    (p) => !selectedDivision || p.divisionId === selectedDivision
  );

  const fetchAssignments = useCallback(async (isPolling = false) => {
    if (!isPolling) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedProgram) params.append("programId", selectedProgram);
      if (selectedDivision) params.append("divisionId", selectedDivision);
      if (activeYear) params.append("year", activeYear);
      const res = await fetch(`/api/judge-assignments?${params}`, {
        headers: { "api-key": apiKey },
      });
      const data = await res.json();
      if (data.success) {
        setAssignments(data.assignments);
      } else {
        if (!isPolling) toast.error(data.message || "Failed to load assignments");
      }
    } catch {
      if (!isPolling) toast.error("Failed to load judge assignments");
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, [selectedProgram, selectedDivision, activeYear, apiKey]);

  useEffect(() => {
    fetchAssignments();
    
    // Poll every 3 seconds for real-time status updates
    const intervalId = setInterval(() => {
      fetchAssignments(true);
    }, 3000);
    
    return () => clearInterval(intervalId);
  }, [fetchAssignments]);

  // Reset program when division changes
  useEffect(() => {
    setSelectedProgram("");
  }, [selectedDivision]);

  const handleAdd = async () => {
    const validJudges = newJudges.filter((j) => j.id && j.number);
    if (validJudges.length === 0 || !selectedProgram) {
      toast.error("Please select at least one judge and a judge number");
      return;
    }

    setSaving(true);
    try {
      const promises = validJudges.map((judge) =>
        fetch("/api/judge-assignments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": apiKey,
          },
          body: JSON.stringify({
            judgeId: judge.id,
            judgeName: judge.name,
            programId: selectedProgram,
            divisionId: selectedDivision || undefined,
            judgeNumber: parseInt(judge.number),
            year: activeYear,
            createdBy: userId,
          }),
        }).then((res) => res.json())
      );

      const results = await Promise.all(promises);
      const failures = results.filter((r) => !r.success);

      validJudges.forEach((judge) => {
        if (judge.name) addSavedName(judge.name);
      });

      if (failures.length === 0) {
        toast.success(
          validJudges.length > 1
            ? "Judges assigned successfully!"
            : "Judge assigned successfully!"
        );
        setAddDialogOpen(false);
        fetchAssignments();
      } else {
        toast.error(
          `${failures.length} out of ${validJudges.length} assignments failed`
        );
        fetchAssignments();
      }
    } catch {
      toast.error("Failed to assign judges");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (assignmentId) => {
    try {
      const res = await fetch("/api/judge-assignments", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({ assignmentId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Judge assignment removed");
        fetchAssignments();
      } else {
        toast.error(data.message || "Failed to remove assignment");
      }
    } catch {
      toast.error("Failed to remove assignment");
    }
  };

  const openAddDialog = () => {
    setNewJudges([{ id: "", name: "", number: String(nextJudgeNumber) }]);
    setCurrentJudgeIndex(0);
    setAddDialogOpen(true);
  };

  const handleAddJudgeForm = () => {
    const assignedNumbers = programAssignments.map((a) => a.judgeNumber);
    const formNumbers = newJudges
      .map((j) => parseInt(j.number))
      .filter((n) => !isNaN(n));
    const allNumbers = [...assignedNumbers, ...formNumbers];
    const nextNum = allNumbers.length > 0 ? Math.max(...allNumbers) + 1 : 1;

    setNewJudges([...newJudges, { id: "", name: "", number: String(nextNum) }]);
    setCurrentJudgeIndex(newJudges.length);
  };

  const handleRemoveJudgeForm = () => {
    if (newJudges.length <= 1) return;
    const updated = [...newJudges];
    updated.splice(currentJudgeIndex, 1);
    setNewJudges(updated);
    if (currentJudgeIndex >= updated.length) {
      setCurrentJudgeIndex(updated.length - 1);
    }
  };

  // Toggle individual row selection
  const toggleRow = (id) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle all rows
  const toggleAll = () => {
    if (selectedRows.size === assignments.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(assignments.map((a) => a._id)));
    }
  };

  const openEditDialog = (assignment) => {
    setEditingAssignment(assignment);
    setEditJudgeId(assignment.judgeId || "");
    setEditJudgeName(assignment.judgeName || "");
    setEditJudgeNumber(String(assignment.judgeNumber));
    setEditDialogOpen(true);
  };

  const handleEdit = async () => {
    if (!editingAssignment || !editJudgeNumber || !editJudgeId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/judge-assignments", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({
          assignmentId: editingAssignment._id,
          judgeId: editJudgeId,
          judgeName: editJudgeName,
          judgeNumber: parseInt(editJudgeNumber),
        }),
      });
      const data = await res.json();
      if (data.success) {
        addSavedName(editJudgeName);
        toast.success("Judge assignment updated!");
        setEditDialogOpen(false);
        setEditingAssignment(null);
        fetchAssignments();
      } else {
        toast.error(data.message || "Failed to update assignment");
      }
    } catch {
      toast.error("Failed to update assignment");
    } finally {
      setSaving(false);
    }
  };

  const openAlertDialog = (assignment) => {
    setAlertAssignment(assignment);
    setAlertMessage("");
    setAlertDialogOpen(true);
  };

  const handleSendAlert = async () => {
    if (!alertAssignment || !alertMessage.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/judge-assignments", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({
          assignmentId: alertAssignment._id,
          alertMessage: alertMessage.trim(),
          alertActive: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Alert sent to judge successfully!");
        setAlertDialogOpen(false);
        setAlertAssignment(null);
        setAlertMessage("");
        fetchAssignments();
      } else {
        toast.error(data.message || "Failed to send alert");
      }
    } catch {
      toast.error("Failed to send alert");
    } finally {
      setSaving(false);
    }
  };

  const selectedProgramName = programs.find((p) => p._id === selectedProgram)?.name;
  const selectedDivisionName = divisions.find((d) => d._id === selectedDivision)?.name;

  // Judge options formatted for MultiSelect
  const judgeOptions = judges.map((j) => ({
    value: j._id,
    label: j.name,
  }));

  // If editing and the assigned judge is no longer in the judges list (e.g., lost role)
  if (
    editingAssignment &&
    editingAssignment.judgeId &&
    !judgeOptions.some((o) => o.value === editingAssignment.judgeId)
  ) {
    judgeOptions.push({
      value: editingAssignment.judgeId,
      label: editingAssignment.userName
        ? `${editingAssignment.userName} (Role Removed)`
        : `${editingAssignment.judgeId} (Role Removed)`,
    });
  }

  // Judges already assigned to the relevant program
  const relevantProgramId = editingAssignment ? editingAssignment.programId : selectedProgram;
  const programAssignments = assignments.filter((a) => a.programId === relevantProgramId);
  const assignedJudgeIds = new Set(programAssignments.map((a) => a.judgeId));
  
  // Filter out judges currently selected in the new judges form (except the one in current view)
  const currentlySelectedIds = newJudges
    .map((j) => j.id)
    .filter((id) => id && id !== newJudges[currentJudgeIndex]?.id);

  const availableJudgeOptions = judgeOptions.filter(
    (j) => !assignedJudgeIds.has(j.value) && !currentlySelectedIds.includes(j.value)
  );

  // Get next judge number
  const nextJudgeNumber = programAssignments.length > 0
    ? Math.max(...programAssignments.map((a) => a.judgeNumber)) + 1
    : 1;

  const allAssignedNumbers = programAssignments.map((a) => a.judgeNumber);
  const currentlySelectedNumbers = newJudges
    .map((j) => parseInt(j.number))
    .filter(
      (n) => !isNaN(n) && n !== parseInt(newJudges[currentJudgeIndex]?.number)
    );
  const takenNumbers = new Set([
    ...allAssignedNumbers,
    ...currentlySelectedNumbers,
  ]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="grid grid-cols-12 gap-3 items-end">
        <div className="col-span-12 sm:col-span-4">
          <Label className="text-xs text-muted-foreground mb-1 block">
            Division
          </Label>
          <Select
            value={selectedDivision || "all"}
            onValueChange={(v) => setSelectedDivision(v === "all" ? "" : v)}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="All Divisions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Divisions</SelectItem>
              {divisions.map((d) => (
                <SelectItem key={d._id} value={d._id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-12 sm:col-span-5">
          <Label className="text-xs text-muted-foreground mb-1 block">
            Program
          </Label>
          <MultiSelect
            options={formatOptions(filteredPrograms)}
            value={selectedProgram}
            onValueChange={setSelectedProgram}
            placeholder="Select Program"
            multiSelect={false}
            className="w-full h-10"
          />
        </div>

        <div className="col-span-12 sm:col-span-3">
          <Button
            className="w-full h-10"
            onClick={openAddDialog}
            disabled={!selectedProgram}
          >
            <Plus className="h-4 w-4 mr-2" />
            Assign Judge
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      {selectedProgram && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-start gap-2">
          <BookOpen className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
          <div className="text-sm">
            <span className="font-semibold text-blue-700 dark:text-blue-400">
              {selectedProgramName}
            </span>
            {selectedDivisionName && (
              <span className="text-blue-600 dark:text-blue-400">
                {" · "}
                {selectedDivisionName}
              </span>
            )}
            <p className="text-blue-600 dark:text-blue-400 text-xs mt-0.5">
              A judge can only hold one active program at a time. Mark previous
              as complete before assigning a new program.
            </p>
          </div>
        </div>
      )}

      {/* Assignments Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="animate-spin h-6 w-6 mr-2" />
          <span>Loading assignments...</span>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 text-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer accent-primary"
                    checked={
                      assignments.length > 0 &&
                      selectedRows.size === assignments.length
                    }
                    onChange={toggleAll}
                    title="Select all"
                  />
                </TableHead>
                <TableHead className="text-center w-16">Judge</TableHead>
                <TableHead>Division</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Judge Name</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center w-28">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    <Users className="mx-auto h-8 w-8 mb-2 opacity-30" />
                    <p>No judges assigned{selectedProgram ? ' to this program ' : ' '}yet.</p>
                    {selectedProgram && <p className="text-xs mt-1">Click "Assign Judge" to add one.</p>}
                  </TableCell>
                </TableRow>
              ) : (
                assignments.map((assignment) => {
                  const linkedUser = judges.find((j) => j._id === assignment.judgeId);
                  return (
                    <TableRow
                      key={assignment._id}
                      data-state={selectedRows.has(assignment._id) ? "selected" : undefined}
                    >
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer accent-primary"
                          checked={selectedRows.has(assignment._id)}
                          onChange={() => toggleRow(assignment._id)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono">
                          {assignment.judgeNumber}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {assignment.divisionName || "—"}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {assignment.programName || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {linkedUser?.name || assignment.userName || assignment.judgeId || "—"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {assignment.judgeName}
                      </TableCell>
                      <TableCell className="text-center">
                        {assignment.isCompleted ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        ) : assignment.isReady ? (
                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Ready
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {!assignment.isCompleted && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-primary"
                              onClick={() => openEditDialog(assignment)}
                              title="Edit assignment"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                            onClick={() => openAlertDialog(assignment)}
                            title="Send Alert"
                          >
                            <Bell className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => openDeleteDialog(assignment)}
                            title="Remove assignment"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Judge Assignment Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden [&>button.absolute]:hidden rounded-2xl">
          <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-4 sm:px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md shrink-0">
            <div className="p-2 rounded-lg bg-primary/10">
              <Pencil className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 text-left space-y-0.5">
              <DialogTitle className="text-xl font-bold m-0">
                Edit Judge Assignment
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground pt-1">
                Update the assignment details for{" "}
                <strong>{editingAssignment?.judgeName}</strong>.
              </DialogDescription>
            </div>
            <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none">
              <X className="h-5 w-5" />
            </DialogClose>
          </DialogHeader>

          <div className="space-y-4 px-4 sm:px-5 pb-2 pt-2">
            <div className="space-y-2">
              <Label>User</Label>
              <MultiSelect
                options={judgeOptions.filter(
                  (j) =>
                    !assignedJudgeIds.has(j.value) ||
                    j.value === editingAssignment?.judgeId
                )}
                value={editJudgeId}
                onValueChange={setEditJudgeId}
                placeholder="Select a user..."
                multiSelect={false}
              />
            </div>

            <div className="space-y-2">
              <Label>Judge Name (Optional)</Label>
              <JudgeNameInput
                value={editJudgeName}
                onChange={(e) => setEditJudgeName(e.target.value)}
                placeholder="Enter custom judge name..."
                savedNames={savedJudgeNames}
                onRemove={removeSavedName}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to use the user&apos;s default name.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Judge Number</Label>
              <Select value={editJudgeNumber} onValueChange={setEditJudgeNumber}>
                <SelectTrigger>
                  <SelectValue placeholder="Select judge number" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <SelectItem
                      key={n}
                      value={String(n)}
                      disabled={
                        programAssignments.some(
                          (a) =>
                            a.judgeNumber === n &&
                            a._id !== editingAssignment?._id
                        )
                      }
                    >
                      Judge {n}
                      {programAssignments.some(
                        (a) =>
                          a.judgeNumber === n &&
                          a._id !== editingAssignment?._id
                      ) && " (taken)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 px-4 sm:px-5 py-3 border-t bg-muted/40">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={saving || !editJudgeNumber || !editJudgeId} className="w-full sm:w-auto">
              {saving ? (
                <Loader className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <Pencil className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Alert Dialog */}
      <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden [&>button.absolute]:hidden rounded-2xl">
          <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-4 sm:px-5 py-4 border-b space-y-0 bg-amber-500/10 dark:bg-amber-500/20 sticky top-0 z-20 backdrop-blur-md shrink-0">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Bell className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1 text-left space-y-0.5">
              <DialogTitle className="text-xl font-bold m-0 text-amber-600 dark:text-amber-500">
                Send Alert to Judge
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground pt-1">
                Send an alert notification to{" "}
                <strong>{alertAssignment?.judgeName}</strong>. It will appear on their Mark Entry screen.
              </DialogDescription>
            </div>
            <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none">
              <X className="h-5 w-5" />
            </DialogClose>
          </DialogHeader>

          <div className="space-y-4 px-4 sm:px-5 pb-2 pt-2">
            <div className="space-y-2">
              <Label>Alert Message</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                value={alertMessage}
                onChange={(e) => setAlertMessage(e.target.value)}
                placeholder="Type your alert message here..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 px-4 sm:px-5 py-3 border-t bg-muted/40">
            <Button
              variant="outline"
              onClick={() => setAlertDialogOpen(false)}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendAlert}
              disabled={saving || !alertMessage.trim()}
              className="bg-amber-500 hover:bg-amber-600 text-white w-full sm:w-auto"
            >
              {saving ? (
                <Loader className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <Bell className="h-4 w-4 mr-2" />
              )}
              Send Alert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Judge Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden [&>button.absolute]:hidden rounded-2xl">
          <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-4 sm:px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md shrink-0">
            <div className="p-2 rounded-lg bg-primary/10">
              <UserCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 text-left space-y-0.5">
              <DialogTitle className="text-xl font-bold m-0">
                Assign Judge
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground pt-1">
                <strong>
                  {selectedDivisionName ? `${selectedDivisionName} - ` : ""}
                  {selectedProgramName}
                </strong>
              </DialogDescription>
            </div>
            <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none">
              <X className="h-5 w-5" />
            </DialogClose>
          </DialogHeader>

          <div className="space-y-4 px-4 sm:px-5 pb-2 pt-2">
            <div className="space-y-2">
              <Label>User</Label>
              <MultiSelect
                options={availableJudgeOptions}
                value={newJudges[currentJudgeIndex]?.id || ""}
                onValueChange={(val) => updateNewJudge(currentJudgeIndex, "id", val)}
                placeholder="Select a user..."
                multiSelect={false}
              />
              {availableJudgeOptions.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  All users are already assigned to this program.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Judge Name (Optional)</Label>
              <JudgeNameInput
                value={newJudges[currentJudgeIndex]?.name || ""}
                onChange={(e) => updateNewJudge(currentJudgeIndex, "name", e.target.value)}
                placeholder="Enter custom judge name..."
                savedNames={savedJudgeNames}
                onRemove={removeSavedName}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to use the user's default name.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Judge Number</Label>
              <Select
                value={newJudges[currentJudgeIndex]?.number || ""}
                onValueChange={(val) => updateNewJudge(currentJudgeIndex, "number", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select judge number" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <SelectItem
                      key={n}
                      value={String(n)}
                      disabled={takenNumbers.has(n)}
                    >
                      Judge {n}
                      {takenNumbers.has(n) && " (taken)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 px-4 sm:px-5 py-3 border-t bg-muted/40 sm:justify-between items-center">
            {/* Left side: Navigation or empty */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start">
              {newJudges.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentJudgeIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentJudgeIndex === 0 || saving}
                  >
                    Prev
                  </Button>
                  <span className="text-sm text-muted-foreground w-12 text-center">
                    {currentJudgeIndex + 1} / {newJudges.length}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentJudgeIndex((prev) => Math.min(newJudges.length - 1, prev + 1))}
                    disabled={currentJudgeIndex === newJudges.length - 1 || saving}
                  >
                    Next
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive h-8 w-8 ml-1"
                    onClick={handleRemoveJudgeForm}
                    disabled={saving}
                    title="Remove this judge"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            {/* Right side: Actions */}
            <div className="flex gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap justify-end shrink-0">
              <Button
                size="sm"
                onClick={handleAddJudgeForm}
                disabled={saving}
                className="bg-blue-500 hover:bg-blue-600 text-white flex-1 sm:flex-none order-1 sm:order-none"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={saving || !newJudges.some((j) => j.id)}
                className="flex-1 sm:flex-none order-2 sm:order-none"
              >
                {saving ? (
                  <Loader className="animate-spin h-4 w-4 mr-1" />
                ) : (
                  <UserCheck className="h-4 w-4 mr-1" />
                )}
                Assign
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-lg flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
          <AlertDialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-destructive/5 dark:bg-destructive/10 sticky top-0 z-20 backdrop-blur-md shrink-0 text-left">
            <div className="p-2 rounded-lg bg-destructive/10 shrink-0">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1 text-left space-y-0.5">
              <AlertDialogTitle className="text-xl font-bold m-0 text-destructive">Remove Judge Assignment?</AlertDialogTitle>
              <AlertDialogDescription className="m-0 text-sm text-muted-foreground pt-1">
                This will remove{" "}
                <strong>{deleteAssignmentTarget?.judgeName}</strong> as Judge{" "}
                {deleteAssignmentTarget?.judgeNumber} from this program. Any marks
                already submitted will remain.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>

          {deleteAssignmentTarget?.isCompleted && (
            <div className="px-5 py-4 space-y-3">
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/50 p-3 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300">
                <p className="font-semibold mb-1">Warning: Marks Already Completed</p>
                <p>This judge has already completed their mark entry. To proceed with deletion, please type <strong>DELETE</strong> below.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="delete-confirm">Confirm Deletion</Label>
                <Input
                  id="delete-confirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  className="w-full"
                />
              </div>
            </div>
          )}

          <AlertDialogFooter className="p-5 border-t bg-muted/20 flex justify-between gap-4 sm:space-x-0">
            <AlertDialogCancel className="flex-1 mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 flex-1"
              disabled={deleteAssignmentTarget?.isCompleted && deleteConfirmText !== "DELETE"}
              onClick={(e) => {
                if (deleteAssignmentTarget?.isCompleted && deleteConfirmText !== "DELETE") {
                  e.preventDefault();
                  return;
                }
                if (deleteAssignmentTarget) {
                  handleDelete(deleteAssignmentTarget._id);
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default JudgesManagement;
