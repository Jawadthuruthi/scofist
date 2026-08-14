import { useEffect, useState, use } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, User } from "lucide-react";
import ProgramDetailsModal from "@/components/ProgramDetailsModal";

export default function ParticipantPage({ params }) {
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
  const [participant, setParticipant] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [participantRes, settingsRes] = await Promise.all([
           fetch(`/api/participants?_id=${id}`),
           fetch(`/api/settings`)
        ]);
        
        if (!participantRes.ok) throw new Error("Failed to fetch participant");
        const data = await participantRes.json();
        
        if (data.participants && data.participants.length > 0) {
          setParticipant(data.participants[0]);
        } else {
          setError("Participant not found");
        }

        if (settingsRes.ok) {
           const setData = await settingsRes.json();
           setSettings(setData.settings || null);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) fetchData();
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
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-4 pt-10 pb-10">
      <div className="w-full max-w-md rounded-2xl sm:rounded-2xl overflow-hidden max-h-[85vh] flex flex-col p-0 gap-0 border border-gray-200 shadow-xl bg-white">
        
        {/* Festival Name Image */}
        {settings?.festival?.festivalNameImage?.url && (
          <div className="w-full bg-white flex justify-center py-4 px-2 border-b shrink-0">
             <img 
                src={settings.festival.festivalNameImage.url} 
                alt="Festival Name" 
                className="h-10 object-contain drop-shadow-sm" 
             />
          </div>
        )}

        {/* Header mimicking Dashboard Card Popups */}
        <div className="flex flex-row items-center gap-3 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md shrink-0">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            {participant.profilePic ? (
              <img 
                src={participant.profilePic} 
                alt={participant.name}
                className="h-8 w-8 rounded-full object-cover border border-primary/20 shadow-sm"
              />
            ) : (
              <User className="h-8 w-8 text-primary p-1" />
            )}
          </div>
          
          <div className="flex-1 text-left space-y-0.5 min-w-0">
            <h2 className="text-xl font-bold m-0 text-foreground truncate">
              {participant.name}
            </h2>
            <p className="text-sm text-muted-foreground m-0 truncate">
              Chest No: {participant.chestNumber} | {participant.teamName} | {participant.divisionName}
            </p>
          </div>
        </div>

        <div className="text-sm border-0 p-5 overflow-y-auto bg-muted/5 space-y-4 flex-1">
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
      </div>

      <ProgramDetailsModal 
        programId={selectedProgramId} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}
