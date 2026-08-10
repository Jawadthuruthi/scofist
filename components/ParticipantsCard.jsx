"use client";
import { useRef, useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, CreditCard, ListTodo } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import Header from "./Header";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { MultiSelect } from "./ui/multi-select";
import { formatOptions } from "@/lib/utils";
import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";

const ParticipantsCard = ({
  participants = [],
  divisions = [],
  teams = [],
  festivalSettings = {},
  activeRole,
  activeTeamId,
}) => {
  const isProgramLeader = activeRole === "Program Leader";

  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedTeam, setSelectedTeam] = useState(isProgramLeader && activeTeamId ? activeTeamId : "");
  const [selectedParticipant, setSelectedParticipant] = useState("");
  const [viewMode, setViewMode] = useState(isProgramLeader ? "back" : "both"); // Force back for program leaders
  const [baseUrl, setBaseUrl] = useState("");

  const pageRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: pageRef,
    documentTitle: "Participants Cards",
  });

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  useEffect(() => {
    setBaseUrl(typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  // Memoize filtered participants to prevent recalculation on every render
  const MAX_PROGRAMS = 16;

  const previewParticipants = useMemo(() => {
    return participants
      .filter(
        (participant) =>
          (!selectedDivision || participant.divisionId === selectedDivision) &&
          (!selectedTeam || participant.teamId === selectedTeam) &&
          (!selectedParticipant || participant._id === selectedParticipant)
      )
      .map((participant) => {
        const rawPrograms = participant?.programs || [];
        
        if (rawPrograms.length === 0) {
          return {
            ...participant,
            processedPrograms: [],
            totalPages: 1,
            allPrograms: [],
          };
        }

        // Sort programs so they are grouped sequentially across pages, mirroring the exact render order
        const allPrograms = [...rawPrograms].sort((a, b) => {
          // 1. Primary programs first, then Secondary
          const aIsSec = a.divisionType === "Secondary";
          const bIsSec = b.divisionType === "Secondary";
          if (aIsSec !== bIsSec) return aIsSec ? 1 : -1;

          // 2. If both are secondary, group by their exact division ID
          if (aIsSec && bIsSec && a.divisionId !== b.divisionId) {
            return (a.divisionId || "").localeCompare(b.divisionId || "");
          }

          // 3. Stage before Off Stage
          if (a.category !== b.category) return a.category === "Stage" ? -1 : 1;
          
          return 0;
        });

        let counts = {};

        const processedPrograms = allPrograms.map((p) => {
          // Create a unique key for each grouping so numbering resets per heading
          const key = p.divisionType === "Secondary" 
            ? `Sec-${p.divisionId}-${p.category}` 
            : `Pri-${p.category}`;
            
          if (!counts[key]) counts[key] = 0;
          counts[key]++;
          
          return { ...p, displayIndex: counts[key] };
        });

        const totalPages = Math.ceil(processedPrograms.length / MAX_PROGRAMS);
        return {
           ...participant,
           processedPrograms,
           totalPages,
           allPrograms
        };
      });
  }, [participants, selectedDivision, selectedTeam, selectedParticipant]);

  const printParticipants = useMemo(() => {
    const result = [];
    previewParticipants.forEach(p => {
       if (!p.processedPrograms || p.processedPrograms.length === 0) {
          result.push({
             ...p,
             displayedPrograms: [],
             pageIndex: 0
          });
          return;
       }
       for (let i = 0; i < p.totalPages; i++) {
          result.push({
             ...p,
             _id: p.totalPages > 1 ? `${p._id}-page-${i}` : p._id,
             originalId: p._id,
             displayedPrograms: p.processedPrograms.slice(i * MAX_PROGRAMS, (i + 1) * MAX_PROGRAMS),
             pageIndex: i
          });
       }
    });
    return result;
  }, [previewParticipants]);

  // Memoize filtered teams based on selected division
  const teamsInSelectedDivision = useMemo(() => {
    if (!selectedDivision) return teams;
    const participantsInDivision = participants.filter(
      (p) => p.divisionId === selectedDivision
    );
    const teamIds = [...new Set(participantsInDivision.map((p) => p.teamId))];
    return teams.filter((team) => teamIds.includes(team._id));
  }, [teams, participants, selectedDivision]);

  // Memoize filtered participants based on selected team
  const filteredOptions = useMemo(() => {
    return participants.filter(
      (participant) =>
        (!selectedDivision || participant.divisionId === selectedDivision) &&
        (!selectedTeam || participant.teamId === selectedTeam)
    );
  }, [participants, selectedDivision, selectedTeam]);

  if (!participants.length) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
          No participant records available
        </p>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="PARTICIPANTS CARD"
        subTitle="Official Identity for Festival Participants"
      />

      {/* Top Controls Container */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6 lg:items-center lg:justify-between">
        {/* Filters Row */}
        <div className="grid grid-cols-2 md:flex md:flex-row gap-2 md:gap-4 w-full lg:w-auto lg:flex-1">
          {/* Team Filter - Hidden for Program Leaders */}
          {!isProgramLeader && (
            <div className="w-full md:w-1/3 lg:w-48 xl:w-56">
              <label htmlFor="team-select" className="sr-only">
                Select a Team
              </label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="w-full" id="team-select">
                  <SelectValue placeholder="Select a Team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={null}>All Teams</SelectItem>
                    {teamsInSelectedDivision.map((team) => (
                      <SelectItem key={team._id} value={team._id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="w-full md:w-1/3 lg:w-56 xl:w-64">
            <label htmlFor="division-select" className="sr-only">
              Select a Division
            </label>
            <Select value={selectedDivision} onValueChange={setSelectedDivision}>
              <SelectTrigger className="w-full" id="division-select">
                <SelectValue placeholder="Select a Division" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={null}>All Divisions</SelectItem>
                  {divisions.map((division) => (
                    <SelectItem key={division._id} value={division._id}>
                      {division.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          {(selectedTeam || isProgramLeader) && selectedDivision && (
            <div className="col-span-2 md:col-span-1 w-full md:w-1/3 lg:w-56 xl:w-64">
              <MultiSelect
                options={formatOptions(filteredOptions)}
                value={selectedParticipant}
                onValueChange={setSelectedParticipant}
                multiSelect={false}
                placeholder="Select a Participant"
              />
            </div>
          )}
        </div>

        {/* View Mode Filter and Print Button */}
        <div className="flex flex-row justify-between md:justify-end items-center gap-2 md:gap-4 w-full lg:w-auto">
          {/* View Mode Filter - Hidden for Program Leaders */}
          {!isProgramLeader && (
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-xs sm:text-sm font-medium hidden sm:inline">
                View:
              </span>
              <div className="flex rounded-md border">
                <Button
                  variant={viewMode === "both" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleViewModeChange("both")}
                  className="rounded-r-none text-xs sm:text-sm px-2 sm:px-3"
                >
                  <span className="hidden sm:inline">Both</span>
                  <span className="sm:hidden">All</span>
                </Button>
                <Button
                  variant={viewMode === "front" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleViewModeChange("front")}
                  className="rounded-none border-x-0 text-xs sm:text-sm px-2 sm:px-3"
                >
                  <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Front</span>
                </Button>
                <Button
                  variant={viewMode === "back" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleViewModeChange("back")}
                  className="rounded-l-none text-xs sm:text-sm px-2 sm:px-3"
                >
                  <ListTodo className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </div>
            </div>
          )}
          {/* Print Button */}
          <Button
            onClick={handlePrint}
            aria-label="Print Participant Cards"
            variant="default"
            className="whitespace-nowrap"
          >
            <Printer size={16} className="mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Screen Preview */}
      <div className="grid grid-cols-12 gap-4 print:hidden">
        {previewParticipants.map((participant) => (
          <ParticipantCard
            key={participant._id}
            participant={participant}
            festivalSettings={festivalSettings}
            viewMode={viewMode}
            baseUrl={baseUrl}
            divisions={divisions}
            maxPrograms={MAX_PROGRAMS}
          />
        ))}
      </div>

      {/* Print Layout - A4 Landscape with Front-Back-Front-Back pattern */}
      <div ref={pageRef} className="hidden print:block">
        {Array.from({
          length: Math.ceil(
            printParticipants.length / (viewMode === "both" ? 4 : 8)
          ),
        }).map((_, pageIndex) => (
          <div
            key={`page-${pageIndex}`}
            className="print-page w-full p-4 flex flex-wrap"
            style={{
              width: "297mm",
              height: "210mm",
              pageBreakAfter: "always",
              pageBreakInside: "avoid",
              breakAfter: "page",
            }}
            aria-hidden="true"
          >
            <div className="print:hidden text-xs text-gray-400 dark:text-gray-500">
              Page {pageIndex + 1}
            </div>

            {printParticipants
              .slice(
                pageIndex * (viewMode === "both" ? 4 : 8),
                (pageIndex + 1) * (viewMode === "both" ? 4 : 8)
              )
              .map((participant) => (
                <PrintableParticipantCard
                  key={`print-${participant._id}`}
                  participant={participant}
                  festivalSettings={festivalSettings}
                  viewMode={viewMode}
                  baseUrl={baseUrl}
                  divisions={divisions}
                />
              ))}
          </div>
        ))}
      </div>

      {/* Enhanced CSS for print and display */}
      <style jsx>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }

          body {
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .preview-container {
            display: none;
          }

          .print-page {
            page-break-after: always;
            break-after: page;
          }
        }

        .preview-container {
          transition: all 0.3s ease;
        }

        .preview-container:hover {
          transform: translateY(-4px);
        }

        .text-shadow-strong {
          text-shadow:
            -2px -2px 0 rgba(0, 0, 0, 0.8),
            2px -2px 0 rgba(0, 0, 0, 0.8),
            -2px 2px 0 rgba(0, 0, 0, 0.8),
            2px 2px 0 rgba(0, 0, 0, 0.8),
            0 0 4px rgba(0, 0, 0, 0.8);
        }

        .backdrop-enhanced {
          backdrop-filter: blur(4px) saturate(180%);
          -webkit-backdrop-filter: blur(4px) saturate(180%);
        }
      `}</style>
    </div>
  );
};

export default ParticipantsCard;

// Extracted component for participant card preview
const ParticipantCard = ({ participant, festivalSettings, viewMode, baseUrl, maxPrograms = 16, divisions = [] }) => {
  const [currentPage, setCurrentPage] = useState(0);
  
  const participantsCardSettings = festivalSettings?.participantsCard || {};
  const participantsCardBackgroundUrl =
    participantsCardSettings?.backgroundImage?.url || "";

  // Single text color for all elements
  const textColor = participantsCardSettings?.textColor || "#000000";

  // Determine current page programs
  const displayedPrograms = participant.processedPrograms
     ? participant.processedPrograms.slice(currentPage * maxPrograms, (currentPage + 1) * maxPrograms)
     : [];

  const paginatedParticipant = {
     ...participant,
     displayedPrograms,
     pageIndex: currentPage,
     totalPages: participant.totalPages || 1,
  };

  const handleNextPage = () => {
    if (currentPage < (participant.totalPages - 1)) {
      setCurrentPage(c => c + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(c => c - 1);
    }
  };

  return (
    <div
      className={`preview-container col-span-12 xs:col-span-6 md:col-span-4 xl:col-span-3 gap-4`}
    >
      {/* Front Side Preview */}
      {(viewMode === "both" || viewMode === "front") && (
        <Card className="border-border border overflow-hidden border-none mb-4">
          <CardContent className="p-0">
            <div
              style={{
                backgroundImage: participantsCardBackgroundUrl
                  ? `url(${participantsCardBackgroundUrl})`
                  : undefined,
                backgroundColor: participantsCardBackgroundUrl
                  ? undefined
                  : "#f8f9fa",
              }}
              className={`relative bg-cover bg-center w-full aspect-[1/1.4] p-3 rounded shadow ${
                !participantsCardBackgroundUrl ? "bg-card" : ""
              }`}
            >
              {/* Participant Details */}
              <div
                className="absolute text-center"
                style={{
                  left: `${participantsCardSettings?.textPositions?.left || 0}%`,
                  right: `${participantsCardSettings?.textPositions?.right || 0}%`,
                  bottom: `${participantsCardSettings?.textPositions?.bottom || 0}%`,
                }}
              >
                {/* Chest Number with enhanced visibility */}
                <div className="backdrop-enhanced">
                  <h2
                    className="text-lg font-bold text-shadow-strong"
                    style={{ color: textColor }}
                  >
                    {participant.chestNumber || "N/A"}
                  </h2>
                </div>

                {/* Participant Name with enhanced visibility */}
                <div className="backdrop-enhanced">
                  <h3
                    className="font-bold text-base text-shadow-strong"
                    style={{ color: textColor }}
                  >
                    {participant.name}
                  </h3>
                </div>

                {/* Team and Division with enhanced visibility */}
                <div className="text-xs text-center flex flex-col items-center">
                  <div className="backdrop-enhanced">
                    <p
                      className="font-semibold text-shadow-strong"
                      style={{ color: textColor }}
                    >
                      TEAM: {participant.teamName}
                    </p>
                  </div>
                  <div className="backdrop-enhanced mb-1">
                    <p
                      className="font-semibold text-shadow-strong"
                      style={{ color: textColor }}
                    >
                      DIVISION: {participant.divisionName}
                    </p>
                  </div>
                  {/* Barcode encoding Chest Number */}
                  <div className="bg-white px-2 py-0.5 rounded shadow-sm inline-block">
                    <Barcode
                      value={participant.chestNumber || "000"}
                      width={1.2}
                      height={25}
                      displayValue={false}
                      margin={0}
                      background="transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Left QR Code: Participant Programs */}
              <div className="absolute bottom-3 left-3 bg-white p-1 rounded shadow-md border border-gray-200 flex flex-col items-center">
                <QRCodeSVG value={`${baseUrl}/participant/${participant.originalId || participant._id}`} size={45} />
                <span className="text-[9px] font-bold mt-0.5 text-gray-800 uppercase tracking-tight">Programs</span>
              </div>

              {/* Bottom Right QR Code: Results Page */}
              <div className="absolute bottom-3 right-3 bg-white p-1 rounded shadow-md border border-gray-200 flex flex-col items-center">
                <QRCodeSVG value={`${baseUrl}/results`} size={45} />
                <span className="text-[9px] font-bold mt-0.5 text-gray-800 uppercase tracking-tight">Results</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Back Side Preview */}
      {(viewMode === "both" || viewMode === "back") && (
        <Card className="overflow-hidden border border-gray-200 dark:border-gray-700">
          <CardContent className="p-4 flex flex-col h-full md:aspect-[1/1.4] bg-white dark:bg-gray-800">
            <div className="border-b border-gray-200 dark:border-gray-600 pb-1 mb-1">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 text-center">
                {participant.chestNumber} - {participant.name}
              </h3>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 text-center mt-0.5">
                {participant.teamName} | {participant.divisionName}
              </p>
            </div>

            <ParticipantPrograms 
              participant={paginatedParticipant}
              onNextPage={handleNextPage}
              onPrevPage={handlePrevPage}
              divisions={divisions}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Helper component to render a program group
const ProgramGroup = ({ title, items }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-2 last:mb-0">
      <h2 className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-0.5">
        {title}
      </h2>
      {items.map((program, index) => (
        <div key={`${program._id || program.id || index}`} className="ml-2">
          <div className="font-semibold text-gray-800 text-[11px] leading-tight dark:text-gray-200 truncate">
            {program.displayIndex || index + 1}. {program.name || "Unknown Program"}
          </div>
        </div>
      ))}
    </div>
  );
};

// Extracted component for participant programs
const ParticipantPrograms = ({ participant, onNextPage, onPrevPage, divisions = [] }) => {
  const programs = participant.displayedPrograms || participant.programs || [];
  
  // Primary (or general/undefined) programs
  const stagePrograms = programs.filter(p => p.category === "Stage" && p.divisionType !== "Secondary");
  const offStagePrograms = programs.filter(p => p.category !== "Stage" && p.divisionType !== "Secondary");

  // Secondary programs - group by division ID to get precise names
  const secondaryPrograms = programs.filter(p => p.divisionType === "Secondary");
  const secondaryByDiv = {};
  secondaryPrograms.forEach(p => {
    if (!secondaryByDiv[p.divisionId]) secondaryByDiv[p.divisionId] = [];
    secondaryByDiv[p.divisionId].push(p);
  });

  const secondaryDivisions = Object.keys(secondaryByDiv).map(divId => {
    const divName = divisions.find(d => d._id === divId)?.name || "Secondary";
    const divProgs = secondaryByDiv[divId];
    return {
      id: divId,
      name: divName,
      stagePrograms: divProgs.filter(p => p.category === "Stage"),
      offStagePrograms: divProgs.filter(p => p.category !== "Stage"),
    };
  });

  const hasNextPage = participant.pageIndex !== undefined && participant.totalPages !== undefined 
    ? participant.pageIndex < participant.totalPages - 1 
    : false;
    
  const hasPrevPage = participant.pageIndex !== undefined ? participant.pageIndex > 0 : false;

  return (
    <div className="relative flex-grow flex flex-col h-full">
      <div className="relative z-10 flex-grow">
        {programs.length > 0 ? (
          <div>
            <ProgramGroup title="Stage Programs" items={stagePrograms} />
            <ProgramGroup title="Off Stage Programs" items={offStagePrograms} />

            {/* Dynamically render secondary divisions with exact division name */}
            {secondaryDivisions.map(secDiv => (
              <div key={secDiv.id}>
                <ProgramGroup title={`${secDiv.name} Stage Programs`} items={secDiv.stagePrograms} />
                <ProgramGroup title={`${secDiv.name} Off Stage Programs`} items={secDiv.offStagePrograms} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm mt-4">
            No programs registered
          </div>
        )}
      </div>

      {/* Footer Area */}
      <div className="mt-auto pt-2 flex justify-between items-end border-t border-gray-100 dark:border-gray-700 w-full shrink-0">
        <div className="text-[9px] text-gray-600 dark:text-gray-400 font-medium leading-tight w-full pr-1">
          {/* Spacer for layout consistency when there are no arrows */}
        </div>
        
        <div className="flex gap-2 shrink-0">
          {hasPrevPage && onPrevPage && (
            <div 
              className="text-gray-800 dark:text-gray-200 font-bold flex items-center cursor-pointer hover:text-blue-600"
              onClick={onPrevPage}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              <span className="text-[10px] ml-0.5">Prev</span>
            </div>
          )}
          {hasNextPage && (
            <div 
              className={`text-gray-800 dark:text-gray-200 font-bold flex items-center ${onNextPage ? 'cursor-pointer hover:text-blue-600' : ''}`}
              onClick={onNextPage}
            >
              <span className="text-[10px] mr-0.5">Next</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Extracted component for printable participant card
const PrintableParticipantCard = ({
  participant,
  festivalSettings,
  viewMode,
  baseUrl,
  divisions = []
}) => {
  const participantsCardSettings = festivalSettings?.participantsCard || {};
  const participantsCardBackgroundUrl =
    participantsCardSettings?.backgroundImage?.url || "";

  // Single text color for all elements
  const textColor = participantsCardSettings?.textColor || "#000000";

  // Calculate card width and layout based on view mode
  const getCardLayout = () => {
    if (viewMode === "both") {
      return {
        containerClass: "w-1/2 h-1/2 p-2 flex space-x-2",
        cardClass: "w-full",
      };
    } else {
      return {
        containerClass: "w-1/4 h-1/2 p-2 flex",
        cardClass: "w-full",
      };
    }
  };

  const { containerClass, cardClass } = getCardLayout();

  return (
    <div className={containerClass} style={{ pageBreakInside: "avoid" }}>
      {/* Front Side Card */}
      {(viewMode === "both" || viewMode === "front") && (
        <div
          className={`border rounded shadow ${cardClass} overflow-hidden ${viewMode === "both" ? "mr-2" : ""}`}
        >
          <div
            style={{
              backgroundImage: participantsCardBackgroundUrl
                ? `url(${participantsCardBackgroundUrl})`
                : undefined,
              backgroundColor: participantsCardBackgroundUrl
                ? undefined
                : "#ffffff",
            }}
            className="relative bg-cover bg-center w-full aspect-[1/1.4] p-3 rounded shadow flex flex-col"
          >
            {/* Participant Details */}
            <div
              className="absolute text-center"
              style={{
                left: `${participantsCardSettings?.textPositions?.left || 0}%`,
                right: `${participantsCardSettings?.textPositions?.right || 0}%`,
                bottom: `${participantsCardSettings?.textPositions?.bottom || 0}%`,
              }}
            >
              {/* Chest Number - Print Version */}
              <div className="">
                <h2
                  className="font-bold text-lg"
                  style={{
                    color: textColor,
                  }}
                >
                  {participant.chestNumber || "N/A"}
                </h2>
              </div>

              {/* Name - Print Version */}
              <div className="">
                <h3
                  className="font-bold text-base"
                  style={{
                    color: textColor,
                  }}
                >
                  {participant.name}
                </h3>
              </div>

              {/* Team and Division - Print Version */}
              <div className="text-xs flex flex-col items-center">
                <div className="">
                  <p
                    className="font-semibold"
                    style={{
                      color: textColor,
                    }}
                  >
                    TEAM: {participant.teamName}
                  </p>
                </div>
                <div className="mb-1">
                  <p
                    className="font-semibold"
                    style={{
                      color: textColor,
                    }}
                  >
                    DIV: {participant.divisionName}
                  </p>
                </div>
                {/* Barcode encoding Chest Number */}
                <div className="bg-white px-2 py-0.5 rounded shadow-sm inline-block">
                  <Barcode
                    value={participant.chestNumber || "000"}
                    width={1.2}
                    height={25}
                    displayValue={false}
                    margin={0}
                    background="transparent"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Left QR Code: Participant Programs */}
            <div className="absolute bottom-3 left-3 bg-white p-1 rounded shadow-sm border border-gray-100 flex flex-col items-center">
              <QRCodeSVG value={`${baseUrl}/participant/${participant.originalId || participant._id}`} size={45} />
              <span className="text-[9px] font-bold mt-0.5 text-gray-800 uppercase tracking-tight">Programs</span>
            </div>

            {/* Bottom Right QR Code: Results Page */}
            <div className="absolute bottom-3 right-3 bg-white p-1 rounded shadow-sm border border-gray-100 flex flex-col items-center">
              <QRCodeSVG value={`${baseUrl}/results`} size={45} />
              <span className="text-[9px] font-bold mt-0.5 text-gray-800 uppercase tracking-tight">Results</span>
            </div>
          </div>
        </div>
      )}

      {/* Back Side Card */}
      {(viewMode === "both" || viewMode === "back") && (
        <div className={`border rounded shadow ${cardClass} overflow-hidden h-full`}>
          <div className="p-2 bg-white aspect-[1/1.4] flex flex-col h-full">
            <div className="border-b border-gray-200 pb-1 mb-1">
              <h3 className="text-[13px] font-bold text-gray-800 text-center leading-tight">
                {participant.chestNumber} - {participant.name}
              </h3>
              <p className="text-[10px] font-semibold text-gray-600 text-center mt-0.5 leading-tight">
                {participant.teamName} | {participant.divisionName}
              </p>
            </div>

            <ParticipantPrograms participant={participant} divisions={divisions} />
          </div>
        </div>
      )}
    </div>
  );
};
