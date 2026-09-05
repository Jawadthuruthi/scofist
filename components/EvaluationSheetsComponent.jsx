"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
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
import { Printer, X, Loader, Users, FileText } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import useCrud from "@/hooks/use-crud";
import PrintHeader from "./PrintHeader";
import { MultiSelect } from "./ui/multi-select";
import { formatOptions } from "@/lib/utils";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const getPrintRowHeight = (count) => {
  if (!count || count <= 4) return "44px";
  if (count <= 6) return "40px";
  if (count <= 8) return "36px";
  if (count <= 10) return "32px";
  if (count <= 12) return "28px";
  if (count <= 16) return "24px";
  return "20px";
};

const EvaluationSheetsComponent = ({ apiKey }) => {
  const [programRegistrations, setProgramRegistrations] = useState([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [category, setCategory] = useState("both");
  const [page, setPage] = useState(0);

  const printRef = useRef();

  // Use CRUD operations
  const { useFetchItems } = useCrud("program-registration", apiKey);

  // Fetch registrations with program details
  const fetchRegistrationsQuery = useFetchItems(
    page,
    1000,
    {
      ...(selectedDivision && { divisionId: selectedDivision }),
      ...(selectedProgram && { programId: selectedProgram }),
    },
    {
      retry: 2,
      retryDelay: 1000,
    }
  );

  // Derive available divisions from actual registrations (only those with data)
  const availableDivisions = useMemo(() => {
    const divMap = new Map();
    programRegistrations.forEach((p) => {
      if (p.divisionId && !divMap.has(p.divisionId)) {
        divMap.set(p.divisionId, { _id: p.divisionId, name: p.divisionName || p.divisionId });
      }
    });
    return Array.from(divMap.values()).sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );
  }, [programRegistrations]);

  // Derive available programs from actual registrations, filtered by selected division & category
  const availablePrograms = useMemo(() => {
    const progMap = new Map();
    programRegistrations.forEach((p) => {
      const divMatch = !selectedDivision || p.divisionId?.toString() === selectedDivision;
      const catMatch = category === "both" || p.programCategory === category;
      if (divMatch && catMatch && !progMap.has(p.programId)) {
        progMap.set(p.programId, {
          _id: p.programId,
          name: p.programName || p.programId,
        });
      }
    });
    return Array.from(progMap.values()).sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );
  }, [programRegistrations, selectedDivision, category]);

  // Process registrations data into programs with participants
  // Key by programId + divisionId so each festival session's programs stay separate
  const processRegistrationsToPrograms = useCallback((registrations) => {
    if (!registrations || !registrations.length) return [];

    // Group registrations by composite key: programId + divisionId
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
        participantsDetails = [],
      } = registration;

      // Use composite key so same program in different divisions is NOT merged
      const compositeKey = `${programId}-${divisionId}`;

      if (!programMap.has(compositeKey)) {
        programMap.set(compositeKey, {
          _id: compositeKey,
          programId,
          programName,
          programType,
          programCategory,
          divisionId,
          divisionName,
          participants: [],
        });
      }

      const program = programMap.get(compositeKey);

      // Add participants with code letter
      participantsDetails.forEach((participant, index) => {
        const participantData = {
          ...participant,
          registrationId,
          participantIndex: index,
          uniqueId: `${registrationId}-${index}`,
          participantDetails: participant.participantDetails || {
            name: participant.name || "Unknown",
            chestNumber: participant.chestNumber || "N/A",
          },
        };

        program.participants.push(participantData);
      });
    });

    // Sort by division first, then program name — keeps sessions grouped
    return Array.from(programMap.values()).sort((a, b) => {
      const divCmp = (a.divisionName || "").localeCompare(b.divisionName || "");
      if (divCmp !== 0) return divCmp;
      return (a.programName || "").localeCompare(b.programName || "");
    });
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
      // Compare as strings to handle ObjectId vs string mismatches
      filtered = filtered.filter(
        (program) =>
          program.divisionId?.toString() === selectedDivision.toString()
      );
    }

    if (selectedProgram) {
      filtered = filtered.filter(
        (program) => program.programId?.toString() === selectedProgram.toString()
      );
    }

    if (category !== "both") {
      filtered = filtered.filter(
        (program) => program.programCategory === category
      );
    }

    setFilteredRegistrations(filtered);
  }, [selectedDivision, selectedProgram, programRegistrations, category]);

  // Handle print
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Evaluation Sheets - ${
      selectedProgram
        ? availablePrograms.find((p) => p._id?.toString() === selectedProgram)?.name
        : selectedDivision
          ? availableDivisions.find((d) => d._id === selectedDivision)?.name
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
          margin-top: 20px !important;
          padding-top: 3px !important;
        }
      }
    `,
  });

  const clearFilters = () => {
    setSelectedDivision("");
    setSelectedProgram("");
    setCategory("both");
  };

  const isLoading = fetchRegistrationsQuery.isLoading;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="no-print">
        <div className="flex flex-col gap-3">
          {/* Controls Row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            {/* First 2 dropdowns: Side by side in mobile view */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3 flex-shrink-0">
              <div className="w-full sm:w-36 lg:w-40">
                <Select
                  value={category}
                  onValueChange={(val) => {
                    setCategory(val);
                    setSelectedProgram("");
                  }}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Both</SelectItem>
                    <SelectItem value="Stage">Stage</SelectItem>
                    <SelectItem value="Off-Stage">Off Stage</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-56 lg:w-64">
                <Select
                  value={selectedDivision || "all"}
                  onValueChange={(val) => {
                    setSelectedDivision(val === "all" ? "" : val);
                    setSelectedProgram("");
                  }}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="All Divisions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Divisions</SelectItem>
                    {availableDivisions.map((division) => (
                      <SelectItem key={division._id} value={division._id}>
                        {division.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Program Dropdown & Clear Button: Side by side on mobile view, inline on desktop */}
            <div className="flex items-center gap-2 flex-1 min-w-0 sm:min-w-[200px]">
              <div className="flex-1 min-w-0">
                <MultiSelect
                  options={formatOptions(availablePrograms)}
                  value={selectedProgram}
                  onValueChange={setSelectedProgram}
                  placeholder="All Programs"
                  multiSelect={false}
                  className="h-10 min-h-10 w-full"
                />
              </div>

              {(selectedDivision || selectedProgram || category !== "both") && (
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

            {/* Print Sheets Button */}
            <div className="flex items-center flex-shrink-0">
              <Button
                variant="default"
                onClick={handlePrint}
                disabled={filteredRegistrations.length === 0}
                className="h-10 whitespace-nowrap w-full sm:w-auto"
              >
                <Printer className="mr-2 h-4 w-4" />
                Print Sheets
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground px-1">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span>
                {filteredRegistrations.length}{" "}
                {filteredRegistrations.length === 1 ? "program" : "programs"}
              </span>
            </div>
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
              <span>Loading evaluation sheets...</span>
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
                <div className="program-info p-2 sm:p-2.5 bg-muted/60 rounded-t-lg border border-border print:bg-gray-100 print:border print:border-black print:rounded-none print:p-0">
                  {/* Screen View */}
                  <div className="flex print:hidden flex-wrap items-center justify-center gap-1.5 sm:gap-4 text-xs sm:text-sm font-semibold text-foreground text-center w-full">
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

                {/* Evaluation Sheet Table - Attached directly to header above */}
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
                          <TableHead className="w-16 text-center align-middle whitespace-nowrap border border-border p-2 print:border print:border-black print:font-bold print:bg-gray-100 print:text-black print:text-xs">
                            Sl.
                          </TableHead>
                          <TableHead className="w-32 text-center align-middle whitespace-nowrap border border-border p-2 print:border print:border-black print:font-bold print:bg-gray-100 print:text-black print:text-xs">
                            Code Letter
                          </TableHead>
                          <TableHead className="w-auto text-center align-middle whitespace-nowrap border border-border p-2 print:border print:border-black print:font-bold print:bg-gray-100 print:text-black print:text-xs">
                            Marks
                          </TableHead>
                          <TableHead className="w-32 text-center align-middle whitespace-nowrap border border-border p-2 print:border print:border-black print:font-bold print:bg-gray-100 print:text-black print:text-xs">
                            Total
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {program.participants.length > 0 ? (
                          program.participants.map((participant, index) => (
                            <TableRow key={participant.uniqueId}>
                              <TableCell className="text-center align-middle font-medium whitespace-nowrap border border-border p-2 print:border print:border-black">
                                {index + 1}
                              </TableCell>
                              <TableCell className="text-center align-middle font-bold whitespace-nowrap border border-border p-2 print:border print:border-black">
                                {alphabet[index]}
                              </TableCell>
                              <TableCell className="text-center align-middle whitespace-nowrap border border-border p-2 print:border print:border-black"></TableCell>
                              <TableCell className="text-center align-middle whitespace-nowrap border border-border p-2 print:border print:border-black"></TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="text-center py-6 text-muted-foreground border border-border print:border-black print:py-2"
                            >
                              No participants found for this program
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Judge Signature Section */}
                <div className="signature-section mt-8 grid grid-cols-2 gap-8 print:mt-2 print:gap-4">
                  <div className="text-center">
                    <div className="signature-line border-t border-gray-400 pt-2 mt-12 print:mt-4">
                      <p className="text-sm font-medium print:text-xs">
                        Judge Signature
                      </p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="signature-line border-t border-gray-400 pt-2 mt-12 print:mt-4">
                      <p className="text-sm font-medium print:text-xs">Date</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="font-semibold">No Programs Found</h3>
            <p className="text-muted-foreground">
              {selectedDivision || selectedProgram
                ? "No programs with participants found for the selected filters."
                : "No programs with registered participants available."}
            </p>
          </div>
        )}
      </div>

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

        /* Screen styles for better border collapse and centering */
        .evaluation-table {
          border-collapse: collapse !important;
        }

        .evaluation-table th,
        .evaluation-table td {
          border-collapse: collapse !important;
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

export default EvaluationSheetsComponent;
