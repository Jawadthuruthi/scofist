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
  BellRing,
} from "lucide-react";

const playAlertSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    // Create a high-pitched piercing triple beep sound
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(2500, audioCtx.currentTime); // 2.5kHz
    
    const beeps = 3;
    const beepDuration = 0.1;
    const beepPause = 0.05;
    
    for (let i = 0; i < beeps; i++) {
      const startTime = audioCtx.currentTime + i * (beepDuration + beepPause);
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.setValueAtTime(0.2, startTime + 0.01); // Sharp attack
      gainNode.gain.setValueAtTime(0.2, startTime + beepDuration - 0.01); // Sustain
      gainNode.gain.linearRampToValueAtTime(0, startTime + beepDuration); // Release
    }
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + (beeps * (beepDuration + beepPause)));
  } catch (e) {
    console.error("Audio play failed:", e);
  }
};

// Helper to render text items each on its own line with * prefix
const renderItemsWithStar = (text) => {
  if (!text) return null;
  const items = text
    .split(".")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-start gap-2">
          <span className="text-primary font-bold mt-0.5 shrink-0">*</span>
          <span className="book-text-font text-base md:text-lg leading-relaxed">{item}</span>
        </div>
      ))}
    </div>
  );
};

const JudgePortal = ({ judgeId, activeYear, apiKey }) => {
  const [assignment, setAssignment] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [marks, setMarks] = useState({});
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [judgeSignature, setJudgeSignature] = useState("");
  const [activeTab, setActiveTab] = useState("Criteria");

  const currentAssignmentIdRef = useRef(null);
  const [dismissingAlert, setDismissingAlert] = useState(false);
  const prevAlertActiveRef = useRef(false);

  useEffect(() => {
    currentAssignmentIdRef.current = assignment?._id;
    
    // Play sound when alert becomes active
    if (assignment?.alertActive && !prevAlertActiveRef.current) {
      playAlertSound();
    }
    prevAlertActiveRef.current = !!assignment?.alertActive;
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

      // If polling and we already have the same active assignment, we just check if alert state changed
      // (to preserve user's typed marks/comments while still receiving alerts)
      if (isPolling && currentAssignmentIdRef.current === active._id) {
        setAssignment((prev) => {
          if (!prev) return prev;
          if (prev.alertActive !== active.alertActive || prev.alertMessage !== active.alertMessage) {
            return { ...prev, alertActive: active.alertActive, alertMessage: active.alertMessage };
          }
          return prev;
        });
        return;
      }

      setAssignment(active);
      if (active.programId) {
        if (active.programId.criteria?.length > 0) setActiveTab("Criteria");
        else if (active.programId.rules) setActiveTab("Rules");
        else if (active.programId.topics) setActiveTab("Topics");
      }
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

    // Poll every 1 second to check for new assignments and alerts automatically
    const intervalId = setInterval(() => {
      fetchAssignment(true);
    }, 1000);

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

  const handleDismissAlert = async () => {
    if (!assignment) return;
    setDismissingAlert(true);
    try {
      const res = await fetch("/api/judge-assignments", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify({
          assignmentId: assignment._id,
          alertActive: false,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAssignment((prev) => ({ ...prev, alertActive: false }));
      } else {
        toast.error(data.message || "Failed to dismiss alert");
      }
    } catch {
      toast.error("Failed to dismiss alert");
    } finally {
      setDismissingAlert(false);
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

      {/* ── Top Header Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Unified Division + Program Info Card */}
        <div className="flex flex-col items-center justify-center text-center gap-2 rounded-xl border bg-muted/40 px-6 py-6 h-full">
          <p className="text-sm md:text-base uppercase tracking-widest text-muted-foreground font-medium">
            {assignment.divisionName || "—"}
          </p>
          <h2 className="font-bold text-3xl">
            {assignment.programName}
          </h2>
        </div>

        {/* ── Instructions (Desktop) ── */}
        <div className="hidden lg:flex flex-col justify-center bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-6 gap-4 h-full">
          <div className="text-sm sm:text-base text-blue-700 dark:text-blue-400 text-center sm:text-left">
            <strong className="block mb-2 text-base">Instructions:</strong>
            <ul className="list-disc pl-5 leading-relaxed text-left space-y-1 inline-block sm:block">
              <li>Enter marks (0–100) and comments for each participant.</li>
              <li>Once submitted, marks cannot be changed.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        {/* Left Column: Rules, Topics, and Criteria */}
        <div className="lg:sticky lg:top-4 space-y-4">
          {(assignment.programId?.rules || assignment.programId?.topics || (assignment.programId?.criteria && assignment.programId.criteria.length > 0)) && (
            <div className="bg-muted/30 border rounded-lg p-4 text-sm text-muted-foreground">
              <div className="grid grid-cols-3 gap-2 mb-5 pb-4 border-b border-muted">
                <Button 
                  size="sm"
                  variant={activeTab === "Criteria" ? "default" : "outline"} 
                  className={`w-full ${!(assignment.programId?.criteria?.length > 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => assignment.programId?.criteria?.length > 0 && setActiveTab("Criteria")}
                  disabled={!(assignment.programId?.criteria?.length > 0)}
                >
                  Criteria
                </Button>
                <Button 
                  size="sm"
                  variant={activeTab === "Rules" ? "default" : "outline"} 
                  className={`w-full ${!assignment.programId?.rules ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => assignment.programId?.rules && setActiveTab("Rules")}
                  disabled={!assignment.programId?.rules}
                >
                  Rules
                </Button>
                <Button 
                  size="sm"
                  variant={activeTab === "Topics" ? "default" : "outline"} 
                  className={`w-full ${!assignment.programId?.topics ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => assignment.programId?.topics && setActiveTab("Topics")}
                  disabled={!assignment.programId?.topics}
                >
                  Topics
                </Button>
              </div>

              {activeTab === "Criteria" && assignment.programId?.criteria && assignment.programId.criteria.length > 0 && (
                <div className="mt-4">
                  <strong className="text-foreground block mb-2 text-base">Evaluation Criteria:</strong>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse border border-muted bg-background">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-2 font-medium border-b border-muted">Criteria</th>
                          <th className="px-4 py-2 font-medium border-b border-muted w-24">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignment.programId.criteria.map((c, i) => (
                          <tr key={i} className="border-b border-muted last:border-0 hover:bg-muted/20">
                            <td className="px-4 py-2 font-google-sans font-normal text-sm md:text-base">{c.name}</td>
                            <td className="px-4 py-2 font-medium">{c.score}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {activeTab === "Rules" && assignment.programId?.rules && (
                <div className="mb-2">
                  <strong className="text-foreground block mb-2 text-sm md:text-base">Rules: </strong>
                  <div className="bg-muted/30 p-3 sm:p-4 rounded-lg border-l-4 border-primary">
                    <div className="font-google-sans text-sm md:text-base font-normal leading-relaxed break-words">
                      {renderItemsWithStar(assignment.programId.rules)}
                    </div>
                  </div>
                </div>
              )}
              {activeTab === "Topics" && assignment.programId?.topics && (
                <div className="mb-2">
                  <strong className="text-foreground block mb-2 text-sm md:text-base">Topics: </strong>
                  <div className="bg-muted/30 p-3 sm:p-4 rounded-lg border-l-4 border-green-500">
                    <div className="font-google-sans text-sm md:text-base font-normal leading-relaxed break-words">
                      {renderItemsWithStar(assignment.programId.topics)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Instructions (Mobile) ── */}
          <div className="flex lg:hidden flex-col justify-center bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-6 gap-4">
            <div className="text-sm sm:text-base text-blue-700 dark:text-blue-400 text-center sm:text-left">
              <strong className="block mb-2 text-base">Instructions:</strong>
              <ul className="list-disc pl-5 leading-relaxed text-left space-y-1 inline-block sm:block">
                <li>Enter marks (0–100) and comments for each participant.</li>
                <li>Once submitted, marks cannot be changed.</li>
              </ul>
            </div>
          </div>
        </div>

      {/* Right Column: Table, Submit */}
      <div className="space-y-5">

      {/* ── Marks Table ── */}
      {participantRows.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="mx-auto h-10 w-10 mb-3 opacity-30" />
          <p>No registered participants found for this program.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                {/* Sl. */}
                <TableHead className="w-10 text-center whitespace-nowrap border-r border-border">
                  Sl.
                </TableHead>

                {/* Code Letter */}
                <TableHead className="w-20 text-center whitespace-nowrap border-r border-border">
                  Code
                </TableHead>

                {/* Comments */}
                <TableHead className="text-center border-r border-border">
                  Comments
                </TableHead>

                {/* Marks */}
                <TableHead className="w-24 text-center whitespace-nowrap border-r border-border">
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
                      <TableCell className="border-r border-border align-top p-2">
                        <Textarea
                          value={comments[row.key] || ""}
                          onChange={(e) => handleCommentChange(row.key, e.target.value)}
                          className="w-full min-h-0 h-8 text-sm resize-none overflow-hidden"
                          placeholder="Add comments..."
                          rows={1}
                        />
                      </TableCell>

                      {/* Judge marks input */}
                      <TableCell className="text-center border-r border-border align-top p-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={markVal}
                          onChange={(e) =>
                            handleMarkChange(row.key, e.target.value)
                          }
                          className="w-full mx-auto text-center font-mono text-sm px-1"
                          placeholder="0-100"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
        </div>
      )}

      {/* ── Submit Button ── */}
      {participantRows.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <p className="text-sm text-muted-foreground text-center sm:text-left">
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

          <div className="print:hidden w-full sm:w-auto">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white w-full sm:min-w-36"
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

      {/* ── Alert Notification Popup ── */}
      <AlertDialog open={!!assignment.alertActive}>
        <AlertDialogContent className="max-w-2xl border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 p-8">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-4 text-amber-700 dark:text-amber-500 text-3xl font-bold">
              <BellRing className="h-10 w-10 animate-pulse" />
              Alert from Program Committee
            </AlertDialogTitle>
            <AlertDialogDescription className="text-amber-900 dark:text-amber-200 mt-6 text-2xl leading-relaxed bg-white dark:bg-amber-950/50 p-6 rounded-lg border border-amber-100 dark:border-amber-800 shadow-inner break-words font-medium">
              {assignment.alertMessage || "You have a new message from the committee."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center mt-8">
            <Button
              onClick={handleDismissAlert}
              disabled={dismissingAlert}
              size="lg"
              className="bg-amber-600 hover:bg-amber-700 text-white w-full sm:w-auto min-w-48 h-14 text-xl"
            >
              {dismissingAlert ? (
                <Loader className="animate-spin h-6 w-6 mr-3" />
              ) : (
                <CheckCircle className="h-6 w-6 mr-3" />
              )}
              Got it
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </div>
);
};

export default JudgePortal;
