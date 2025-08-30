"use client";
import { useState, useEffect, useRef } from "react";
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
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Trophy,
  Printer,
  Search,
  FileText,
  User,
  Award,
  Target,
  Calendar,
  Users,
  Loader,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import useCrud from "@/hooks/use-crud";
import PrintHeader from "./PrintHeader";

const IndividualResultsComponent = ({ divisions = [], apiKey }) => {
  const [participants, setParticipants] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState("");
  const [chestNumberSearch, setChestNumberSearch] = useState("");
  const [participantResults, setParticipantResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const printRef = useRef();

  // Use CRUD operations
  const { useFetchItems: useFetchParticipants } = useCrud(
    "participants",
    apiKey
  );

  // Fetch participants based on division
  const fetchParticipantsQuery = useFetchParticipants(
    0,
    1000,
    {
      ...(selectedDivision && { divisionId: selectedDivision }),
    },
    {
      retry: 2,
      retryDelay: 1000,
      enabled: !!selectedDivision,
    }
  );

  // Process fetched participants
  useEffect(() => {
    if (fetchParticipantsQuery.data) {
      const fetchedParticipants =
        fetchParticipantsQuery.data.participants || [];
      setParticipants(fetchedParticipants);
    }
  }, [fetchParticipantsQuery.data]);

  // Handle participant selection
  const handleParticipantSelect = (participantId) => {
    setSelectedParticipant(participantId);
    const participant = participants.find((p) => p._id === participantId);
    if (participant) {
      setParticipantResults(participant);
    }
  };

  // Handle chest number search
  const handleChestNumberSearch = () => {
    if (!chestNumberSearch.trim()) {
      toast.error("Please enter a chest number");
      return;
    }

    setLoading(true);

    // Find participant by chest number across all divisions
    const foundParticipant = participants.find(
      (p) => p.chestNumber?.toString() === chestNumberSearch.trim()
    );

    if (foundParticipant) {
      setSelectedParticipant(foundParticipant._id);
      setParticipantResults(foundParticipant);
      setSelectedDivision(foundParticipant.divisionId);
      toast.success(`Found participant: ${foundParticipant.name}`);
    } else {
      toast.error("No participant found with this chest number");
    }

    setLoading(false);
  };

  // Get programs with points > 0
  const getParticipantPrograms = (participant) => {
    if (!participant || !participant.programs) return [];

    return participant.programs
      .filter((program) => program.points > 0)
      .map((program, index) => ({
        slNo: index + 1,
        programName: program.name || "Unknown Program",
        divisionName: participant.divisionName || "Unknown Division",
        category: program.category || "Unknown Category",
        points: program.points,
        rank: program.rank,
        type: program.type || "Unknown Type",
      }));
  };

  // Handle print
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: participantResults
      ? `Individual Result - ${participantResults.chestNumber} - ${participantResults.name}`
      : "Individual Result",
    pageStyle: `
      @page {
        size: A4 portrait;
        margin: 0.5in;
      }
      @media print {
        body { 
          -webkit-print-color-adjust: exact; 
          font-size: 12px;
          line-height: 1.3;
        }
        .no-print { display: none !important; }
        
        .print-container {
          width: 100%;
        }
        
        .participant-header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
        }
        
        .participant-title {
          font-size: 18px !important;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .participant-info {
          font-size: 14px;
          margin-bottom: 10px;
        }
        
        table {
          border-collapse: collapse !important;
          border: 2px solid #000 !important;
          width: 100% !important;
          margin-top: 10px;
        }
        
        table th, table td {
          border: 1px solid #000 !important;
          padding: 8px !important;
          text-align: left;
          vertical-align: middle;
          font-size: 12px !important;
        }
        
        table th {
          background-color: #f5f5f5 !important;
          font-weight: bold !important;
          text-align: center !important;
        }
        
        .rank-cell {
          text-align: center !important;
          font-weight: bold;
        }
        
        .points-cell {
          text-align: center !important;
          font-weight: bold;
        }
        
        .summary-section {
          margin-top: 20px;
          border-top: 1px solid #000;
          padding-top: 10px;
        }
      }
    `,
  });

  const programsWithPoints = participantResults
    ? getParticipantPrograms(participantResults)
    : [];
  const totalPoints = participantResults
    ? (participantResults.stagePoints || 0) +
      (participantResults.offStagePoints || 0)
    : 0;

  // Get position variant for badges
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
          {/* Search and Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Division Filter */}
            <Select
              value={selectedDivision}
              onValueChange={setSelectedDivision}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Division" />
              </SelectTrigger>
              <SelectContent>
                {divisions.map((division) => (
                  <SelectItem key={division._id} value={division._id}>
                    {division.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Participant Selector */}
            <Select
              value={selectedParticipant}
              onValueChange={handleParticipantSelect}
              disabled={!selectedDivision}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Participant" />
              </SelectTrigger>
              <SelectContent>
                {participants
                  .sort((a, b) => a.chestNumber - b.chestNumber)
                  .map((participant) => (
                    <SelectItem key={participant._id} value={participant._id}>
                      {participant.chestNumber} - {participant.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {/* Chest Number Search */}
            <Input
              placeholder="Enter chest number"
              value={chestNumberSearch}
              onChange={(e) => setChestNumberSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleChestNumberSearch()}
            />

            <Button
              onClick={handleChestNumberSearch}
              disabled={loading || !chestNumberSearch.trim()}
              variant="outline"
            >
              {loading ? (
                <Loader className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Search
            </Button>
          </div>

          {/* Stats and Print Button */}
          {participantResults && (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-2 sm:flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">{participantResults.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-green-500" />
                  <span>{programsWithPoints.length} programs</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-yellow-500" />
                  <span>{totalPoints} total points</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-500" />
                  <span>{participantResults.teamName}</span>
                </div>
              </div>

              <Button
                onClick={handlePrint}
                disabled={programsWithPoints.length === 0}
                className="w-full sm:w-auto"
              >
                <Printer className="mr-2 h-4 w-4" />
                Print Result
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Printable Content */}
      <div ref={printRef} className="print-container">
        {participantResults ? (
          <div className="space-y-6">
            {/* Print Header */}
            <PrintHeader apiKey={apiKey} isFestival={true} />

            {/* Participant Header */}
            <div className="participant-header">
              <div className="participant-title">
                {participantResults.chestNumber} - {participantResults.name}
              </div>
              <div className="participant-info">
                <strong>Division:</strong> {participantResults.divisionName} |
                <strong> Team:</strong> {participantResults.teamName} |
                <strong> Total Points:</strong> {totalPoints}
              </div>
            </div>

            {/* Results Table */}
            {programsWithPoints.length > 0 ? (
              <div className="border rounded-lg overflow-hidden print:border-2 print:border-black print:rounded-none">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16 text-center border-r border-border print:border-black">
                        Sl No.
                      </TableHead>
                      <TableHead className="border-r border-border print:border-black">
                        Program
                      </TableHead>
                      <TableHead className="border-r border-border print:border-black">
                        Division
                      </TableHead>
                      <TableHead className="border-r border-border print:border-black">
                        Category
                      </TableHead>
                      <TableHead className="w-20 text-center border-r border-border print:border-black">
                        Points
                      </TableHead>
                      <TableHead className="w-16 text-center border-r border-border print:border-black">
                        Rank
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {programsWithPoints.map((program) => (
                      <TableRow key={program.slNo}>
                        <TableCell className="text-center font-medium border-r border-border print:border-black">
                          {program.slNo}
                        </TableCell>
                        <TableCell className="font-medium border-r border-border print:border-black">
                          {program.programName}
                        </TableCell>
                        <TableCell className="border-r border-border print:border-black">
                          {program.divisionName}
                        </TableCell>
                        <TableCell className="capitalize border-r border-border print:border-black">
                          <Badge variant="outline" className="print:hidden">
                            {program.category}
                          </Badge>
                          <span className="hidden print:inline">
                            {program.category}
                          </span>
                        </TableCell>
                        <TableCell className="text-center points-cell border-r border-border print:border-black">
                          <Badge variant="secondary" className="print:hidden">
                            {program.points}
                          </Badge>
                          <span className="hidden print:inline font-bold">
                            {program.points}
                          </span>
                        </TableCell>
                        <TableCell className="text-center rank-cell border-r border-border print:border-black">
                          <div className="flex items-center justify-center gap-1">
                            {getPositionIcon(program.rank)}
                            <Badge
                              variant={getPositionVariant(program.rank)}
                              className="print:hidden"
                            >
                              {program.rank}
                            </Badge>
                            <span className="hidden print:inline font-bold">
                              {program.rank}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 border rounded-lg bg-muted print:border-black">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4 print:hidden" />
                <h3 className="text-lg font-semibold">No Results Found</h3>
                <p className="text-muted-foreground">
                  This participant has no programs with points greater than 0.
                </p>
              </div>
            )}

            {/* Summary Section for Print */}
            {programsWithPoints.length > 0 && (
              <div className="summary-section hidden print:block">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <strong>Total Programs:</strong> {programsWithPoints.length}
                  </div>
                  <div>
                    <strong>Total Points:</strong> {totalPoints}
                  </div>
                  <div>
                    <strong>Winning Programs:</strong>{" "}
                    {programsWithPoints.filter((p) => p.rank <= 3).length}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <User className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Select a Participant</h3>
            <p className="text-muted-foreground">
              Choose a division and participant, or search by chest number to
              view individual results.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IndividualResultsComponent;
