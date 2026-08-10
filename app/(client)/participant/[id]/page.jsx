"use client";
import { useEffect, useState, use } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import ProgramDetailsModal from "@/components/ProgramDetailsModal";

export default function ParticipantPage({ params }) {
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
  const [participant, setParticipant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchParticipant = async () => {
      try {
        const res = await fetch(`/api/participants?_id=${id}`);
        if (!res.ok) throw new Error("Failed to fetch participant");
        const data = await res.json();
        
        if (data.participants && data.participants.length > 0) {
          setParticipant(data.participants[0]);
        } else {
          setError("Participant not found");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) fetchParticipant();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-400 w-8 h-8" />
      </div>
    );
  }

  if (error || !participant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-md shadow-sm border border-red-100">
          {error || "Participant not found"}
        </div>
      </div>
    );
  }

  // Categorize programs for display
  const programs = participant.programs || [];
  
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
    // divisionName is now passed from the backend
    const divName = secondaryByDiv[divId][0]?.divisionName || "Secondary";
    const divProgs = secondaryByDiv[divId];
    return {
      id: divId,
      name: divName,
      stagePrograms: divProgs.filter(p => p.category === "Stage"),
      offStagePrograms: divProgs.filter(p => p.category !== "Stage"),
    };
  });

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-4 pt-10">
      <Card className="w-full max-w-sm overflow-hidden border border-gray-200 shadow-xl bg-white">
        <CardContent className="p-5 flex flex-col min-h-[400px]">
          {/* Header */}
          <div className="border-b border-gray-200 pb-3 mb-4 flex items-center">
            {/* Top Left Profile Picture */}
            <div className="flex-shrink-0 mr-4">
              {participant.profilePic ? (
                <img 
                  src={participant.profilePic} 
                  alt={participant.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-indigo-100 shadow-sm"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 border-2 border-gray-300 shadow-sm flex items-center justify-center text-gray-500 font-bold text-xl uppercase">
                  {participant.name?.charAt(0) || "P"}
                </div>
              )}
            </div>
            
            {/* Participant Details */}
            <div className="flex flex-col flex-grow">
              <h2 className="text-xl font-bold text-gray-800">
                Chest No: {participant.chestNumber}
              </h2>
              <h3 className="text-md font-semibold text-gray-600 mt-1 uppercase">
                {participant.name}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                TEAM: {participant.teamName} | DIV: {participant.divisionName}
              </p>
            </div>
          </div>

          <div className="flex-grow space-y-4">
            <h3 className="text-sm font-bold text-gray-800 bg-gray-100 p-2 rounded text-center mb-2 uppercase">
              Assigned Programs
            </h3>
            
            {programs.length > 0 ? (
              <div className="space-y-4">
                {/* Stage Programs */}
                {stagePrograms.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-800 text-indigo-700 mb-1 border-b pb-1">
                      Stage Programs
                    </h4>
                    <ul className="space-y-1 pl-1">
                      {stagePrograms.map((program, index) => (
                        <li 
                          key={program.id || index} 
                          className="text-sm text-gray-700 font-medium cursor-pointer hover:bg-indigo-50 p-1.5 rounded transition-colors ml-2"
                          onClick={() => {
                            setSelectedProgramId(program.id);
                            setIsModalOpen(true);
                          }}
                        >
                          {index + 1}. {program.name || "Unknown Program"}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Off Stage Programs */}
                {offStagePrograms.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-800 text-teal-700 mb-1 border-b pb-1">
                      Off Stage Programs
                    </h4>
                    <ul className="space-y-1 pl-1">
                      {offStagePrograms.map((program, index) => (
                        <li 
                          key={program.id || index} 
                          className="text-sm text-gray-700 font-medium cursor-pointer hover:bg-teal-50 p-1.5 rounded transition-colors ml-2"
                          onClick={() => {
                            setSelectedProgramId(program.id);
                            setIsModalOpen(true);
                          }}
                        >
                          {index + 1}. {program.name || "Unknown Program"}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Secondary Divisions */}
                {secondaryDivisions.map((secDiv) => (
                  <div key={secDiv.id} className="space-y-4">
                    {secDiv.stagePrograms.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-gray-800 text-indigo-700 mb-1 border-b pb-1">
                          {secDiv.name} Stage Programs
                        </h4>
                        <ul className="space-y-1 pl-1">
                          {secDiv.stagePrograms.map((program, index) => (
                            <li 
                              key={program.id || index} 
                              className="text-sm text-gray-700 font-medium cursor-pointer hover:bg-indigo-50 p-1.5 rounded transition-colors ml-2"
                              onClick={() => {
                                setSelectedProgramId(program.id);
                                setIsModalOpen(true);
                              }}
                            >
                              {index + 1}. {program.name || "Unknown Program"}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {secDiv.offStagePrograms.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-gray-800 text-teal-700 mb-1 border-b pb-1">
                          {secDiv.name} Off Stage Programs
                        </h4>
                        <ul className="space-y-1 pl-1">
                          {secDiv.offStagePrograms.map((program, index) => (
                            <li 
                              key={program.id || index} 
                              className="text-sm text-gray-700 font-medium cursor-pointer hover:bg-teal-50 p-1.5 rounded transition-colors ml-2"
                              onClick={() => {
                                setSelectedProgramId(program.id);
                                setIsModalOpen(true);
                              }}
                            >
                              {index + 1}. {program.name || "Unknown Program"}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 text-sm py-8 bg-gray-50 rounded border border-dashed border-gray-200">
                No programs assigned to this participant.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ProgramDetailsModal 
        programId={selectedProgramId} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}
