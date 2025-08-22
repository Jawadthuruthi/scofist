"use client";
import { useRef, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Printer, User } from "lucide-react";
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

const ParticipantsCard = ({
  participants = [],
  divisions = [],
  teams = [],
  festivalSettings = {},
}) => {
  const [selectedDivision, setSelectedDivision] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedParticipant, setSelectedParticipant] = useState("");

  const pageRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: pageRef,
    documentTitle: "Participants Cards",
  });

  // Memoize filtered participants to prevent recalculation on every render
  const filteredParticipants = useMemo(() => {
    return participants.filter(
      (participant) =>
        (!selectedDivision || participant.divisionId === selectedDivision) &&
        (!selectedTeam || participant.teamId === selectedTeam) &&
        (!selectedParticipant || participant._id === selectedParticipant)
    );
  }, [participants, selectedDivision, selectedTeam, selectedParticipant]);

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
  const participantsInSelectedTeam = useMemo(() => {
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
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="w-full md:w-1/4">
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
        <div className="w-full md:w-1/4">
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
        {selectedTeam && (
          <div className="w-full md:w-1/4">
            <label htmlFor="participant-select" className="sr-only">
              Select a Participant
            </label>
            <Select
              value={selectedParticipant}
              onValueChange={setSelectedParticipant}
            >
              <SelectTrigger className="w-full" id="participant-select">
                <SelectValue placeholder="Select a Participant" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={null}>All Participants</SelectItem>
                  {participantsInSelectedTeam.map((participant) => (
                    <SelectItem key={participant._id} value={participant._id}>
                      {participant.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div className="flex justify-end mb-8">
        <Button
          onClick={handlePrint}
          aria-label="Print Participant Cards"
          variant="default"
        >
          <Printer size={16} />
          Print
        </Button>
      </div>

      {/* Screen Preview */}
      <div className="grid grid-cols-12 gap-4 print:hidden">
        {filteredParticipants.map((participant) => (
          <ParticipantCard
            key={participant._id}
            participant={participant}
            festivalSettings={festivalSettings}
          />
        ))}
      </div>

      {/* Print Layout - A4 Landscape with Front-Back-Front-Back pattern */}
      <div ref={pageRef} className="hidden print:block">
        {Array.from({ length: Math.ceil(filteredParticipants.length / 4) }).map(
          (_, pageIndex) => (
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

              {filteredParticipants
                .slice(pageIndex * 4, (pageIndex + 1) * 4)
                .map((participant) => (
                  <PrintableParticipantCard
                    key={`print-${participant._id}`}
                    participant={participant}
                    festivalSettings={festivalSettings}
                  />
                ))}
            </div>
          )
        )}
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
      `}</style>
    </div>
  );
};

// Extracted component for participant card preview
const ParticipantCard = ({ participant, festivalSettings }) => {
  const idCardBackgroundUrl = festivalSettings?.idCard?.url || "";
  const textColor = festivalSettings?.textColor || "#ffffff";

  return (
    <div className="preview-container col-span-12 xs:col-span-6 md:col-span-4 xl:col-span-3 gap-4">
      {/* Front Side Preview */}
      <Card className="shadow-md  border-border border overflow-hidden border-none mb-4">
        <CardContent className="p-0">
          <div
            style={{
              backgroundImage: idCardBackgroundUrl
                ? `url(${idCardBackgroundUrl})`
                : undefined,
              backgroundColor: idCardBackgroundUrl ? undefined : undefined,
            }}
            className={`bg-cover bg-center w-full h-full p-4 rounded shadow ${
              !idCardBackgroundUrl ? "bg-card" : ""
            }`}
          >
            {/* Gap for heading area - where background image heading would be */}
            <div className="h-16 mb-4"></div>

            {/* Participant Photo */}
            <div className="flex justify-center mb-4">
              <div className="w-24 h-28 bg-white border-2 border-white rounded-md relative overflow-hidden shadow-md">
                {participant.profilePic?.url ? (
                  <div className="relative h-full w-full">
                    <Image
                      src={participant.profilePic.url || ""}
                      alt={`${participant.name}'s photo`}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gray-100">
                    <User size={32} className="text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Participant Details */}
            <div className="text-center space-y-2">
              <div className="bg-muted p-2 rounded-md">
                <h2 className="text-lg font-bold text-muted-foreground">
                  {participant.chestNumber || "N/A"}
                </h2>
                <p className="text-xs text-gray-600">CHEST NUMBER</p>
              </div>

              <div className="bg-black/20 p-1 rounded backdrop-blur-sm">
                <h3 className="font-bold text-sm text-white">
                  {participant.name}
                </h3>
              </div>

              <div className="text-xs text-center space-y-1">
                <div className="bg-black/20 p-1 rounded backdrop-blur-sm">
                  <p className="font-semibold text-white">
                    TEAM: {participant.teamName}
                  </p>
                </div>
                <div className="bg-black/20 p-1 rounded backdrop-blur-sm">
                  <p className="font-semibold text-white">
                    DIVISION: {participant.divisionName}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Back Side Preview */}
      <Card className="shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
        <CardContent className="p-4 flex flex-col h-full bg-white dark:bg-gray-800">
          <div className="border-b border-gray-200 dark:border-gray-600 pb-2 mb-3">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 text-center">
              Programs
            </h3>
          </div>

          <ParticipantPrograms participant={participant} />
        </CardContent>
      </Card>
    </div>
  );
};

// Extracted component for participant programs
const ParticipantPrograms = ({ participant }) => {
  const programs = participant.programs || [];

  return (
    <div className="relative flex-grow">
      <div className="relative z-10">
        {programs.length > 0 ? (
          <div>
            {programs.map((program, index) => (
              <div key={index}>
                <div className="font-semibold text-gray-800 text-xs dark:text-gray-200">
                  {program.name || "Unknown Program"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
            No programs registered
          </div>
        )}
      </div>
    </div>
  );
};

// Extracted component for printable participant card
const PrintableParticipantCard = ({ participant, festivalSettings }) => {
  const idCardBackgroundUrl = festivalSettings?.idCard?.url || "";
  const textColor = festivalSettings?.textColor || "#ffffff";

  return (
    <div
      className="w-1/2 h-1/2 p-2 flex space-x-2"
      style={{ pageBreakInside: "avoid" }}
    >
      {/* Front Side Card */}
      <div className="border rounded shadow w-full overflow-hidden">
        <div
          style={{
            backgroundImage: idCardBackgroundUrl
              ? `url(${idCardBackgroundUrl})`
              : undefined,
            backgroundColor: idCardBackgroundUrl ? undefined : "#ffffff",
            color: textColor,
          }}
          className="bg-cover bg-center w-full h-full p-3 rounded shadow flex flex-col"
        >
          {/* Gap for heading area */}
          <div className="h-8 mb-2"></div>

          {/* Participant Photo */}
          <div className="flex justify-center mb-2">
            <div className="w-20 h-24 bg-white border border-white rounded relative overflow-hidden">
              {participant.profilePic?.url ? (
                <div className="relative h-full w-full">
                  <Image
                    src={participant.profilePic.url || ""}
                    alt={`${participant.name}'s photo`}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gray-100">
                  <User size={16} className="text-gray-400" />
                </div>
              )}
            </div>
          </div>

          {/* Participant Details */}
          <div className="text-center space-y-1 flex-grow">
            <div className="bg-white/90 p-1 rounded">
              <h2 className="text-sm font-bold text-gray-800">
                {participant.chestNumber || "N/A"}
              </h2>
              <p className="text-xs text-gray-600">CHEST NUMBER</p>
            </div>

            <div className="bg-black/20 p-1 rounded backdrop-blur-sm">
              <h3 className="font-bold text-xs" style={{ color: textColor }}>
                {participant.name}
              </h3>
            </div>

            <div className="text-xs space-y-0.5">
              <div className="bg-black/20 p-0.5 rounded backdrop-blur-sm">
                <p className="font-semibold" style={{ color: textColor }}>
                  TEAM: {participant.teamName}
                </p>
              </div>
              <div className="bg-black/20 p-0.5 rounded backdrop-blur-sm">
                <p className="font-semibold" style={{ color: textColor }}>
                  DIV: {participant.divisionName}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Back Side Card */}
      <div className="border rounded shadow w-full overflow-hidden">
        <div className="p-2 bg-white h-full flex flex-col">
          <div className="border-b border-gray-200 pb-1 mb-2">
            <h3 className="text-xs font-semibold text-gray-800 text-center">
              Program Participation
            </h3>
          </div>

          <ParticipantPrograms participant={participant} />
        </div>
      </div>
    </div>
  );
};

export default ParticipantsCard;
