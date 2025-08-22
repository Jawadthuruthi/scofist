"use client";
import { useState, useEffect, useRef, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
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
  Trophy,
  Printer,
  Filter,
  X,
  Loader,
  FileText,
  Eye,
  EyeOff,
  RefreshCw,
  Award,
  Users,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import useCrud from "@/hooks/use-crud";
import PrintHeader from "./PrintHeader";

const ResultComponent = ({
  programs = [],
  divisions = [],
  apiKey,
  additionalProps = {},
}) => {
  const [results, setResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedType, setSelectedType] = useState("");
  const [page, setPage] = useState(0);
  const [declaring, setDeclaring] = useState({});
  const [generating, setGenerating] = useState({});

  const printRef = useRef();

  // Use CRUD operations
  const { useFetchItems } = useCrud("results", apiKey);
  const { useUpdateItem: useResultUpdate } = useCrud("results", apiKey);
  const { useAddItem: useResultCreate } = useCrud("results", apiKey);

  const updateResult = useResultUpdate();
  const createResult = useResultCreate();

  // Fetch results
  const fetchResultsQuery = useFetchItems(
    page,
    1000,
    {
      ...(selectedDivision && { divisionId: selectedDivision }),
      ...(selectedProgram && { programId: selectedProgram }),
      ...(selectedStatus !== "all" && {
        isResultDeclared: selectedStatus === "declared",
      }),
      ...(selectedType && { type: selectedType }),
    },
    {
      retry: 2,
      retryDelay: 1000,
    }
  );

  // Handle fetch errors
  useEffect(() => {
    if (fetchResultsQuery.error) {
      toast.error(
        fetchResultsQuery.error.message ||
          "Failed to fetch results. Please try again."
      );
    }
  }, [fetchResultsQuery.error]);

  // Process fetched data
  useEffect(() => {
    if (fetchResultsQuery.data) {
      const fetchedResults = fetchResultsQuery.data.results || [];
      setResults(fetchedResults);
      setFilteredResults(fetchedResults);
    }
  }, [fetchResultsQuery.data]);

  // Filter results
  useEffect(() => {
    let filtered = results;

    if (selectedDivision) {
      filtered = filtered.filter(
        (result) => result.divisionId === selectedDivision
      );
    }

    if (selectedProgram) {
      filtered = filtered.filter(
        (result) => result.programId === selectedProgram
      );
    }

    if (selectedType) {
      filtered = filtered.filter(
        (result) => result.programType === selectedType
      );
    }

    if (selectedStatus !== "all") {
      const isDeclared = selectedStatus === "declared";
      filtered = filtered.filter(
        (result) => result.isResultDeclared === isDeclared
      );
    }

    setFilteredResults(filtered);
  }, [
    selectedDivision,
    selectedProgram,
    selectedType,
    selectedStatus,
    results,
  ]);

  // Get available programs for selected division
  const availablePrograms = selectedDivision
    ? programs.filter((p) => p.divisionId === selectedDivision)
    : programs;

  // Generate results for a program
  const handleGenerateResult = async (programId) => {
    try {
      setGenerating((prev) => ({ ...prev, [programId]: true }));

      await createResult.mutateAsync({
        data: {
          programId,
          ...additionalProps,
        },
      });

      await fetchResultsQuery.refetch();
      toast.success("Results generated successfully!");
    } catch (error) {
      console.error("Error generating results:", error);
      toast.error(error.message || "Failed to generate results");
    } finally {
      setGenerating((prev) => ({ ...prev, [programId]: false }));
    }
  };

  // Declare/Undeclare result
  const handleDeclareResult = async (resultId, currentStatus) => {
    try {
      setDeclaring((prev) => ({ ...prev, [resultId]: true }));

      const newStatus = !currentStatus;

      await updateResult.mutateAsync({
        data: {
          resultId,
          isResultDeclared: newStatus,
          ...additionalProps,
        },
      });

      await fetchResultsQuery.refetch();
      toast.success(
        `Result ${newStatus ? "declared" : "undeclared"} successfully!`
      );
    } catch (error) {
      console.error("Error updating result declaration:", error);
      toast.error(error.message || "Failed to update result declaration");
    } finally {
      setDeclaring((prev) => ({ ...prev, [resultId]: false }));
    }
  };

  // Handle print
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Results - ${
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
        .result-section { page-break-inside: avoid; margin-bottom: 30px; }
      }
    `,
  });

  const clearFilters = () => {
    setSelectedDivision("");
    setSelectedProgram("");
    setSelectedType("");
    setSelectedStatus("all");
  };

  const isLoading = fetchResultsQuery.isLoading;
  const totalResults = filteredResults.length;
  const declaredResults = filteredResults.filter(
    (r) => r.isResultDeclared
  ).length;
  const pendingResults = totalResults - declaredResults;
  const totalParticipants = filteredResults.reduce(
    (sum, result) => sum + result.participants.length,
    0
  );

  // Get position medal/badge variant
  const getPositionVariant = (rank) => {
    switch (rank) {
      case 1:
        return "default"; // Gold
      case 2:
        return "secondary"; // Silver
      case 3:
        return "outline"; // Bronze
      default:
        return "destructive";
    }
  };

  const getPositionIcon = (rank) => {
    if (rank <= 3) return <Trophy className="h-3 w-3" />;
    return null;
  };

  return (
    <div className="space-y-6 p-2 sm:p-4 md:p-6">
      {/* Controls */}
      <div className="no-print">
        <div className="flex flex-col gap-4">
          {/* Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
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

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>All Types</SelectItem>
                <SelectItem value="stage">Stage</SelectItem>
                <SelectItem value="off-stage">Off-Stage</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="declared">Declared</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>

            {(selectedDivision ||
              selectedProgram ||
              selectedType ||
              selectedStatus !== "all") && (
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
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span>{totalResults} results</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{totalParticipants} participants</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4 text-green-500" />
                <span>{declaredResults} declared</span>
              </div>
              <div className="flex items-center gap-1">
                <EyeOff className="h-4 w-4 text-orange-500" />
                <span>{pendingResults} pending</span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handlePrint}
              disabled={filteredResults.length === 0}
              className="flex-1 sm:flex-none"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        </div>
      </div>

      {/* Printable Content */}
      <div ref={printRef}>
        {/* Print Header */}
        <PrintHeader
          title="Competition Results"
          apiKey={apiKey}
          isFestival={true}
        />

        {/* Results Tables */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-2">
              <Loader className="animate-spin h-6 w-6" />
              <span>Loading results...</span>
            </div>
          </div>
        ) : filteredResults.length > 0 ? (
          <div className="space-y-8">
            {filteredResults.map((result, resultIndex) => (
              <div key={result._id} className="result-section">
                {/* Result Header */}
                <div className="mb-4 p-3 sm:p-4 bg-muted rounded-lg border">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="mb-2 sm:mb-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg sm:text-xl font-semibold text-foreground">
                          {result.programName}
                        </h3>
                        <Badge
                          variant={
                            result.isResultDeclared ? "default" : "secondary"
                          }
                          className="hidden sm:inline-flex"
                        >
                          {result.isResultDeclared ? (
                            <>
                              <Eye className="h-3 w-3 mr-1" />
                              Declared
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3 mr-1" />
                              Pending
                            </>
                          )}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-foreground">
                        <span className="capitalize whitespace-nowrap">
                          <strong>Type:</strong> {result.programType}
                        </span>
                        <span className="capitalize whitespace-nowrap">
                          <strong>Category:</strong> {result.programCategory}
                        </span>
                        <span className="whitespace-nowrap">
                          <strong>Division:</strong> {result.divisionName}
                        </span>
                        <span className="whitespace-nowrap">
                          <strong>Participants:</strong>{" "}
                          {result.participants.length}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 no-print">
                      {!result._id && (
                        <Button
                          onClick={() => handleGenerateResult(result.programId)}
                          disabled={generating[result.programId]}
                          size="sm"
                          variant="outline"
                        >
                          {generating[result.programId] ? (
                            <Loader className="animate-spin h-3 w-3 mr-1" />
                          ) : (
                            <TrendingUp className="h-3 w-3 mr-1" />
                          )}
                          Generate
                        </Button>
                      )}

                      {/* Declare/Undeclare Button */}
                      {result._id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant={
                                result.isResultDeclared
                                  ? "destructive"
                                  : "default"
                              }
                              disabled={declaring[result._id]}
                            >
                              {declaring[result._id] ? (
                                <Loader className="animate-spin h-3 w-3 mr-1" />
                              ) : result.isResultDeclared ? (
                                <EyeOff className="h-3 w-3 mr-1" />
                              ) : (
                                <Eye className="h-3 w-3 mr-1" />
                              )}
                              <span className="hidden sm:inline">
                                {result.isResultDeclared
                                  ? "Undeclare"
                                  : "Declare"}
                              </span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {result.isResultDeclared
                                  ? "Undeclare"
                                  : "Declare"}{" "}
                                Result
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {result.isResultDeclared
                                  ? "Are you sure you want to undeclare this result? This will remove all participant and team points associated with this program."
                                  : "Are you sure you want to declare this result? This will update participant and team records with the final rankings and points."}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleDeclareResult(
                                    result._id,
                                    result.isResultDeclared
                                  )
                                }
                                className={
                                  result.isResultDeclared
                                    ? "bg-destructive hover:bg-destructive/90"
                                    : ""
                                }
                              >
                                {result.isResultDeclared
                                  ? "Undeclare"
                                  : "Declare"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </div>

                {/* Results Table */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table className="min-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16 text-center whitespace-nowrap border-t border-r border-border">
                            Rank
                          </TableHead>
                          <TableHead className="w-20 whitespace-nowrap border-t border-r border-border ">
                            Chest Number
                          </TableHead>
                          <TableHead className="min-w-[150px] whitespace-nowrap border-t border-r border-border ">
                            Name
                          </TableHead>
                          <TableHead className="w-20 text-center whitespace-nowrap border-t border-r border-border">
                            Code Letter
                          </TableHead>
                          <TableHead className="w-16 text-center whitespace-nowrap border-t border-r border-border">
                            Grade
                          </TableHead>
                          <TableHead className="w-20 text-center whitespace-nowrap border-t border-r border-border">
                            Points
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.participants.length > 0 ? (
                          result.participants
                            .sort((a, b) => a.rank - b.rank)
                            .map((participant, index) => (
                              <TableRow key={participant.id || index}>
                                <TableCell className="text-center font-medium whitespace-nowrap border-t border-r border-border">
                                  <div className="flex items-center justify-center gap-1">
                                    {getPositionIcon(participant.rank)}
                                    <Badge
                                      variant={getPositionVariant(
                                        participant.rank
                                      )}
                                    >
                                      {participant.rank}
                                    </Badge>
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium whitespace-nowrap border-t border-r border-border ">
                                  {participant.participantDetails
                                    ?.chestNumber || "N/A"}
                                </TableCell>
                                <TableCell className="font-medium whitespace-nowrap border-t border-r border-border ">
                                  {participant.participantDetails?.name ||
                                    "N/A"}
                                </TableCell>
                                <TableCell className="text-center  whitespace-nowrap border-t border-r border-border">
                                  {participant.codeLetter || "-"}
                                </TableCell>
                                <TableCell className="text-center whitespace-nowrap border-t border-r border-border">
                                  <Badge variant="outline">
                                    {participant.grade}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center font-medium whitespace-nowrap border-t border-r border-border">
                                  <Badge variant="secondary">
                                    {participant.points}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="text-center py-6 text-muted-foreground"
                            >
                              No participants found for this result
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
            <h3 className="text-lg font-semibold">No Results Found</h3>
            <p className="text-muted-foreground">
              {selectedDivision || selectedProgram || selectedStatus !== "all"
                ? "No results found for the selected filters."
                : "No results available. Generate results from the evaluation page first."}
            </p>
            <div className="mt-4">
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .result-section {
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

export default ResultComponent;
