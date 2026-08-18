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
import { toast } from "sonner";
import { Save, Printer, X, Loader, Trash2, Filter, AlertTriangle } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import useCrud from "@/hooks/use-crud";
import PrintHeader from "./PrintHeader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

// Per-program print wrapper component
const ProgramPrintWrapper = ({ program, apiKey, children }) => {
  const programPrintRef = useRef();
  const handleProgramPrint = useReactToPrint({
    contentRef: programPrintRef,
    documentTitle: `Code Letters - ${program.programName}`,
    pageStyle: `
      @page { size: A4 portrait; margin: 0.5in; }
      @media print {
        body { -webkit-print-color-adjust: exact; font-size: 12px; }
        .no-print { display: none !important; }
        table { border-collapse: collapse !important; border: 1px solid #000 !important; width: 100% !important; }
        table th, table td { border: 1px solid #000 !important; padding: 2px 4px !important; text-align: center !important; vertical-align: middle !important; font-size: 10px !important; }
        table th { background-color: #f5f5f5 !important; font-weight: bold !important; color: #000 !important; }
        .code-letter-cell { text-align: center !important; font-weight: bold !important; }
        .participant-name-col { text-align: left !important; }
        .sign-column { width: 60px !important; }
      }
    `,
  });
  return children({ programPrintRef, handleProgramPrint });
};

const CodeLettersComponent = ({
  divisions = [],
  apiKey,
  additionalProps = {},
}) => {
  const [programs, setPrograms] = useState([]);
  const [filteredPrograms, setFilteredPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [status, setStatus] = useState("both");
  const [category, setCategory] = useState("both");
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState({});
  const [page, setPage] = useState(0);

  const printRef = useRef();

  // Use CRUD operations
  const { useFetchItems } = useCrud("program-registration", apiKey);
  const { useUpdateItem: useCodeLetterUpdate, useDeleteItem } = useCrud(
    "code-letters",
    apiKey
  );

  const updateCodeLetters = useCodeLetterUpdate();
  const deleteCodeLetter = useDeleteItem();

  // Fetch registrations with program details
  const fetchRegistrationsQuery = useFetchItems(
    page,
    1000,
    {
      ...(selectedDivision && { divisionId: selectedDivision }),
    },
    {
      retry: 2,
      retryDelay: 1000,
    }
  );

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
        divisionId,
        divisionName,
        teamName,
        teamId,
        participantsDetails = [],
        status,
      } = registration;

      if (!programMap.has(programId)) {
        programMap.set(programId, {
          _id: programId,
          programId,
          programName,
          programType,
          programCategory,
          divisionId,
          divisionName,
          participants: [],
          hasEvaluatedParticipants: status === "Evaluated",
        });
      }

      const program = programMap.get(programId);

      // Add participants with additional info
      participantsDetails.forEach((participant, index) => {
        program.participants.push({
          ...participant,
          registrationId,
          teamId,
          teamName,
          participantIndex: index,
          uniqueId: `${registrationId}-${index}`, // Unique identifier for each participant
          isEvaluated: (participant.totalMarks || 0) > 0,
        });
      });

      // Check if any participant is evaluated
      if (participantsDetails.some((p) => (p.totalMarks || 0) > 0)) {
        program.hasEvaluatedParticipants = true;
      }
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
      setPrograms(processedPrograms);
      setFilteredPrograms(processedPrograms);
    }
  }, [fetchRegistrationsQuery.data, processRegistrationsToPrograms]);

  const programsData = useMemo(() => {
    if (!fetchRegistrationsQuery?.data?.registrations) return [];

    const seen = new Set();
    return fetchRegistrationsQuery.data.registrations
      .map((program) => ({
        _id: program.programId,
        name: program.programName,
        divisionId: program.divisionId,
        programCategory: program.programCategory,
      }))
      .sort((a, b) => a.name?.localeCompare(b.name))
      .filter(
        (program) =>
          program.divisionId === selectedDivision &&
          !seen.has(program._id) &&
          seen.add(program._id) &&
          (category === "both" || program.programCategory === category)
      );
  }, [fetchRegistrationsQuery.data, selectedDivision, category]);

  // Filter programs by division
  useEffect(() => {
    if (selectedDivision || selectedProgram || status || category) {
      setFilteredPrograms(
        programs
          ?.sort((a, b) => a.programName.localeCompare(b.programName))
          .filter(
            (program) =>
              (!selectedDivision || program.divisionId === selectedDivision) &&
              (!selectedProgram || program._id === selectedProgram) &&
              (status === "both" ||
                (status === "assigned" &&
                  program.participants?.some(
                    (p) => p.codeLetter?.trim() !== ""
                  )) ||
                (status === "not-assigned" &&
                  !program.participants?.some(
                    (p) => p.codeLetter?.trim() !== ""
                  ))) &&
              (category === "both" || program.programCategory === category)
          )
      );
    } else {
      setFilteredPrograms(programs);
    }
  }, [selectedDivision, selectedProgram, programs, status, category]);

  // Flat ordered list of non-evaluated participant uniqueIds for Enter-key navigation
  const codeLetterInputIds = useMemo(() => {
    const ids = [];
    filteredPrograms.forEach((program) => {
      [...program.participants]
        .sort((a, b) => a.chestNumber - b.chestNumber)
        .forEach((participant) => {
          if (!participant.isEvaluated) {
            ids.push(participant.uniqueId);
          }
        });
    });
    return ids;
  }, [filteredPrograms]);

  // Handle code letter change for individual participant
  const handleCodeLetterChange = (participantUniqueId, value) => {
    const updatedPrograms = programs.map((program) => ({
      ...program,
      participants: program.participants.map((participant) =>
        participant.uniqueId === participantUniqueId
          ? { ...participant, codeLetter: value }
          : participant
      ),
    }));

    setPrograms(updatedPrograms);

    // Update filtered programs as well
    const updatedFilteredPrograms = filteredPrograms.map((program) => ({
      ...program,
      participants: program.participants.map((participant) =>
        participant.uniqueId === participantUniqueId
          ? { ...participant, codeLetter: value }
          : participant
      ),
    }));
    setFilteredPrograms(updatedFilteredPrograms);

    setChanges((prev) => ({
      ...prev,
      [participantUniqueId]: value,
    }));
  };

  // Move focus to the next code letter input when Enter is pressed
  const handleCodeLetterKeyDown = (e, participantUniqueId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentIndex = codeLetterInputIds.indexOf(participantUniqueId);
      const nextId = codeLetterInputIds[currentIndex + 1];
      if (nextId) {
        const nextInput = document.querySelector(
          `input[data-codeletter-id="${nextId}"]`
        );
        if (nextInput) nextInput.focus();
      }
    }
  };

  // Save changes
  const handleSave = async () => {
    if (Object.keys(changes).length === 0) {
      toast.info("No changes to save");
      return;
    }

    try {
      setSaving(true);

      // Group changes by registration and participant
      const updatesByRegistration = {};

      Object.entries(changes).forEach(([participantUniqueId, codeLetter]) => {
        const [registrationId, participantIndex] =
          participantUniqueId.split("-");

        if (!updatesByRegistration[registrationId]) {
          updatesByRegistration[registrationId] = {};
        }

        updatesByRegistration[registrationId][participantIndex] = codeLetter
          .trim()
          .toUpperCase();
      });

      const updates = Object.entries(updatesByRegistration).map(
        ([registrationId, participantUpdates]) => ({
          registrationId,
          participantUpdates,
        })
      );

      await updateCodeLetters.mutateAsync({
        data: {
          updates,
          ...additionalProps,
        },
      });

      setChanges({});
      await fetchRegistrationsQuery.refetch();

      toast.success("Code letters updated successfully!");
    } catch (error) {
      console.error("Error saving code letters:", error);
      toast.error(error.message || "Failed to save code letters");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (programId) => {
    try {
      await deleteCodeLetter.mutateAsync({
        data: {
          programId,
        },
      });

      await fetchRegistrationsQuery.refetch();
      toast.success("Code letters deleted successfully!");
    } catch (error) {
      console.error("Error deleting code letters:", error);
      toast.error(error.message || "Failed to delete code letters");
    }
  };

  const [deletingAll, setDeletingAll] = useState(false);
  const handleDeleteAll = async () => {
    try {
      setDeletingAll(true);
      const nonEvaluated = filteredPrograms.filter(
        (p) => !p.hasEvaluatedParticipants
      );
      await Promise.all(
        nonEvaluated.map((program) =>
          deleteCodeLetter.mutateAsync({ data: { programId: program.programId } })
        )
      );
      await fetchRegistrationsQuery.refetch();
      toast.success("All code letters deleted successfully!");
    } catch (error) {
      console.error("Error deleting all code letters:", error);
      toast.error(error.message || "Failed to delete all code letters");
    } finally {
      setDeletingAll(false);
    }
  };

  // Handle print
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Participant Code Letters - ${
      selectedDivision && selectedProgram
        ? divisions.find((d) => d._id === selectedDivision)?.name +
          " - " +
          programs.find((p) => p._id === selectedProgram)?.programName
        : "All Divisions"
    }`,
    pageStyle: `
      @page { 
        size: A4 portrait; 
        margin: 0.5in;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          font-size: 12px;
          line-height: 1.2;
        }
        .no-print {
          display: none !important;
        }
        
        .print-container {
          width: 100%;
          height: 100vh;
        }
        
        /* Program section - exactly half page height */
        .program-section {
          height: 50vh !important;
          max-height: 50vh !important;
          overflow: hidden;
          page-break-inside: avoid;
          margin-bottom: 0 !important;
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
          overflow: hidden;
          font-size: 10px !important;
        }
        
        /* Table container - flexible height */
        .table-container {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        
        /* Compact table for participants */
        table {
          border-collapse: collapse !important;
          border: 1px solid #000 !important;
          width: 100% !important;
        }
        
        table th, table td {
          border: 1px solid #000 !important;
          padding: 2px 4px !important;
          text-align: center !important;
          vertical-align: middle !important;
          line-height: 1.1 !important;
          height: 25px !important;
          overflow: hidden;
          font-size: 10px !important;
        }
        
        
        table th {
          background-color: #f5f5f5 !important;
          height: 16px !important;
          font-weight: bold !important;
          color: #000 !important;
        }
        table td {
          
          font-weight: semibold !important;
        }
        
        
        /* Code letter cell - center alignment for print */
        .code-letter-cell {
          text-align: center !important;
          font-weight: bold !important;
          font-size: 10px !important;
        }
        
        /* Participant name column - left alignment for print */
        .participant-name-col {
          text-align: left !important;
        }
        
        /* Sign column width */
        .sign-column {
          width: 60px !important;
        }
        
       
      }
    `,
  });

  const clearFilter = () => {
    setSelectedDivision("");
    setSelectedProgram("");
  };

  const hasUnsavedChanges = Object.keys(changes).length > 0;
  const isLoading = fetchRegistrationsQuery.isLoading;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="no-print">
        <div className="flex flex-col sm:flex-row flex-wrap lg:flex-nowrap items-center w-full gap-2">
          {/* Top row on mobile: Filter icon, Stage, Division */}
          <div className="flex items-center w-full sm:w-auto gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 sm:hidden">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setStatus('both')} className={status === 'both' ? 'font-bold' : ''}>
                  Both
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatus('assigned')} className={status === 'assigned' ? 'font-bold' : ''}>
                  Assigned
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatus('not-assigned')} className={status === 'not-assigned' ? 'font-bold' : ''}>
                  Not Assigned
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Desktop Status Select */}
            <div className="hidden sm:block">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-auto min-w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={"both"}>Both</SelectItem>
                  <SelectItem value={"assigned"}>Assigned</SelectItem>
                  <SelectItem value={"not-assigned"}>Not Assigned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="flex-1 sm:flex-none sm:w-auto sm:min-w-[120px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={"both"}>Both</SelectItem>
                <SelectItem value={"Stage"}>Stage</SelectItem>
                <SelectItem value={"Off-Stage"}>Off-Stage</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={selectedDivision || "all"}
              onValueChange={(v) => setSelectedDivision(v === "all" ? "" : v)}
            >
              <SelectTrigger className="flex-1 sm:flex-none sm:w-auto sm:min-w-[140px]">
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

          {/* Bottom row on mobile / Right side on desktop: Program select + Delete All / Print All */}
          <div className="flex items-center gap-2 w-full sm:w-auto flex-[2] sm:min-w-[160px]">
            <MultiSelect
              options={formatOptions(programsData)}
              value={selectedProgram}
              onValueChange={setSelectedProgram}
              placeholder="All Programs"
              multiSelect={false}
              className="flex-1"
            />
            {(selectedDivision || selectedProgram) && (
              <Button variant="outline" size="icon" onClick={clearFilter}>
                <X className="h-4 w-4" />
              </Button>
            )}
            {/* Delete All */}
            {filteredPrograms.some((p) => !p.hasEvaluatedParticipants) && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deletingAll}
                    className="whitespace-nowrap"
                  >
                    {deletingAll ? (
                      <Loader className="animate-spin h-4 w-4 sm:mr-1" />
                    ) : (
                      <Trash2 className="h-4 w-4 sm:mr-1" />
                    )}
                    <span className="hidden sm:inline">Delete All</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="sm:max-w-lg flex flex-col p-0 gap-0 [&>button.absolute]:hidden overflow-hidden">
                  <AlertDialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md shrink-0">
                    <div className="p-2 rounded-lg bg-destructive/10 shrink-0">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="flex-1 text-left space-y-0.5">
                      <AlertDialogTitle className="text-xl font-bold m-0 text-foreground">
                        Delete All Code Letters?
                      </AlertDialogTitle>
                      <AlertDialogDescription asChild>
                        <div className="text-sm text-muted-foreground m-0">
                          This will delete code letters for all non-evaluated programs currently shown. This action cannot be undone.
                        </div>
                      </AlertDialogDescription>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <AlertDialogCancel className="p-1.5 -mr-1.5 ml-1 rounded-lg border-none hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none bg-transparent h-auto mt-0">
                        <X className="h-5 w-5" />
                      </AlertDialogCancel>
                    </div>
                  </AlertDialogHeader>
                  <div className="p-5 flex flex-col gap-4">
                    <AlertDialogFooter className="flex justify-between gap-4 mt-2 sm:justify-between w-full">
                      <AlertDialogCancel className="flex-1 mt-0">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/80 hover:text-destructive-foreground flex-1">
                        Delete All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {/* Print All */}
            <Button
              variant="default"
              size="sm"
              onClick={handlePrint}
              disabled={filteredPrograms.length === 0}
              className="whitespace-nowrap"
            >
              <Printer className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Print All</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Printable Content */}
      <div ref={printRef} className="print-container">
        {/* Program Tables */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12 print:py-0">
            <div className="flex items-center space-x-2">
              <Loader className="animate-spin h-6 w-6" />
              <span>Loading programs and participants...</span>
            </div>
          </div>
        ) : filteredPrograms.length > 0 ? (
          <div className="space-y-8 print:space-y-0">
            {filteredPrograms.map((program, programIndex) => (
              <ProgramPrintWrapper key={program._id} program={program} apiKey={apiKey}>
                {({ programPrintRef, handleProgramPrint }) => (
                  <div className="program-section">
                    {(() => {
                      const deleteButton = !program?.hasEvaluatedParticipants ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={deleteCodeLetter.isPending}
                            >
                              {deleteCodeLetter.isPending ? (
                                <Loader className="animate-spin h-4 w-4" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="sm:max-w-lg flex flex-col p-0 gap-0 [&>button.absolute]:hidden overflow-hidden">
                            <AlertDialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md shrink-0">
                              <div className="p-2 rounded-lg bg-destructive/10 shrink-0">
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                              </div>
                              <div className="flex-1 text-left space-y-0.5">
                                <AlertDialogTitle className="text-xl font-bold m-0 text-foreground">
                                  Delete code letters for &quot;{program.programName}&quot;?
                                </AlertDialogTitle>
                                <AlertDialogDescription asChild>
                                  <div className="text-sm text-muted-foreground m-0">
                                    This action cannot be undone.
                                  </div>
                                </AlertDialogDescription>
                              </div>
                              <div className="flex items-center gap-1 sm:gap-2">
                                <AlertDialogCancel className="p-1.5 -mr-1.5 ml-1 rounded-lg border-none hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none bg-transparent h-auto mt-0">
                                  <X className="h-5 w-5" />
                                </AlertDialogCancel>
                              </div>
                            </AlertDialogHeader>
                            <div className="p-5 flex flex-col gap-4">
                              <AlertDialogFooter className="flex justify-between gap-4 mt-2 sm:justify-between w-full">
                                <AlertDialogCancel className="flex-1 mt-0">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(program.programId)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/80 hover:text-destructive-foreground flex-1"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </div>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : null;

                      return (
                        <>
                          {/* Program heading + table: all inside programPrintRef so PrintHeader is captured per-program */}
                          <div ref={programPrintRef}>
                            {/* PrintHeader appears in per-program print */}
                            <PrintHeader
                              apiKey={apiKey}
                              isFestival={true}
                              title="CALL LIST"
                            />
                            {/* Program info + action buttons */}
                            <div className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[1fr_auto_1fr] items-center gap-2 bg-muted/60 border border-border rounded-t-lg px-3 py-2 print:bg-gray-200 print:border-black print:rounded-none">
                              {/* Left: Mobile Delete Button */}
                              <div className="col-start-1 flex items-center justify-start no-print shrink-0">
                                <div className="sm:hidden">
                                  {deleteButton}
                                </div>
                              </div>

                              {/* Center: 4 line text on mobile, pipe-separated inline on desktop */}
                              <div className="col-start-2 flex flex-col sm:flex-row items-center justify-center gap-0 text-xs sm:text-sm font-semibold text-foreground print:text-black print:text-xs text-center">
                                {/* Mobile: each on its own line */}
                                <span className="block sm:hidden capitalize">
                                  <strong>Program:</strong> {program.programName}
                                </span>
                                <span className="block sm:hidden">
                                  <strong>Division:</strong> {program.divisionName}
                                </span>
                                <span className="block sm:hidden capitalize">
                                  <strong>Type:</strong> {program.programType}
                                </span>
                                <span className="block sm:hidden capitalize">
                                  <strong>Category:</strong> {program.programCategory}
                                </span>
                                {/* Desktop: pipe-separated inline, centred */}
                                <div className="hidden sm:flex items-center">
                                  <span className="capitalize whitespace-nowrap pr-2">
                                    <strong>Program:</strong> {program.programName}
                                  </span>
                                  <span className="text-muted-foreground select-none">|</span>
                                  <span className="whitespace-nowrap px-2">
                                    <strong>Division:</strong> {program.divisionName}
                                  </span>
                                  <span className="text-muted-foreground select-none">|</span>
                                  <span className="capitalize whitespace-nowrap px-2">
                                    <strong>Type:</strong> {program.programType}
                                  </span>
                                  <span className="text-muted-foreground select-none">|</span>
                                  <span className="capitalize whitespace-nowrap pl-2">
                                    <strong>Category:</strong> {program.programCategory}
                                  </span>
                                </div>
                              </div>

                              {/* Right: Print button (mobile + desktop), Delete button (desktop only) */}
                              <div className="col-start-3 flex items-center justify-end gap-1 sm:gap-2 no-print shrink-0">
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={handleProgramPrint}
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                                <div className="hidden sm:block">
                                  {deleteButton}
                                </div>
                              </div>
                            </div>

                      {/* Scrollable table - separate from the heading */}
                      <div className="table-container border border-t-0 border-border rounded-b-lg overflow-hidden print:rounded-none print:border-black">
                        <div className="overflow-x-auto print:overflow-visible h-full">
                          <Table className="min-w-full">
                            <TableHeader>
                              {/* Column headers */}
                              <TableRow>
                                <TableHead className="w-12 text-center whitespace-nowrap border-t border-r border-border print:border-black">
                                  Sl.
                                </TableHead>
                                <TableHead className="w-24 text-center whitespace-nowrap border-t border-r border-border print:border-black">
                                  Chest No.
                                </TableHead>
                                <TableHead className="min-w-[150px] whitespace-nowrap border-t border-r border-border print:border-black participant-name-col">
                                  Participant Name
                                </TableHead>
                                <TableHead className="min-w-[120px] whitespace-nowrap border-t border-r border-border print:border-black">
                                  Team
                                </TableHead>
                                <TableHead className="w-32 text-center whitespace-nowrap border-t border-r border-border print:border-black">
                                  Code Letter
                                </TableHead>
                                <TableHead className="w-20 text-center whitespace-nowrap border-t border-r border-border hidden print:table-cell print:border-black sign-column">
                                  Sign
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                          <TableBody>
                            {program.participants.length > 0 ? (
                              program.participants
                                ?.sort((a, b) => a.chestNumber - b.chestNumber)
                                .map((participant, index) => (
                                  <TableRow key={participant.uniqueId}>
                                    <TableCell className="text-center font-medium border-t border-r border-border print:border-black">
                                      {index + 1}
                                    </TableCell>
                                    <TableCell className="text-center border-t border-r border-border print:border-black">
                                      {participant.chestNumber || "-"}
                                    </TableCell>
                                    <TableCell className="font-medium border-t border-r whitespace-nowrap border-border print:border-black participant-name-col">
                                      {participant.name || "N/A"}
                                    </TableCell>
                                    <TableCell className="border-t border-r border-border print:border-black">
                                      {participant.teamName || "N/A"}
                                    </TableCell>
                                    <TableCell className="text-center border-t border-r border-border p-0 print:border-black code-letter-cell">
                                      <span className="hidden print:inline font-bold whitespace-nowrap">
                                        {participant.codeLetter || ""}
                                      </span>
                                      {participant.isEvaluated ? (
                                        <span className="no-print font-medium p-2 text-red-600 whitespace-nowrap">
                                          {participant.codeLetter || "-"}
                                        </span>
                                      ) : (
                                        <Input
                                          value={participant.codeLetter || ""}
                                          onChange={(e) =>
                                            handleCodeLetterChange(
                                              participant.uniqueId,
                                              e.target.value.toUpperCase()
                                            )
                                          }
                                          onKeyDown={(e) =>
                                            handleCodeLetterKeyDown(e, participant.uniqueId)
                                          }
                                          data-codeletter-id={participant.uniqueId}
                                          className="no-print min-w-full min-h-full rounded-none border-none m-0 p-0 text-center text-sm mx-auto"
                                          maxLength={5}
                                          placeholder="Code"
                                        />
                                      )}
                                    </TableCell>
                                    <TableCell className="text-center hidden print:table-cell whitespace-nowrap border-t border-r border-border print:border-black">
                                      <div className="h-6 w-16 mx-auto"></div>
                                    </TableCell>
                                  </TableRow>
                                ))
                            ) : (
                              <TableRow>
                                <TableCell
                                  colSpan={6}
                                  className="text-center py-6 text-muted-foreground print:border-black"
                                >
                                  No participants found for this program
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    </div>{/* end programPrintRef */}

                    {/* Save button below table */}
                    {hasUnsavedChanges && (
                      <div className="no-print flex justify-end mt-2">
                        <Button
                          onClick={handleSave}
                          disabled={saving}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {saving
                            ? "Saving..."
                            : `Save (${Object.keys(changes).length})`}
                        </Button>
                      </div>
                    )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </ProgramPrintWrapper>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold">No Programs Found</h3>
            <p className="text-muted-foreground">
              {selectedDivision
                ? "No programs with participants found for the selected division."
                : "No programs with registered participants available."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeLettersComponent;
