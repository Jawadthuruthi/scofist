"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Save,
  Printer,
  Filter,
  X,
  Loader,
  FileText,
  Trash2,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import useCrud from "@/hooks/use-crud";
import PrintHeader from "./PrintHeader";
import Header from "./Header";
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
} from "./ui/alert-dialog";
import { MultiSelect } from "./ui/multi-select";
import { formatOptions } from "@/lib/utils";

const getPrintRowHeight = (count) => {
  if (!count || count <= 4) return "44px";
  if (count <= 6) return "40px";
  if (count <= 8) return "36px";
  if (count <= 10) return "32px";
  if (count <= 12) return "28px";
  if (count <= 16) return "24px";
  return "20px";
};

const EvaluationComponent = ({
  programs = [],
  divisions = [],
  gradeSchemes = [],
  url,
  apiKey,
  additionalProps = {},
}) => {
  const [programRegistrations, setProgramRegistrations] = useState([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState([]);
  const [status, setStatus] = useState("both");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState({});
  const [page, setPage] = useState(0);
  const [judgeNumber, setJudgeNumber] = useState("");
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isSaveAlertOpen, setIsSaveAlertOpen] = useState(false);

  const printRef = useRef();

  // Use CRUD operations
  const { useFetchItems } = useCrud("program-registration", apiKey);
  const { useUpdateItem: useMarksUpdate, useDeleteItem } = useCrud(
    "evaluation",
    apiKey
  );

  const updateMarks = useMarksUpdate();
  const deleteEvaluation = useDeleteItem();

  // Fetch registrations with program details
  const fetchRegistrationsQuery = useFetchItems(
    page,
    1000,
    {
      ...(selectedDivision && { divisionId: selectedDivision }),
      ...(selectedProgram && { programId: selectedProgram }),
      isCodeLetter: true,
    },
    {
      retry: 2,
      retryDelay: 1000,
    }
  );

  const { useFetchItems: useFetchAssignments } = useCrud("judge-assignments", apiKey);
  const fetchAssignmentsQuery = useFetchAssignments(
    0,
    1000,
    {
      ...(selectedDivision && { divisionId: selectedDivision }),
      ...(selectedProgram && { programId: selectedProgram }),
    },
    {
      retry: 2,
    }
  );

  const judgeAssignments = useMemo(() => {
    return fetchAssignmentsQuery.data?.assignments || [];
  }, [fetchAssignmentsQuery.data]);

  // Process registrations data into programs with participants
  const processRegistrationsToPrograms = useCallback((registrations) => {
    if (!registrations || !registrations.length) return [];

    // Group registrations by program
    const programMap = new Map();

    registrations.forEach((registration) => {
      const {
        _id: registrationId,
        programId,
        programName,
        programType,
        programCategory,
        pointScheme,
        divisionId,
        divisionName,
        teamName,
        teamId,
        participantsDetails = [],
        status,
        isResultDeclared,
      } = registration;

      if (!programMap.has(programId)) {
        programMap.set(programId, {
          _id: programId,
          programId,
          programName,
          programType,
          programCategory,
          pointScheme,
          divisionId,
          divisionName,
          participants: [],
          isResultDeclared,
        });
      }

      const program = programMap.get(programId);

      // CRITICAL FIX: Use participant ID as unique identifier instead of index
      participantsDetails.forEach((participant, originalIndex) => {
        const pId = participant.id?._id || participant.id;
        const pIdStr = String(pId || "");
        const regIdStr = String(registrationId || "");
        const uniqueId = `${regIdStr}___${pIdStr}`;
        const participantData = {
          ...participant,
          registrationId: regIdStr,
          teamId,
          teamName,
          participantIndex: originalIndex, // Store original index for reference
          participantId: pIdStr, // Use string ID
          uniqueId, // Ensure uniqueId is a string without [object Object]
          participantDetails: participant.participantDetails || {
            name: participant.id?.name || participant.name || "Unknown",
            chestNumber: participant.id?.chestNumber || participant.chestNumber || "N/A",
            age: participant.id?.age || participant.age || "N/A",
          },
          marksByJudges: participant.marksByJudges || [],
          totalMarks: participant.totalMarks || 0,
          averageMarks: participant.averageMarks || participant.totalMarks || 0,
          isEvaluated: (participant.totalMarks || participant.averageMarks || 0) > 0,
        };

        program.participants.push(participantData);
      });
    });

    return Array.from(programMap.values()).sort((a, b) =>
      a.programName.localeCompare(b.programName)
    );
  }, []);

  // Handle fetch errors
  useEffect(() => {
    if (fetchRegistrationsQuery.error) {
      toast.error(
        fetchRegistrationsQuery.error.message ||
          "Failed to fetch program registrations. Please try again."
      );
    }
  }, [fetchRegistrationsQuery.error]);

  // Process fetched data
  useEffect(() => {
    if (fetchRegistrationsQuery.data) {
      const registrations = fetchRegistrationsQuery.data.registrations || [];
      const processedPrograms = processRegistrationsToPrograms(registrations);
      setProgramRegistrations(processedPrograms);
      setFilteredRegistrations(processedPrograms);
    }
  }, [fetchRegistrationsQuery.data, processRegistrationsToPrograms]);

  // Filter programs by division and program
  useEffect(() => {
    let filtered = programRegistrations;

    if (selectedDivision) {
      filtered = filtered.filter(
        (program) => program.divisionId === selectedDivision
      );
    }

    if (selectedProgram) {
      filtered = filtered.filter(
        (program) => program.programId === selectedProgram
      );
    }

    filtered = filtered.filter((program) => {
      const hasMarks = program.participants?.some((p) => p.totalMarks > 0);

      if (status === "assigned") return hasMarks;
      if (status === "not-assigned") return !hasMarks;
      return true; // for "both"
    });

    setFilteredRegistrations(filtered);
  }, [selectedDivision, selectedProgram, programRegistrations, status]);

  // Auto-detect number of judges from assignments or existing marks when a program is selected
  useEffect(() => {
    if (selectedProgram) {
      // 1. Check judge assignments for this program
      const programAssignments = judgeAssignments.filter(
        (ja) => (ja.programId?._id === selectedProgram || ja.programId === selectedProgram)
      );
      if (programAssignments.length > 0) {
        const maxAssigned = Math.max(...programAssignments.map((ja) => ja.judgeNumber || 1));
        setJudgeNumber(maxAssigned);
        return;
      }

      // 2. Check existing marks in registrations for this program
      const programData = programRegistrations.find((p) => p.programId === selectedProgram);
      if (programData && programData.participants?.length > 0) {
        let maxMarksLength = 0;
        programData.participants.forEach((p) => {
          if (p.marksByJudges && p.marksByJudges.length > maxMarksLength) {
            maxMarksLength = p.marksByJudges.length;
          }
        });
        if (maxMarksLength > 0) {
          setJudgeNumber(maxMarksLength);
          return;
        }
      }

      // Default to 1 if nothing found and judgeNumber is empty
      if (judgeNumber === "") {
        setJudgeNumber(1);
      }
    }
  }, [selectedProgram, judgeAssignments, programRegistrations]);

  const filteredPrograms = useMemo(() => {
    const programIds = new Set(
      filteredRegistrations.flatMap((registration) => registration.programId)
    );
    return programs?.filter(
      (program) =>
        (!selectedDivision || program.divisionId === selectedDivision) &&
        programIds.has(program._id)
    );
  }, [selectedDivision, programs, filteredRegistrations]);

  // Flat ordered list of participant uniqueIds for Enter-key navigation (same judge column)
  const markInputOrder = useMemo(() => {
    const ids = [];
    filteredRegistrations.forEach((program) => {
      [...program.participants]
        .sort((a, b) => a.codeLetter.localeCompare(b.codeLetter))
        .forEach((participant) => {
          ids.push(participant.uniqueId);
        });
    });
    return ids;
  }, [filteredRegistrations]);

  // Move focus to next participant's input in the same judge column on Enter
  const handleMarkKeyDown = (e, uniqueId, judgeIdx) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentIndex = markInputOrder.indexOf(uniqueId);
      const nextId = markInputOrder[currentIndex + 1];
      if (nextId) {
        const nextInput = document.querySelector(
          `input[data-mark-uid="${nextId}"][data-mark-judge="${judgeIdx}"]`
        );
        if (nextInput) nextInput.focus();
      }
    }
  };

  // Handle marks change for individual participant
  // judgeIdx is the 0-based index of the judge column being edited
  const handleMarksChange = (participantUniqueId, marks, judgeIdx, regId, partId) => {
    const marksValue = marks === "" ? "" : Math.max(0, Math.min(100, parseInt(marks) || 0));

    const updateParticipant = (participant) => {
      if (participant.uniqueId !== participantUniqueId) return participant;
      const updatedMarksByJudges = [...(participant.marksByJudges || [])];
      updatedMarksByJudges[judgeIdx] = marksValue;

      // Average over all judges up to judgeNumber
      const validMarks = updatedMarksByJudges
        .slice(0, parseInt(judgeNumber) || 1)
        .filter((m) => m !== undefined && m !== null && m !== "" && m > 0);
      const averageMarks =
        validMarks.length > 0
          ? Math.round(
              validMarks.reduce((sum, mark) => sum + mark, 0) / validMarks.length
            )
          : 0;

      return {
        ...participant,
        marksByJudges: updatedMarksByJudges,
        averageMarks,
        totalMarks: averageMarks,
        isEvaluated: averageMarks > 0,
      };
    };

    const applyUpdate = (list) =>
      list.map((program) => ({
        ...program,
        participants: program.participants.map(updateParticipant),
      }));

    setProgramRegistrations((prev) => applyUpdate(prev));
    setFilteredRegistrations((prev) => applyUpdate(prev));

    // Resolve registrationId and participantId safely
    let registrationId = regId;
    let participantId = partId;
    if (!registrationId || !participantId) {
      if (participantUniqueId.includes("___")) {
        [registrationId, participantId] = participantUniqueId.split("___");
      } else {
        const found = programRegistrations
          .flatMap((p) => p.participants)
          .find((pt) => pt.uniqueId === participantUniqueId);
        registrationId = found?.registrationId;
        participantId = found?.participantId;
      }
    }

    // Store change keyed by uniqueId + judgeIdx so multiple judges don't overwrite
    const changeKey = `${participantUniqueId}__j${judgeIdx}`;
    setChanges((prev) => ({
      ...prev,
      [changeKey]: {
        registrationId,
        participantId,
        marks: marksValue,
        judgeIndex: judgeIdx,
      },
    }));
  };

  // Get grade for marks (kept for potential future use but not displayed)
  const getGradeForMarks = (marks) => {
    for (const scheme of gradeSchemes) {
      const [min, max] = scheme.markRange.split("-").map(Number);
      if (marks >= min && marks <= max) {
        return { grade: scheme.grade, points: scheme.points };
      }
    }
    return { grade: "-", points: 0 };
  };

  // handleSave function that properly handles multiple judge marks
  const handleSave = async () => {
    const isManualSave = Object.keys(changes).length > 0;
    const hasAnyMarks = programRegistrations.some(p => p.participants.some(pt => pt.marksByJudges && pt.marksByJudges.some(m => m > 0)));

    if (!isManualSave && !hasAnyMarks) {
      toast.info("No changes or marks to save");
      return;
    }

    try {
      setSaving(true);
      const updatesByRegistration = {};

      if (isManualSave) {
        // Group changes by registration ID AND participant ID (not just registration)
        const updatesByRegistrationAndParticipant = {};

        Object.entries(changes).forEach(([uniqueId, markData]) => {
          const { registrationId, participantId, marks, judgeIndex } = markData;
          if (!registrationId || !participantId) return;

          // Create a key that combines registration and participant safely
          const key = `${registrationId}___${participantId}`;

          if (!updatesByRegistrationAndParticipant[key]) {
            updatesByRegistrationAndParticipant[key] = {
              registrationId,
              participantId,
              marksByJudges: {}, // Store marks by judge index
            };
          }

          // Store the marks for this specific judge
          updatesByRegistrationAndParticipant[key].marksByJudges[judgeIndex] = marks;
        });

        // Convert to the format expected by backend, but merge all judge marks per participant
        Object.values(updatesByRegistrationAndParticipant).forEach(
          ({ registrationId, participantId, marksByJudges }) => {
            if (!updatesByRegistration[registrationId]) {
              updatesByRegistration[registrationId] = [];
            }

            // Find the current participant data to get existing marks
            let existingMarksByJudges = [];

            // Find the participant in current state to get their existing marks
            for (const program of programRegistrations) {
              const participant = program.participants.find(
                (p) =>
                  String(p.registrationId) === String(registrationId) &&
                  String(p.participantId) === String(participantId)
              );
              if (participant) {
                existingMarksByJudges = [...(participant.marksByJudges || [])];
                break;
              }
            }

            // Merge the new marks with existing marks
            Object.entries(marksByJudges).forEach(([judgeIndex, marks]) => {
              existingMarksByJudges[parseInt(judgeIndex)] = marks;
            });

            updatesByRegistration[registrationId].push({
              participantId,
              marksByJudges: existingMarksByJudges, // Send complete marks array
            });
          }
        );
      } else {
        // No manual changes, save all existing marks to trigger backend calculation
        for (const program of programRegistrations) {
          for (const participant of program.participants) {
            if (participant.marksByJudges && participant.marksByJudges.some(m => m > 0)) {
              if (!updatesByRegistration[participant.registrationId]) {
                updatesByRegistration[participant.registrationId] = [];
              }
              updatesByRegistration[participant.registrationId].push({
                participantId: participant.participantId,
                marksByJudges: participant.marksByJudges
              });
            }
          }
        }
      }

      // Convert to the format expected by backend
      const updates = Object.entries(updatesByRegistration).map(
        ([registrationId, participantUpdates]) => ({
          registrationId,
          participantUpdates,
        })
      );

      console.log("Sending updates:", JSON.stringify(updates, null, 2));

      await updateMarks.mutateAsync({
        data: {
          updates,
          ...additionalProps,
        },
      });

      setChanges({});
      await fetchRegistrationsQuery.refetch();

      toast.success("Marks updated successfully!");
    } catch (error) {
      console.error("Error saving marks:", error);
      toast.error(error.message || "Failed to save marks");
    } finally {
      setSaving(false);
    }
  };

  const handleClearAllMarks = async () => {
    if (filteredRegistrations.length === 0) return;
    try {
      const programIds = filteredRegistrations.map(p => p.programId);
      await deleteEvaluation.mutateAsync({
        data: {
          programIds,
        },
      });

      await fetchRegistrationsQuery.refetch();
      toast.success("Marks cleared successfully!");
    } catch (error) {
      console.error("Error clearing marks:", error);
      toast.error(error.message || "Failed to clear marks");
    }
  };

  // Handle print
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Evaluation Sheet - ${
      selectedProgram
        ? programs.find((p) => p._id === selectedProgram)?.name
        : selectedDivision
          ? divisions.find((d) => d._id === selectedDivision)?.name
          : "All Programs"
    }`,
    pageStyle: `
      @page {
        size: A4 portrait;
      }
      @media print {
        body { 
          -webkit-print-color-adjust: exact; 
          font-size: 12px;
          line-height: 1.2;
        }
        .no-print { display: none !important; }
        
        /* Main print container */
        .print-container {
          width: 100%;
          height: 100vh;
        }
        
        /* Program section - exactly half page height */
        .program-section {
          box-sizing: border-box !important;
          height: 50vh !important;
          max-height: 50vh !important;
          overflow: hidden;
          page-break-inside: avoid;
          margin-bottom: 0 !important;
          padding-bottom: 5px;
          display: flex;
          flex-direction: column;
        }
        
        /* Every two program sections should be on a new page */
        .program-section:nth-child(odd) {
          page-break-before: avoid;
        }
        
        .program-section:nth-child(2n+1):not(:first-child) {
          page-break-before: always;
        }
        
        /* Program info header */
        .program-info {
          height: auto !important;
          flex-shrink: 0;
          overflow: visible !important;
          background-color: #f5f5f5 !important;
          border: 1px solid #000 !important;
          padding: 0 !important;
          margin-bottom: 0 !important;
        }
        
        .program-info table {
          width: 100% !important;
          border-collapse: collapse !important;
          border-spacing: 0 !important;
          margin: 0 !important;
        }

        .program-info td {
          border: 1px solid #000 !important;
          padding: 2px 4px !important;
          text-align: center !important;
          font-size: 10px !important;
          font-weight: 600 !important;
          color: #000 !important;
          vertical-align: middle !important;
        }
        
        /* Table container - flexible height */
        .table-container {
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: visible !important;
          border: none !important;
          margin-top: -1px !important;
        }
        
        /* Evaluation table */
        .evaluation-table {
          border-collapse: collapse !important;
          border-spacing: 0 !important;
          border: 1px solid #000 !important;
          width: 100% !important;
          height: 100%;
          font-size: 11px !important;
        }

        /* Disable sticky header in print so column borders don't vanish */
        thead,
        thead tr,
        thead th,
        th {
          position: static !important;
        }
        
        .evaluation-table th,
        .evaluation-table td,
        table th,
        table td {
          border: 1px solid #000 !important;
          border-top: 1px solid #000 !important;
          border-bottom: 1px solid #000 !important;
          border-left: 1px solid #000 !important;
          border-right: 1px solid #000 !important;
          padding: 2px 4px !important;
          text-align: center !important;
          vertical-align: middle !important;
          line-height: 1.1 !important;
          box-sizing: border-box !important;
        }
        
        .evaluation-table th,
        table th {
          background-color: #f5f5f5 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          font-weight: bold !important;
          color: #000 !important;
          height: 22px !important;
          font-size: 10px !important;
          border: 1px solid #000 !important;
        }
        
        .evaluation-table tbody tr,
        .evaluation-table tbody td {
          height: var(--print-row-height, 24px) !important;
          font-size: 10px !important;
        }
        
        /* Signature section */
        .signature-section {
          margin-top: 5px !important;
          flex-shrink: 0;
          font-size: 9px !important;
        }
        
        .signature-section .signature-line {
          border-top: 1px solid #333 !important;
          margin-top: 15px !important;
          padding-top: 2px !important;
        }
      }
    `,
  });

  const clearFilters = () => {
    setSelectedDivision("");
    setSelectedProgram("");
    setStatus("both");
  };

  const hasUnsavedChanges = Object.keys(changes).length > 0;
  const hasAnyMarks = programRegistrations.some(p => p.participants.some(pt => pt.marksByJudges && pt.marksByJudges.some(m => m > 0)));
  const showSaveButton = hasUnsavedChanges || hasAnyMarks;
  const isLoading = fetchRegistrationsQuery.isLoading;

  return (
    <div className="space-y-2 sm:space-y-3">
      <Header
        title="PERFORMANCE EVALUATION"
        subTitle="Manage and Oversee Participant Evaluations"
        className="py-1 mb-0"
        rightAction={
          <div className="hidden sm:flex items-center gap-2">
            <Button
              size="sm"
              onClick={handlePrint}
              disabled={filteredRegistrations.length === 0}
              className="h-9 px-3 gap-1.5 bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 border-transparent shadow-sm btn-print"
              title="Print Program Sheet"
            >
              <Printer className="h-4 w-4" />
              <span>Print</span>
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsDeleteAlertOpen(true)}
              disabled={deleteEvaluation.isPending || !hasAnyMarks || filteredRegistrations.length === 0}
              className="h-9 px-3 gap-1.5"
              title="Delete Marks"
            >
              {deleteEvaluation.isPending ? (
                <Loader className="animate-spin h-4 w-4" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              <span>Delete</span>
            </Button>

            {showSaveButton && (
              <Button
                size="sm"
                onClick={() => setIsSaveAlertOpen(true)}
                disabled={saving}
                className="h-9 px-3 gap-1.5 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                title="Save Marks"
              >
                {saving ? (
                  <Loader className="animate-spin h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>Save</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Controls */}
      <div className="no-print">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          {/* Status & Division (side-by-side on mobile, individual on desktop) */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3 flex-shrink-0">
            <div className="w-full sm:w-32 lg:w-36">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={"both"}>Both</SelectItem>
                  <SelectItem value={"assigned"}>Assigned</SelectItem>
                  <SelectItem value={"not-assigned"}>Not Assigned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-48 lg:w-56">
              <Select
                value={selectedDivision || "all"}
                onValueChange={(v) => setSelectedDivision(v === "all" ? "" : v)}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="All Divisions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Divisions</SelectItem>
                  {divisions.map((division) => (
                    <SelectItem key={division._id} value={division._id}>
                      {division.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Program Dropdown & Clear Button side by side */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              <MultiSelect
                options={formatOptions(filteredPrograms)}
                value={selectedProgram}
                onValueChange={setSelectedProgram}
                placeholder="All Programs"
                multiSelect={false}
                className="h-10 min-h-10 w-full"
              />
            </div>

            {(selectedDivision || selectedProgram || status !== "both") && (
              <Button
                variant="outline"
                size="icon"
                onClick={clearFilters}
                className="h-10 w-10 flex-shrink-0"
                title="Clear Filters"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Judges count selector & Mobile action buttons */}
          <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium whitespace-nowrap text-muted-foreground">
                Judges:
              </span>
              <div className="w-20 sm:w-24">
                <Select
                  value={judgeNumber.toString()}
                  onValueChange={(v) => setJudgeNumber(parseInt(v))}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Mobile Action Buttons (Print, Delete, Save in same row after judges dropdown without text) */}
            <div className="flex sm:hidden items-center gap-1.5 ml-auto">
              <Button
                size="icon"
                onClick={handlePrint}
                disabled={filteredRegistrations.length === 0}
                className="h-10 w-10 shrink-0 bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 border-transparent shadow-sm btn-print"
                title="Print Program Sheet"
              >
                <Printer className="h-4 w-4" />
              </Button>

              <Button
                variant="destructive"
                size="icon"
                onClick={() => setIsDeleteAlertOpen(true)}
                disabled={deleteEvaluation.isPending || !hasAnyMarks || filteredRegistrations.length === 0}
                className="h-10 w-10 shrink-0"
                title="Delete Marks"
              >
                {deleteEvaluation.isPending ? (
                  <Loader className="animate-spin h-4 w-4" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>

              {showSaveButton && (
                <Button
                  size="sm"
                  onClick={() => setIsSaveAlertOpen(true)}
                  disabled={saving}
                  className="h-10 px-3 gap-1.5 shrink-0 bg-green-600 hover:bg-green-700 text-white shadow-sm font-medium"
                  title="Save Marks"
                >
                  {saving ? (
                    <Loader className="animate-spin h-4 w-4" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>Save</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Printable Content */}
      <div ref={printRef} className="print-container pt-2 sm:pt-3">
        {/* Program Tables */}
        {!selectedProgram || judgeNumber === "" ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <FileText className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">
              {!selectedProgram && judgeNumber === ""
                ? "Select a program and number of judges to begin evaluation"
                : !selectedProgram
                ? "Select a program to begin evaluation"
                : "Select number of judges to begin evaluation"}
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2">
              <Loader className="animate-spin h-6 w-6" />
              <span>Loading programs and participants...</span>
            </div>
          </div>
        ) : filteredRegistrations.length > 0 ? (
          <div className="space-y-8 print:space-y-0">
            {filteredRegistrations.map((program, programIndex) => (
              <div
                key={program._id}
                className="program-section"
                style={{
                  "--print-row-height": getPrintRowHeight(
                    program.participants?.length
                  ),
                }}
              >
                {/* Print Header for each sheet */}
                <PrintHeader
                  title="Evaluation Sheet"
                  apiKey={apiKey}
                  isFestival={true}
                />

                {/* Program Header - Attached directly to table below */}
                <div className="program-info relative p-2 sm:p-2.5 bg-muted/60 rounded-t-lg border border-border print:bg-gray-100 print:border print:border-black print:rounded-none print:p-0">
                  {/* Screen View */}
                  <div className="flex print:hidden flex-col sm:flex-row items-center justify-center min-h-[28px] gap-2">
                    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-4 text-xs sm:text-sm font-semibold text-foreground text-center w-full sm:w-auto px-2">
                      <span className="capitalize whitespace-nowrap">
                        <strong>Program:</strong> {program.programName}
                      </span>
                      <span className="hidden sm:inline text-muted-foreground select-none">|</span>
                      <span className="whitespace-nowrap">
                        <strong>Division:</strong> {program.divisionName}
                      </span>
                      <span className="hidden sm:inline text-muted-foreground select-none">|</span>
                      <span className="capitalize whitespace-nowrap">
                        <strong>Type:</strong> {program.programType}
                      </span>
                      <span className="hidden sm:inline text-muted-foreground select-none">|</span>
                      <span className="capitalize whitespace-nowrap">
                        <strong>Category:</strong> {program.programCategory}
                      </span>
                    </div>
                  </div>

                  {/* Print View: Each column heading has its own full border */}
                  <table className="hidden print:table w-full border-collapse border border-black text-xs font-semibold text-black text-center m-0">
                    <tbody>
                      <tr>
                        <td className="border border-black p-1 text-center font-semibold capitalize w-1/4">
                          <strong>Program:</strong> {program.programName}
                        </td>
                        <td className="border border-black p-1 text-center font-semibold w-1/4">
                          <strong>Division:</strong> {program.divisionName}
                        </td>
                        <td className="border border-black p-1 text-center font-semibold capitalize w-1/4">
                          <strong>Type:</strong> {program.programType}
                        </td>
                        <td className="border border-black p-1 text-center font-semibold capitalize w-1/4">
                          <strong>Category:</strong> {program.programCategory}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Participants Table with Horizontal Scroll - Attached directly to header above */}
                <div
                  className="table-container border border-border rounded-b-lg overflow-hidden print:rounded-none print:border-0 print:overflow-visible"
                  style={{
                    "--print-row-height": getPrintRowHeight(
                      program.participants?.length
                    ),
                  }}
                >
                  <div className="overflow-x-auto print:overflow-visible h-full">
                    <Table
                      className="min-w-full evaluation-table border-collapse h-full"
                      style={{
                        "--print-row-height": getPrintRowHeight(
                          program.participants?.length
                        ),
                      }}
                    >
                      <TableHeader className="print:static">
                        <TableRow className="print:static">
                          <TableHead className="w-12 print:w-12 text-center align-middle whitespace-nowrap border border-border print:border print:border-black print:font-bold print:bg-gray-100 print:text-black print:text-xs">
                            Sl.
                          </TableHead>

                          <TableHead className="w-20 print:w-20 text-center align-middle whitespace-nowrap border border-border print:border print:border-black print:font-bold print:bg-gray-100 print:text-black print:text-xs">
                            Code Letter
                          </TableHead>

                          {/* Dynamic judge columns — one per judge */}
                          {Array.from({ length: judgeNumber }, (_, i) => (
                            <TableHead
                              key={i}
                              className="w-28 print:w-auto text-center align-middle whitespace-nowrap border border-border print:border print:border-black print:font-bold print:bg-gray-100 print:text-black print:text-xs"
                            >
                              Judge {i + 1} Marks
                            </TableHead>
                          ))}

                          <TableHead className="w-20 print:w-20 text-center align-middle whitespace-nowrap border border-border print:border print:border-black print:font-bold print:bg-gray-100 print:text-black print:text-xs">
                            Total
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {program.participants.length > 0 ? (
                          program.participants
                            .sort((a, b) =>
                              a.codeLetter.localeCompare(b.codeLetter)
                            )
                            .map((participant, displayIndex) => {
                              return (
                                <TableRow key={participant.uniqueId}>
                                  <TableCell className="text-center align-middle font-medium whitespace-nowrap border border-border print:border print:border-black print:text-xs print:p-1">
                                    {displayIndex + 1}
                                  </TableCell>

                                  <TableCell className="text-center align-middle font-bold whitespace-nowrap border border-border print:border print:border-black print:text-xs print:p-1">
                                    {participant.codeLetter || "-"}
                                  </TableCell>

                                  {/* One input cell per judge */}
                                  {Array.from({ length: judgeNumber }, (_, judgeIdx) => {
                                    const rawMark = participant.marksByJudges?.[judgeIdx];
                                    const judgeMarks = (rawMark !== undefined && rawMark !== null && rawMark !== "" && rawMark > 0) ? rawMark : "";
                                    return (
                                      <TableCell
                                        key={judgeIdx}
                                        className="text-center align-middle border border-border print:border print:border-black print:p-1"
                                      >
                                        <div className="hidden print:block font-bold whitespace-nowrap print:text-xs print:text-black text-center">
                                          {judgeMarks !== "" ? judgeMarks : "—"}
                                        </div>
                                        <Input
                                          type="number"
                                          min="0"
                                          max="100"
                                          value={judgeMarks}
                                          onChange={(e) =>
                                            handleMarksChange(
                                              participant.uniqueId,
                                              e.target.value,
                                              judgeIdx,
                                              participant.registrationId,
                                              participant.participantId
                                            )
                                          }
                                          onKeyDown={(e) =>
                                            handleMarkKeyDown(e, participant.uniqueId, judgeIdx)
                                          }
                                          data-mark-uid={participant.uniqueId}
                                          data-mark-judge={judgeIdx}
                                          className="no-print w-16 sm:w-20 text-center text-sm mx-auto font-medium font-sans"
                                          placeholder="0-100"
                                        />
                                      </TableCell>
                                    );
                                  })}

                                  <TableCell className="text-center align-middle font-medium whitespace-nowrap border border-border print:border print:border-black print:p-1">
                                    <div className="no-print flex items-center justify-center">
                                      {participant.averageMarks > 0 ? (
                                        <Badge
                                          variant={
                                            participant.averageMarks >= 75
                                              ? "default"
                                              : participant.averageMarks >= 50
                                                ? "secondary"
                                                : "destructive"
                                          }
                                        >
                                          {participant.averageMarks}
                                        </Badge>
                                      ) : (
                                        "-"
                                      )}
                                    </div>
                                    <div className="hidden print:block font-bold text-center print:text-xs print:text-black">
                                      {participant.averageMarks > 0 ? participant.averageMarks : "—"}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={judgeNumber + 3}
                              className="text-center py-6 text-muted-foreground border border-border print:border print:border-black print:py-2"
                            >
                              No participants found for this program
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Judge Signatures */}
                {judgeNumber > 0 && (
                  <div className="signature-section grid mt-4 sm:mt-6 gap-4 sm:gap-6 print:mt-1 print:gap-2" style={{ gridTemplateColumns: `repeat(${judgeNumber}, minmax(0, 1fr))` }}>
                    {Array.from({ length: judgeNumber }, (_, i) => {
                      const judgeNum = i + 1;
                      const assignment = judgeAssignments.find(
                        (ja) => (ja.programId?._id === program._id || ja.programId === program._id) && ja.judgeNumber === judgeNum
                      );
                      return (
                        <div key={i} className="text-center">
                          <div className="mb-1 font-semibold text-xs print:text-[10px]">Judge {judgeNum}</div>
                          <div className="mt-1 mx-auto w-3/4 max-w-[200px] border-b border-foreground/30 print:border-black pb-0.5">
                            <div className="text-xs print:text-[9px]">
                              Name & Signature : {assignment ? <span className="font-semibold">{assignment.judgeName}</span> : ""}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold">No Programs Found</h3>
            <p className="text-muted-foreground">
              {selectedDivision || selectedProgram
                ? "No programs with participants found for the selected filters."
                : "No programs with registered participants available."}
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Popup */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="sm:max-w-lg flex flex-col p-0 gap-0 overflow-hidden rounded-2xl [&>button.absolute]:hidden">
          <AlertDialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-destructive/5 dark:bg-destructive/10 sticky top-0 z-20 backdrop-blur-md shrink-0 text-left">
            <div className="p-2 rounded-lg bg-destructive/10 shrink-0">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1 text-left space-y-0.5">
              <AlertDialogTitle className="text-xl font-bold m-0 text-destructive">
                Clear All Marks?
              </AlertDialogTitle>
              <AlertDialogDescription className="m-0 text-sm text-muted-foreground pt-1">
                This will remove all marks submitted by judges for the currently displayed programs. This action cannot be undone.
              </AlertDialogDescription>
            </div>
            <AlertDialogCancel asChild>
              <button className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </AlertDialogCancel>
          </AlertDialogHeader>
          <AlertDialogFooter className="p-5 border-t bg-muted/20 flex justify-between gap-4 sm:space-x-0">
            <AlertDialogCancel className="flex-1 mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground flex-1"
              onClick={handleClearAllMarks}
              disabled={deleteEvaluation.isPending}
            >
              {deleteEvaluation.isPending ? (
                <Loader className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Clear Marks
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save / Update Confirmation Popup */}
      <AlertDialog open={isSaveAlertOpen} onOpenChange={setIsSaveAlertOpen}>
        <AlertDialogContent className="sm:max-w-lg flex flex-col p-0 gap-0 overflow-hidden rounded-2xl [&>button.absolute]:hidden">
          <AlertDialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-green-500/10 dark:bg-green-500/20 sticky top-0 z-20 backdrop-blur-md shrink-0 text-left">
            <div className="p-2 rounded-lg bg-green-500/20 shrink-0">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-500" />
            </div>
            <div className="flex-1 text-left space-y-0.5">
              <AlertDialogTitle className="text-xl font-bold m-0 text-green-600 dark:text-green-500">
                Save & Update Marks?
              </AlertDialogTitle>
              <AlertDialogDescription className="m-0 text-sm text-muted-foreground pt-1">
                Are you sure you want to save and update the evaluation marks? This will recalculate participant results and rankings.
              </AlertDialogDescription>
            </div>
            <AlertDialogCancel asChild>
              <button className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </AlertDialogCancel>
          </AlertDialogHeader>
          <AlertDialogFooter className="p-5 border-t bg-muted/20 flex justify-between gap-4 sm:space-x-0">
            <AlertDialogCancel className="flex-1 mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700 text-white flex-1"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Loader className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Marks
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }

          /* Ensure exactly two sheets per page */
          .program-section {
            height: 50vh !important;
            max-height: 50vh !important;
            overflow: hidden;
            page-break-inside: avoid;
            margin-bottom: 0 !important;
            display: flex;
            flex-direction: column;
          }

          /* Page breaks for every two sheets */
          .program-section:nth-child(2n + 1):not(:first-child) {
            page-break-before: always;
          }

          .program-info {
            background-color: #f5f5f5 !important;
            border: 1px solid #000 !important;
            padding: 0 !important;
            margin-bottom: 0 !important;
          }

          .program-info table {
            width: 100% !important;
            border-collapse: collapse !important;
            border-spacing: 0 !important;
            margin: 0 !important;
          }

          .program-info td {
            border: 1px solid #000 !important;
            padding: 2px 4px !important;
            text-align: center !important;
            font-size: 10px !important;
            font-weight: 600 !important;
            color: #000 !important;
            vertical-align: middle !important;
          }

          .table-container {
            border: none !important;
            margin-top: -1px !important;
            overflow: visible !important;
          }

          .evaluation-table {
            border-collapse: collapse !important;
            border-spacing: 0 !important;
            border: 1px solid #000 !important;
            width: 100% !important;
          }

          thead,
          thead tr,
          thead th,
          th {
            position: static !important;
          }

          .evaluation-table th,
          .evaluation-table td,
          table th,
          table td {
            border: 1px solid #000 !important;
            border-top: 1px solid #000 !important;
            border-bottom: 1px solid #000 !important;
            border-left: 1px solid #000 !important;
            border-right: 1px solid #000 !important;
            padding: 2px 4px !important;
            text-align: center !important;
            vertical-align: middle !important;
            line-height: 1.2 !important;
            box-sizing: border-box !important;
          }

          .evaluation-table th,
          table th {
            background-color: #f5f5f5 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-weight: bold !important;
            color: #000 !important;
            height: 22px !important;
            font-size: 10px !important;
            border: 1px solid #000 !important;
          }

          .evaluation-table tbody tr,
          .evaluation-table tbody td {
            height: var(--print-row-height, 24px) !important;
            font-size: 10px !important;
          }
        }

        /* Center all evaluation table header and body cells */
        .evaluation-table th,
        .evaluation-table td {
          vertical-align: middle !important;
          text-align: center !important;
        }

        /* Mobile table scrolling styles */
        @media (max-width: 768px) {
          .overflow-x-auto {
            -webkit-overflow-scrolling: touch;
          }
        }
      `}</style>
    </div>
  );
};

export default EvaluationComponent;
