"use client";
import { useState, useEffect, useRef, useCallback } from "react";
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
  Users,
  FileText,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import useCrud from "@/hooks/use-crud";
import PrintHeader from "./PrintHeader";

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
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState({});
  const [page, setPage] = useState(0);
  const [judgeNumber, setJudgeNumber] = useState(1);

  const printRef = useRef();

  // Use CRUD operations
  const { useFetchItems } = useCrud("program-registration", apiKey);
  const { useUpdateItem: useMarksUpdate } = useCrud("evaluation", apiKey);

  const updateMarks = useMarksUpdate();

  // Fetch registrations with program details
  const fetchRegistrationsQuery = useFetchItems(
    page,
    1000,
    {
      ...(selectedDivision && { divisionId: selectedDivision }),
      ...(selectedProgram && { programId: selectedProgram }),
      isCodeLetter: true,
      isResultDeclared: "false",
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
        pointScheme,
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
          pointScheme,
          divisionId,
          divisionName,
          participants: [],
          hasEvaluatedParticipants: false,
        });
      }

      const program = programMap.get(programId);

      // Add participants with additional info
      participantsDetails.forEach((participant, index) => {
        const participantData = {
          ...participant,
          registrationId,
          teamId,
          teamName,
          participantIndex: index,
          uniqueId: `${registrationId}-${index}`,
          participantDetails: participant.participantDetails || {
            name: participant.name || "Unknown",
            chestNumber: participant.chestNumber || "N/A",
            age: participant.age || "N/A",
          },
          marksByJudges: participant.marksByJudges || [],
          totalMarks: participant.totalMarks || 0,
          averageMarks: participant.averageMarks || 0,
          isEvaluated: (participant.totalMarks || 0) > 0,
        };

        program.participants.push(participantData);

        if ((participant.totalMarks || 0) > 0) {
          program.hasEvaluatedParticipants = true;
        }
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

    setFilteredRegistrations(filtered);
  }, [selectedDivision, selectedProgram, programRegistrations]);

  // Get available programs for selected division
  const availablePrograms = selectedDivision
    ? programs.filter((p) => p.divisionId === selectedDivision)
    : programs;

  // Handle marks change for individual participant
  const handleMarksChange = (participantUniqueId, marks) => {
    const marksValue = Math.max(0, Math.min(100, parseInt(marks) || 0));

    const updatedPrograms = programRegistrations.map((program) => ({
      ...program,
      participants: program.participants.map((participant) => {
        if (participant.uniqueId === participantUniqueId) {
          const updatedMarksByJudges = [...(participant.marksByJudges || [])];
          updatedMarksByJudges[judgeNumber - 1] = marksValue;

          // Calculate average marks
          const validMarks = updatedMarksByJudges.filter(
            (m) => m !== undefined && m !== null
          );
          const averageMarks =
            validMarks.length > 0
              ? Math.round(
                  validMarks.reduce((sum, mark) => sum + mark, 0) /
                    validMarks.length
                )
              : 0;

          return {
            ...participant,
            marksByJudges: updatedMarksByJudges,
            averageMarks,
            totalMarks: averageMarks,
            isEvaluated: averageMarks > 0,
          };
        }
        return participant;
      }),
    }));

    setProgramRegistrations(updatedPrograms);

    // Update filtered programs as well
    const updatedFilteredPrograms = filteredRegistrations.map((program) => ({
      ...program,
      participants: program.participants.map((participant) => {
        if (participant.uniqueId === participantUniqueId) {
          const updatedMarksByJudges = [...(participant.marksByJudges || [])];
          updatedMarksByJudges[judgeNumber - 1] = marksValue;

          const validMarks = updatedMarksByJudges.filter(
            (m) => m !== undefined && m !== null
          );
          const averageMarks =
            validMarks.length > 0
              ? Math.round(
                  validMarks.reduce((sum, mark) => sum + mark, 0) /
                    validMarks.length
                )
              : 0;

          return {
            ...participant,
            marksByJudges: updatedMarksByJudges,
            averageMarks,
            totalMarks: averageMarks,
            isEvaluated: averageMarks > 0,
          };
        }
        return participant;
      }),
    }));

    setFilteredRegistrations(updatedFilteredPrograms);

    setChanges((prev) => ({
      ...prev,
      [participantUniqueId]: {
        marks: marksValue,
        judgeIndex: judgeNumber - 1,
      },
    }));
  };

  // Get grade for marks
  const getGradeForMarks = (marks) => {
    for (const scheme of gradeSchemes) {
      const [min, max] = scheme.markRange.split("-").map(Number);
      if (marks >= min && marks <= max) {
        return { grade: scheme.grade, points: scheme.points };
      }
    }
    return { grade: "F", points: 0 };
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

      Object.entries(changes).forEach(([participantUniqueId, markData]) => {
        const [registrationId, participantIndex] =
          participantUniqueId.split("-");

        if (!updatesByRegistration[registrationId]) {
          updatesByRegistration[registrationId] = {};
        }

        updatesByRegistration[registrationId][participantIndex] = markData;
      });

      const updates = Object.entries(updatesByRegistration).map(
        ([registrationId, participantUpdates]) => ({
          registrationId,
          participantUpdates,
        })
      );

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

  // Handle print
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Marks Sheet - ${
      selectedProgram
        ? programs.find((p) => p._id === selectedProgram)?.name
        : selectedDivision
          ? divisions.find((d) => d._id === selectedDivision)?.name
          : "All Programs"
    }`,
    pageStyle: `
      @page {
        size: A4 landscape;
        margin: 0.5in;
      }
      @media print {
        body { -webkit-print-color-adjust: exact; }
        .no-print { display: none !important; }
        table { page-break-inside: auto; margin-bottom: 20px; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        thead { display: table-header-group; }
        .program-section { page-break-inside: avoid; margin-bottom: 30px; }
      }
    `,
  });

  const clearFilters = () => {
    setSelectedDivision("");
    setSelectedProgram("");
  };

  const hasUnsavedChanges = Object.keys(changes).length > 0;
  const isLoading = fetchRegistrationsQuery.isLoading;
  const totalParticipants = filteredRegistrations.reduce(
    (sum, program) => sum + program.participants.length,
    0
  );
  const evaluatedParticipants = filteredRegistrations.reduce(
    (sum, program) =>
      sum + program.participants.filter((p) => p.isEvaluated).length,
    0
  );

  return (
    <div className="space-y-6 p-2 sm:p-4 md:p-6">
      {/* Controls */}
      <div className="no-print">
        <div className="flex flex-col gap-4">
          {/* Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 flex-shrink-0" />
              <Select
                value={selectedDivision}
                onValueChange={setSelectedDivision}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Divisions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All Divisions</SelectItem>
                  {divisions.map((division) => (
                    <SelectItem key={division._id} value={division._id}>
                      {division.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Select value={selectedProgram} onValueChange={setSelectedProgram}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Programs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>All Programs</SelectItem>
                {availablePrograms.map((program) => (
                  <SelectItem key={program._id} value={program._id}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium whitespace-nowrap ">
                Judge:
              </span>
              <Select
                value={judgeNumber.toString()}
                onValueChange={(v) => setJudgeNumber(parseInt(v))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(selectedDivision || selectedProgram) && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="w-full"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Stats and Actions */}
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>
                {filteredRegistrations.length} programs • {totalParticipants}{" "}
                participants • {evaluatedParticipants} evaluated
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="default"
                onClick={handlePrint}
                disabled={filteredRegistrations.length === 0}
                className="flex-1 sm:flex-none"
              >
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>

              {hasUnsavedChanges && (
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                >
                  <Save className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">
                    {saving
                      ? "Saving..."
                      : `Save (${Object.keys(changes).length})`}
                  </span>
                  <span className="sm:hidden">
                    {saving ? "Saving..." : "Save"}
                  </span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Printable Content */}
      <div ref={printRef}>
        {/* Print Header */}
        <PrintHeader title="Marks Sheet" apiKey={apiKey} isFestival={true} />
        {/* Program Tables */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2">
              <Loader className="animate-spin h-6 w-6" />
              <span>Loading programs and participants...</span>
            </div>
          </div>
        ) : filteredRegistrations.length > 0 ? (
          <div className="space-y-8">
            {filteredRegistrations.map((program, programIndex) => (
              <div key={program._id} className="program-section">
                {/* Program Header */}
                <div className="mb-4 p-3 sm:p-4 bg-muted rounded-lg border">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="mb-2 sm:mb-0">
                      <h3 className="text-lg sm:text-xl font-semibold text-foreground">
                        {program.programName}
                      </h3>
                      <div className="flex flex-wrap gap-2 sm:gap-4 mt-1 text-xs sm:text-sm text-foreground">
                        <span className="capitalize whitespace-nowrap">
                          <strong>Type:</strong> {program.programType}
                        </span>
                        <span className="capitalize whitespace-nowrap">
                          <strong>Category:</strong> {program.programCategory}
                        </span>
                        <span className="whitespace-nowrap">
                          <strong>Division:</strong> {program.divisionName}
                        </span>
                      </div>
                    </div>
                    <div className="hidden print:block text-right text-sm text-foreground">
                      Program{programIndex + 1}
                    </div>
                  </div>
                </div>

                {/* Participants Table with Horizontal Scroll */}
                <div className="border rounded-lg overflow-hidden border-collapse">
                  <div className="overflow-x-auto ">
                    <Table className="min-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 print:w-1/12 text-center whitespace-nowrap border-t border-r border-border">
                            Sl.
                          </TableHead>
                          <TableHead className="min-w-[150px] whitespace-nowrap border-t border-r border-border no-print">
                            Participant Name
                          </TableHead>
                          <TableHead className="min-w-[120px] whitespace-nowrap border-t border-r border-border no-print">
                            Team
                          </TableHead>
                          <TableHead className="w-20 text-center whitespace-nowrap border-t border-r border-border no-print">
                            Chest No.
                          </TableHead>
                          <TableHead className="w-20 print:w-1/12 text-center whitespace-nowrap border-t border-r border-border">
                            Code Letter
                          </TableHead>
                          <TableHead className="w-28 text-center whitespace-nowrap border-t border-r border-border no-print">
                            Judge{judgeNumber} Marks
                          </TableHead>
                          <TableHead className="w-20 text-center whitespace-nowrap border-t border-r border-border no-print">
                            Average
                          </TableHead>
                          <TableHead className="w-16 text-center whitespace-nowrap border-t border-r border-border no-print">
                            Grade
                          </TableHead>
                          <TableHead className="w-16 text-center whitespace-nowrap border-t border-r border-border no-print">
                            Points
                          </TableHead>
                          <TableHead className="w-9/12 text-center whitespace-nowrap border-t border-r border-border hidden print:table-cell">
                            Marks
                          </TableHead>
                          <TableHead className="w-1/12 text-center whitespace-nowrap border-t border-r border-border hidden print:table-cell">
                            Total
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {program.participants.length > 0 ? (
                          program.participants
                            .sort(
                              (a, b) =>
                                (a.participantDetails?.chestNumber ||
                                  a.chestNumber ||
                                  0) -
                                (b.participantDetails?.chestNumber ||
                                  b.chestNumber ||
                                  0)
                            )
                            .map((participant, index) => {
                              const currentJudgeMarks =
                                participant.marksByJudges?.[judgeNumber - 1] ||
                                "";
                              const { grade, points } = getGradeForMarks(
                                participant.averageMarks
                              );

                              return (
                                <TableRow key={participant.uniqueId}>
                                  <TableCell className="text-center font-medium whitespace-nowrap border-t border-r border-border">
                                    {index + 1}
                                  </TableCell>
                                  <TableCell className="font-medium whitespace-nowrap border-t border-r border-border no-print">
                                    {participant.participantDetails?.name ||
                                      participant.name ||
                                      "N/A"}
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap border-t border-r border-border no-print">
                                    {participant.teamName || "N/A"}
                                  </TableCell>
                                  <TableCell className="text-center whitespace-nowrap border-t border-r border-border no-print">
                                    {participant.participantDetails
                                      ?.chestNumber ||
                                      participant.chestNumber ||
                                      "-"}
                                  </TableCell>
                                  <TableCell className="text-center font-mono whitespace-nowrap border-t border-r border-border">
                                    {participant.codeLetter || "-"}
                                  </TableCell>
                                  <TableCell className="text-center border-t border-r border-border no-print">
                                    <div className="hidden print:block font-bold whitespace-nowrap  ">
                                      {currentJudgeMarks || "___"}
                                    </div>
                                    <Input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={currentJudgeMarks}
                                      onChange={(e) =>
                                        handleMarksChange(
                                          participant.uniqueId,
                                          e.target.value
                                        )
                                      }
                                      className="no-print w-16 sm:w-20 text-center text-sm mx-auto"
                                      placeholder="0-100"
                                    />
                                  </TableCell>
                                  <TableCell className="text-center font-medium whitespace-nowrap border-t border-r border-border no-print">
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
                                  </TableCell>
                                  <TableCell className="text-center font-medium whitespace-nowrap border-t border-r border-border no-print">
                                    {participant.averageMarks > 0 ? (
                                      <Badge variant="outline">{grade}</Badge>
                                    ) : (
                                      "-"
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center font-medium whitespace-nowrap border-t border-r border-border no-print">
                                    {participant.averageMarks > 0
                                      ? points
                                      : "-"}
                                  </TableCell>
                                  <TableCell className="text-center hidden print:table-cell whitespace-nowrap border-t border-r border-border"></TableCell>
                                  <TableCell className="text-center hidden print:table-cell whitespace-nowrap border-t border-r border-border"></TableCell>
                                </TableRow>
                              );
                            })
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={10}
                              className="text-center py-6 text-muted-foreground"
                            >
                              No participants found for this program
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
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

      {/* Mobile Floating Save Button */}
      {hasUnsavedChanges && (
        <div className="no-print fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto z-50">
          <div className="sm:hidden">
            <Button
              onClick={handleSave}
              disabled={saving}
              size="lg"
              className="bg-green-600 hover:bg-green-700 w-full shadow-lg"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving
                ? "Saving..."
                : `Save Changes (${Object.keys(changes).length})`}
            </Button>
          </div>

          <div className="hidden sm:block bg-yellow-100 border border-yellow-300 rounded-lg p-4 shadow-lg max-w-sm">
            <p className="text-sm text-yellow-800 mb-2">
              You have {Object.keys(changes).length} unsaved changes
            </p>
            <Button
              onClick={handleSave}
              disabled={saving}
              size="sm"
              className="bg-green-600 hover:bg-green-700 w-full"
            >
              <Save className="mr-1 h-3 w-3" />
              {saving ? "Saving..." : "Save All"}
            </Button>
          </div>
        </div>
      )}

      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .program-section {
            page-break-inside: avoid;
            margin-bottom: 30px;
          }
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
