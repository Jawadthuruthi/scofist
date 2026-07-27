"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { toast } from "sonner";
import {
  Loader,
  Send,
  CheckCircle,
  BookOpen,
  Trophy,
  LayoutGrid,
  Hash,
  Users,
  Printer,
} from "lucide-react";

const JudgePortal = ({ judgeId, activeYear, apiKey }) => {
  const [assignment, setAssignment] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [marks, setMarks] = useState({});
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [judgeSignature, setJudgeSignature] = useState("");

  const currentAssignmentIdRef = useRef(null);
  useEffect(() => {
    currentAssignmentIdRef.current = assignment?._id;
  }, [assignment]);

  const fetchAssignment = useCallback(async (isPolling = false) => {
    if (!isPolling) setLoading(true);
    try {
      const params = new URLSearchParams({ judgeId, year: activeYear });
      const res = await fetch(`/api/judge-assignments?${params}`, {
        headers: { "api-key": apiKey },
      });
      const data = await res.json();
      if (!data.success) {
        if (!isPolling) toast.error(data.message);
        return;
      }

      // Find the first active (non-completed) assignment
      const active = data.assignments.find((a) => !a.isCompleted);
      if (!active) {
        setAssignment(null);
        return;
      }

      // If polling and we already have the same active assignment, do nothing 
      // (to preserve user's typed marks/comments)
      if (isPolling && currentAssignmentIdRef.current === active._id) {
        return;
      }

      setAssignment(active);
      if (isPolling) {
        setSubmitted(false);
      }

      // Fetch registrations for this program
      const programIdStr = active.programId?._id || active.programId;
      const regRes = await fetch(
        `/api/program-registration?programId=${programIdStr}&isCodeLetter=true&limit=1000`,
        { headers: { "api-key": apiKey } }
      );
      const regData = await regRes.json();
      if (regData.success) {
        const regs = regData.registrations || [];
        setRegistrations(regs);

        // Initialise marks from existing marksByJudges for this judge index
        const judgeIdx = active.judgeNumber - 1;
        const initialMarks = {};
        const initialComments = {};
        regs.forEach((reg) => {
          reg.participantsDetails?.forEach((p) => {
            const key = `${reg._id}-${p.id}`;
            initialMarks[key] = p.marksByJudges?.[judgeIdx] ?? "";
            initialComments[key] = p.commentsByJudges?.[judgeIdx] ?? "";
          });
        });
        setMarks(initialMarks);
        setComments(initialComments);
      }
    } catch {
      if (!isPolling) toast.error("Failed to load assignment");
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, [judgeId, activeYear, apiKey]);

  useEffect(() => {
    fetchAssignment();

    // Poll every 5 seconds to check for new assignments automatically
    const intervalId = setInterval(() => {
      fetchAssignment(true);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [fetchAssignment]);

  const handleMarkChange = (key, value) => {
    const num =
      value === "" ? "" : Math.max(0, Math.min(100, parseInt(value) || 0));
    setMarks((prev) => ({ ...prev, [key]: num }));
  };

  const handleCommentChange = (key, value) => {
    setComments((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!assignment) return;

    if (!judgeSignature.trim()) {
      toast.error("Please enter your name to confirm submission");
      return;
    }

    // Build marksData
    const marksData = [];
    registrations.forEach((reg) => {
      reg.participantsDetails?.forEach((p) => {
        const participantId = p.id;
        const key = `${reg._id}-${participantId}`;
        const markValue = marks[key];
        const commentValue = comments[key] || "";
        if (markValue !== "" && markValue !== undefined) {
          marksData.push({
            registrationId: reg._id,
            participantId,
            marks: Number(markValue),
            comment: commentValue,
          });
        }
      });
    });

    if (marksData.length === 0) {
      toast.error("Please enter at least one mark before submitting");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/judge-assignments/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({ assignmentId: assignment._id, marksData }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Marks submitted successfully!");
        setSubmitted(true);
        setAssignment((prev) => ({ ...prev, isCompleted: true }));
      } else {
        toast.error(data.message || "Failed to submit marks");
      }
    } catch {
      toast.error("Failed to submit marks");
    } finally {
      setSubmitting(false);
    }
  };

  // Build flattened participant list from all registrations
  const participantRows = [];
  registrations.forEach((reg) => {
    reg.participantsDetails?.forEach((p) => {
      const participantId = p.id;
      const key = `${reg._id}-${participantId}`;
      // Compute running average from all existing marksByJudges merged with current input
      const existingMarks = [...(p.marksByJudges || [])];
      const judgeIdx = assignment ? assignment.judgeNumber - 1 : 0;
      const currentMark = marks[key];
      if (currentMark !== "" && currentMark !== undefined) {
        existingMarks[judgeIdx] = Number(currentMark);
      }
      const validMarks = existingMarks.filter(
        (m) => m !== undefined && m !== null && m > 0
      );
      const average =
        validMarks.length > 0
          ? Math.round(
              validMarks.reduce((a, b) => a + b, 0) / validMarks.length
            )
          : 0;

      participantRows.push({
        key,
        registrationId: reg._id,
        participantId,
        codeLetter: p.codeLetter,
        teamName: reg.teamName,
        average,
      });
    });
  });

  // Sort by code letter
  participantRows.sort((a, b) =>
    (a.codeLetter || "").localeCompare(b.codeLetter || "")
  );

  const allFilled = participantRows.every(
    (r) => marks[r.key] !== "" && marks[r.key] !== undefined
  );

  const filledCount = participantRows.filter(
    (r) => marks[r.key] !== "" && marks[r.key] !== undefined
  ).length;

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader className="animate-spin h-6 w-6 mr-2" />
        <span>Loading your assignment...</span>
      </div>
    );
  }

  // ── No active assignment ─────────────────────────────────────────────────
  if (!assignment) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
          <CheckCircle className="h-8 w-8 text-green-500" />
        </div>
        <h3 className="text-lg font-semibold mb-1">No Active Program Assigned</h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          You have no active program assigned right now. Please contact the
          Program Committee to assign you a program.
        </p>
      </div>
    );
  }

  // ── Submitted ────────────────────────────────────────────────────────────
  if (submitted || assignment.isCompleted) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
          <Trophy className="h-8 w-8 text-green-500" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Marks Submitted!</h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          Your marks for{" "}
          <strong>{assignment.programName}</strong> have been submitted
          successfully. Please contact the Program Committee for your next
          assignment.
        </p>
      </div>
    );
  }

  // ── Main UI ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Division + Program info cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Division */}
        <div className="flex items-center gap-3 rounded-xl border bg-muted/40 px-4 py-3">
          <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
            <LayoutGrid className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
              Division
            </p>
            <p className="font-semibold text-sm truncate">
              {assignment.divisionName || "—"}
            </p>
          </div>
        </div>

        {/* Program */}
        <div className="sm:col-span-2 flex items-center gap-3 rounded-xl border bg-muted/40 px-4 py-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
              Program
            </p>
            <p className="font-bold text-base truncate">
              {assignment.programName}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant="outline"
              className="font-semibold text-primary border-primary/30 bg-primary/5"
            >
              <Hash className="h-3 w-3 mr-1" />
              Judge {assignment.judgeNumber}
            </Badge>
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              {filledCount}/{participantRows.length} filled
            </Badge>
          </div>
        </div>
      </div>

      {/* Rules, Topics, and Criteria */}
      {(assignment.programId?.rules || assignment.programId?.topics || (assignment.programId?.criteria && assignment.programId.criteria.length > 0)) && (
        <div className="bg-muted/30 border rounded-lg p-4 text-sm text-muted-foreground mt-3">
          {assignment.programId.topics && (
            <div className="mb-2">
              <strong className="text-foreground">Topics: </strong>
              <span className="whitespace-pre-wrap">{assignment.programId.topics}</span>
            </div>
          )}
          {assignment.programId.rules && (
            <div className="mb-2">
              <strong className="text-foreground">Rules: </strong>
              <span className="whitespace-pre-wrap">{assignment.programId.rules}</span>
            </div>
          )}
          {assignment.programId.criteria && assignment.programId.criteria.length > 0 && (
            <div className="mt-4">
              <strong className="text-foreground block mb-2 text-base">Evaluation Criteria:</strong>
              <div className="overflow-x-auto">
                <table className="w-full md:w-3/4 lg:w-1/2 text-sm text-left border-collapse border border-muted bg-background">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-2 font-medium border-b border-muted">Criteria</th>
                      <th className="px-4 py-2 font-medium border-b border-muted w-24">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignment.programId.criteria.map((c, i) => (
                      <tr key={i} className="border-b border-muted last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-2">{c.name}</td>
                        <td className="px-4 py-2 font-medium">{c.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Instructions ── */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-400">
        <strong>Instructions:</strong> Enter marks (0–100) and comments for each participant.
        Once submitted, marks cannot be changed.
      </div>

      {/* ── Marks Table ── */}
      {participantRows.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="mx-auto h-10 w-10 mb-3 opacity-30" />
          <p>No registered participants found for this program.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow>
                  {/* Sl. */}
                  <TableHead className="w-12 text-center whitespace-nowrap border-r border-border">
                    Sl.
                  </TableHead>

                  {/* Code Letter */}
                  <TableHead className="w-32 text-center whitespace-nowrap border-r border-border">
                    Code Letter
                  </TableHead>

                  {/* Comments */}
                  <TableHead className="text-center whitespace-nowrap border-r border-border">
                    Comments
                  </TableHead>

                  {/* Marks */}
                  <TableHead className="w-32 text-center whitespace-nowrap border-r border-border">
                    Marks
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {participantRows.map((row, idx) => {
                  const markVal = marks[row.key] ?? "";
                  const hasValue = markVal !== "" && markVal !== undefined;

                  return (
                    <TableRow key={row.key}>
                      {/* Sl. */}
                      <TableCell className="text-center font-medium text-muted-foreground whitespace-nowrap border-r border-border">
                        {idx + 1}
                      </TableCell>

                      {/* Code Letter */}
                      <TableCell className="text-center whitespace-nowrap border-r border-border align-top">
                        <Badge
                          variant="secondary"
                          className="font-mono text-sm px-3 mt-1"
                        >
                          {row.codeLetter || "—"}
                        </Badge>
                      </TableCell>

                      {/* Comments */}
                      <TableCell className="border-r border-border align-top">
                        <Textarea
                          value={comments[row.key] || ""}
                          onChange={(e) => handleCommentChange(row.key, e.target.value)}
                          className="min-w-[200px] text-sm resize-y"
                          placeholder="Add comments..."
                        />
                      </TableCell>

                      {/* Judge marks input */}
                      <TableCell className="text-center border-r border-border align-top">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={markVal}
                          onChange={(e) =>
                            handleMarkChange(row.key, e.target.value)
                          }
                          className="w-20 sm:w-24 mx-auto text-center font-mono text-sm"
                          placeholder="0-100"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── Submit Button ── */}
      {participantRows.length > 0 && (
        <div className="flex flex-col gap-4 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {allFilled ? (
                <span className="text-green-600 font-medium">
                  ✓ All {participantRows.length} participants marked
                </span>
              ) : (
                <span>
                  {filledCount} of {participantRows.length} marks entered
                </span>
              )}
            </p>
            <Button variant="outline" onClick={() => window.print()} className="ml-auto print:hidden">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>

          <div className="flex items-center gap-3 self-end print:hidden">
            <Input
              type="text"
              placeholder="Type your name to confirm..."
              value={judgeSignature}
              onChange={(e) => setJudgeSignature(e.target.value)}
              className="w-64"
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white min-w-36"
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader className="animate-spin h-4 w-4 mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Submit Marks
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Submit Marks?</AlertDialogTitle>
                <AlertDialogDescription>
                  You are about to submit marks for{" "}
                  <strong>{assignment.programName}</strong>.{" "}
                  {!allFilled && (
                    <span className="text-amber-600 font-medium">
                      {participantRows.length - filledCount} participant(s) have
                      no marks — they will be skipped.{" "}
                    </span>
                  )}
                  Once submitted you cannot edit the marks.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Review Again</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleSubmit}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submit
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          </div>
        </div>
      )}
    </div>
  );
};

export default JudgePortal;
