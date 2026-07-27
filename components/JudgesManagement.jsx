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

  // Add form state
  const [newJudgeId, setNewJudgeId] = useState("");
  const [newJudgeName, setNewJudgeName] = useState("");
  const [newJudgeNumber, setNewJudgeNumber] = useState("");

  const filteredPrograms = programs.filter(
    (p) => !selectedDivision || p.divisionId === selectedDivision
  );

  const fetchAssignments = useCallback(async () => {
    if (!selectedProgram) {
      setAssignments([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ programId: selectedProgram });
      if (activeYear) params.set("year", activeYear);
      const res = await fetch(`/api/judge-assignments?${params}`, {
        headers: { "api-key": apiKey },
      });
      const data = await res.json();
      if (data.success) {
        setAssignments(data.assignments);
      } else {
        toast.error(data.message || "Failed to load assignments");
      }
    } catch {
      toast.error("Failed to load judge assignments");
    } finally {
      setLoading(false);
    }
  }, [selectedProgram, activeYear, apiKey]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // Reset program when division changes
  useEffect(() => {
    setSelectedProgram("");
    setAssignments([]);
  }, [selectedDivision]);

  // Get next judge number
  const nextJudgeNumber = assignments.length > 0
    ? Math.max(...assignments.map((a) => a.judgeNumber)) + 1
    : 1;

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

  const selectedProgramName = programs.find((p) => p._id === selectedProgram)?.name;
  const selectedDivisionName = divisions.find((d) => d._id === selectedDivision)?.name;

  // Judge options formatted for MultiSelect
  const judgeOptions = judges.map((j) => ({
    value: j._id,
    label: j.name,
  }));

  // Judges already assigned to this program
  const assignedJudgeIds = new Set(assignments.map((a) => a.judgeId));
  const availableJudgeOptions = judgeOptions.filter(
    (j) => !assignedJudgeIds.has(j.value)
  );

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
            <SelectTrigger>
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
            className="w-full"
          />
        </div>

        <div className="col-span-12 sm:col-span-3">
          <Button
            className="w-full"
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
      {!selectedProgram ? (
        <div className="text-center py-16 text-muted-foreground">
          <Filter className="mx-auto h-10 w-10 mb-3 opacity-30" />
          <p className="font-medium">Select a program to view judge assignments</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="animate-spin h-6 w-6 mr-2" />
          <span>Loading assignments...</span>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center w-16">Judge #</TableHead>
                <TableHead>Judge Name</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center w-20">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    <Users className="mx-auto h-8 w-8 mb-2 opacity-30" />
                    <p>No judges assigned to this program yet.</p>
                    <p className="text-xs mt-1">Click "Assign Judge" to add one.</p>
                  </TableCell>
                </TableRow>
              ) : (
                assignments.map((assignment) => (
                  <TableRow key={assignment._id}>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-mono">
                        {assignment.judgeNumber}
                      </Badge>
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
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Judge Assignment?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove{" "}
                              <strong>{assignment.judgeName}</strong> as Judge{" "}
                              {assignment.judgeNumber} from this program. Any marks
                              already submitted will remain.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive hover:bg-destructive/90"
                              onClick={() => handleDelete(assignment._id)}
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Judge Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Assign Judge
            </DialogTitle>
            <DialogDescription>
              Assign a judge to{" "}
              <strong>{selectedProgramName}</strong>. The judge must complete
              this program before they can be assigned another.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
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
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem
                      key={n}
                      value={String(n)}
                      disabled={assignments.some((a) => a.judgeNumber === n)}
                    >
                      Judge {n}
                      {assignments.some((a) => a.judgeNumber === n) &&
                        " (taken)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This determines which column (Judge 1, 2, …) in the Evaluation
                page shows this judge&apos;s marks.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={saving || !newJudgeId}>
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
