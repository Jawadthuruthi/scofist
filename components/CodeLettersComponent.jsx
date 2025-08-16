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
import { Save, Printer, Filter, X, Loader, Users } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import useCrud from "@/hooks/use-crud";

const CodeLettersComponent = ({
  data = [],
  divisions = [],
  url,
  apiKey,
  additionalProps = {},
}) => {
  const [programs, setPrograms] = useState([]);
  const [filteredPrograms, setFilteredPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState({});
  const [page, setPage] = useState(0);

  const printRef = useRef();

  // Use CRUD operations
  const { useFetchItems } = useCrud("program-registration", apiKey);
  const { useUpdateItem: useCodeLetterUpdate } = useCrud(
    "code-letters",
    apiKey
  );

  const updateCodeLetters = useCodeLetterUpdate();

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
      }))
      .filter(
        (program) =>
          (!selectedDivision || program.divisionId === selectedDivision) &&
          !seen.has(program._id) &&
          seen.add(program._id)
      );
  }, [fetchRegistrationsQuery.data, selectedDivision]);

  // Filter programs by division
  useEffect(() => {
    if (selectedDivision || selectedProgram) {
      setFilteredPrograms(
        programs.filter(
          (program) =>
            (!selectedDivision || program.divisionId === selectedDivision) &&
            (!selectedProgram || program._id === selectedProgram)
        )
      );
    } else {
      setFilteredPrograms(programs);
    }
  }, [selectedDivision, selectedProgram, programs]);

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
        size: A4;
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

  const clearFilter = () => {
    setSelectedDivision("");
    setSelectedProgram("");
  };

  const hasUnsavedChanges = Object.keys(changes).length > 0;
  const isLoading = fetchRegistrationsQuery.isLoading;
  const totalParticipants = filteredPrograms.reduce(
    (sum, program) => sum + program.participants.length,
    0
  );

  return (
    <div className="space-y-6 p-2 sm:p-4 md:p-6">
      {/* Controls */}
      <div className="no-print">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 flex-shrink-0" />
              <Select
                value={selectedDivision}
                onValueChange={setSelectedDivision}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="All Divisions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All Programs</SelectItem>
                  {divisions.map((division) => (
                    <SelectItem key={division._id} value={division._id}>
                      {division.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedProgram}
                onValueChange={setSelectedProgram}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="All Programs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All Programs</SelectItem>
                  {programsData.map((program) => (
                    <SelectItem key={program._id} value={program._id}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(selectedDivision || selectedProgram) && (
                <Button variant="outline" size="sm" onClick={clearFilter}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Users className="h-4 w-4" />
              {filteredPrograms.length} programs • {totalParticipants}{" "}
              participants
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handlePrint}
              disabled={filteredPrograms.length === 0}
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

      {/* Printable Content */}
      <div ref={printRef}>
        {/* Program Tables */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2">
              <Loader className="animate-spin h-6 w-6" />
              <span>Loading programs and participants...</span>
            </div>
          </div>
        ) : filteredPrograms.length > 0 ? (
          <div className="space-y-8">
            {filteredPrograms.map((program, programIndex) => (
              <div key={program._id} className="program-section">
                {/* Program Header */}
                <div className="mb-4 p-3 sm:p-4 bg-gray-50 rounded-lg border">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-0">
                        {program.programName}
                      </h3>
                      <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
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
                    <div className="hidden print:block text-right text-sm text-gray-600">
                      Program #{programIndex + 1}
                    </div>
                  </div>
                </div>

                {/* Participants Table with Horizontal Scroll */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table className="min-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 text-center whitespace-nowrap border-t border-r border-border">
                            Sl.
                          </TableHead>
                          <TableHead className="min-w-[150px] whitespace-nowrap border-t border-r border-border">
                            Participant Name
                          </TableHead>
                          <TableHead className="min-w-[120px] whitespace-nowrap border-t border-r border-border">
                            Team
                          </TableHead>
                          <TableHead className="w-24 text-center whitespace-nowrap border-t border-r border-border">
                            Chest No.
                          </TableHead>
                          <TableHead className="w-32 text-center whitespace-nowrap border-t border-r border-border">
                            Code Letter
                          </TableHead>
                          <TableHead className="w-20 text-center whitespace-nowrap border-t border-r border-border hidden print:table-cell">
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
                                <TableCell className="text-center font-medium  border-t border-r border-border">
                                  {index + 1}
                                </TableCell>
                                <TableCell className="font-medium  border-t border-r border-border">
                                  {participant.name || "N/A"}
                                </TableCell>
                                <TableCell className=" border-t border-r border-border">
                                  {participant.teamName || "N/A"}
                                </TableCell>
                                <TableCell className="text-center  border-t border-r border-border">
                                  {participant.chestNumber || "-"}
                                </TableCell>

                                <TableCell className="text-center border-t border-r border-border">
                                  <div className="hidden print:block text-center font-bold text-lg whitespace-nowrap">
                                    {participant.codeLetter || ""}
                                  </div>
                                  {participant.isEvaluated ? (
                                    <span className="no-print font-medium text-red-600 whitespace-nowrap">
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
                                      className="no-print w-20 sm:w-24 text-center text-sm mx-auto"
                                      maxLength={5}
                                      placeholder="Code"
                                    />
                                  )}
                                </TableCell>
                                <TableCell className="text-center hidden print:table-cell whitespace-nowrap border-t border-r border-border">
                                  <div className="h-6 w-16 mx-auto"></div>
                                </TableCell>
                              </TableRow>
                            ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={7}
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
            <h3 className="text-lg font-semibold">No Programs Found</h3>
            <p className="text-muted-foreground">
              {selectedDivision
                ? "No programs with participants found for the selected division."
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

export default CodeLettersComponent;
