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

  // Row selection state
  const [selectedRows, setSelectedRows] = useState(new Set());

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editJudgeId, setEditJudgeId] = useState("");
  const [editJudgeName, setEditJudgeName] = useState("");
  const [editJudgeNumber, setEditJudgeNumber] = useState("");

  // Add form state
  const [newJudgeId, setNewJudgeId] = useState("");
  const [newJudgeName, setNewJudgeName] = useState("");
  const [newJudgeNumber, setNewJudgeNumber] = useState("");

  // Alert dialog state
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [alertAssignment, setAlertAssignment] = useState(null);
  const [alertMessage, setAlertMessage] = useState("");

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
    if (!newJudgeId || !newJudgeNumber || !selectedProgram) {
      toast.error("Please select a judge and a judge number");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/judge-assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({
          judgeId: newJudgeId,
          judgeName: newJudgeName,
          programId: selectedProgram,
          divisionId: selectedDivision || undefined,
          judgeNumber: parseInt(newJudgeNumber),
          year: activeYear,
          createdBy: userId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Judge assigned successfully!");
        setAddDialogOpen(false);
        setNewJudgeId("");
        setNewJudgeName("");
        setNewJudgeNumber("");
        fetchAssignments();
      } else {
        toast.error(data.message || "Failed to assign judge");
      }
    } catch {
      toast.error("Failed to assign judge");
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
    setNewJudgeId("");
    setNewJudgeName("");
    setNewJudgeNumber(String(nextJudgeNumber));
    setAddDialogOpen(true);
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

  // Judges already assigned to the relevant program
  const relevantProgramId = editingAssignment ? editingAssignment.programId : selectedProgram;
  const programAssignments = assignments.filter((a) => a.programId === relevantProgramId);
  const assignedJudgeIds = new Set(programAssignments.map((a) => a.judgeId));
  const availableJudgeOptions = judgeOptions.filter(
    (j) => !assignedJudgeIds.has(j.value)
  );

  // Get next judge number
  const nextJudgeNumber = programAssignments.length > 0
    ? Math.max(...programAssignments.map((a) => a.judgeNumber)) + 1
    : 1;

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
                        {linkedUser?.name || assignment.judgeId || "—"}
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
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-primary"
                            onClick={() => openEditDialog(assignment)}
                            title="Edit assignment"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                            onClick={() => openAlertDialog(assignment)}
                            title="Send Alert"
                          >
                            <Bell className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="sm:max-w-lg flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">
                              <AlertDialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-destructive/5 dark:bg-destructive/10 sticky top-0 z-20 backdrop-blur-md shrink-0 text-left">
                                <div className="p-2 rounded-lg bg-destructive/10 shrink-0">
                                  <AlertTriangle className="h-5 w-5 text-destructive" />
                                </div>
                                <div className="flex-1 text-left space-y-0.5">
                                  <AlertDialogTitle className="text-xl font-bold m-0 text-destructive">Remove Judge Assignment?</AlertDialogTitle>
                                  <AlertDialogDescription className="m-0 text-sm text-muted-foreground pt-1">
                                    This will remove{" "}
                                    <strong>{assignment.judgeName}</strong> as Judge{" "}
                                    {assignment.judgeNumber} from this program. Any marks
                                    already submitted will remain.
                                  </AlertDialogDescription>
                                </div>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="p-5 border-t bg-muted/20 flex justify-between gap-4 sm:space-x-0">
                                <AlertDialogCancel className="flex-1 mt-0">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive hover:bg-destructive/90 flex-1"
                                  onClick={() => handleDelete(assignment._id)}
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
              <Input
                value={editJudgeName}
                onChange={(e) => setEditJudgeName(e.target.value)}
                placeholder="Enter custom judge name..."
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
                Assign a judge to{" "}
                <strong>{selectedProgramName}</strong>. The judge must complete
                this program before they can be assigned another.
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
                value={newJudgeId}
                onValueChange={setNewJudgeId}
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
              <Input
                value={newJudgeName}
                onChange={(e) => setNewJudgeName(e.target.value)}
                placeholder="Enter custom judge name..."
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to use the user's default name.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Judge Number</Label>
              <Select
                value={newJudgeNumber}
                onValueChange={setNewJudgeNumber}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select judge number" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <SelectItem
                      key={n}
                      value={String(n)}
                      disabled={programAssignments.some((a) => a.judgeNumber === n)}
                    >
                      Judge {n}
                      {programAssignments.some((a) => a.judgeNumber === n) &&
                        " (taken)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 px-4 sm:px-5 py-3 border-t bg-muted/40">
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={saving || !newJudgeId} className="w-full sm:w-auto">
              {saving ? (
                <Loader className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <UserCheck className="h-4 w-4 mr-2" />
              )}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JudgesManagement;
