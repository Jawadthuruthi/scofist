"use client";
import { useEffect, useState, use } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, User, Trophy, X } from "lucide-react";
import ProgramDetailsModal from "@/components/ProgramDetailsModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";

export default function ParticipantPage({ params }) {
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
  const [participant, setParticipant] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPointsModalOpen, setIsPointsModalOpen] = useState(false);

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
    <div className="min-h-screen bg-gray-100 flex flex-col lg:flex-row justify-center items-start lg:items-stretch gap-6 p-4 pt-10 pb-10">
      <div className="w-full max-w-md rounded-2xl sm:rounded-2xl overflow-hidden max-h-[70vh] sm:max-h-[80vh] flex flex-col p-0 gap-0 border border-gray-200 shadow-xl bg-white mx-auto lg:mx-0">
        
        {/* Festival Name Image */}
        {settings?.festival?.festivalNameImage?.url && (
          <div className="w-full bg-amber-100/60 flex justify-center py-4 px-2 border-b shrink-0">
             <img 
                src={settings.festival.festivalNameImage.url} 
                alt="Festival Name" 
                className="h-14 object-contain drop-shadow-sm" 
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

        <div className="text-sm border-0 p-5 pt-3 overflow-y-auto bg-muted/5 space-y-4 flex-1">
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

      {/* My Points Section Card */}
      <div 
        onClick={() => setIsPointsModalOpen(true)}
        className="w-full max-w-md rounded-2xl overflow-hidden border border-gray-200 shadow-xl bg-gradient-to-br from-white to-amber-50/30 flex flex-col items-center justify-center p-8 cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 group"
      >
        <div className="bg-amber-100 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
          <Trophy className="w-12 h-12 text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">My Points</h2>
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-5xl font-black text-amber-600 tracking-tight">{participant.totalPoints || 0}</span>
          <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Pts</span>
        </div>
        <div className="px-6 py-2 bg-white rounded-full border border-amber-200 shadow-sm text-sm font-semibold text-amber-700">
          Click to view breakdown
        </div>
      </div>

      <ProgramDetailsModal 
        programId={selectedProgramId} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />

      <Dialog open={isPointsModalOpen} onOpenChange={setIsPointsModalOpen}>
        <DialogContent className="rounded-2xl sm:rounded-2xl max-w-md overflow-hidden flex flex-col p-0 gap-0 [&>button.absolute]:hidden max-h-[80vh]">
          <DialogHeader className="flex flex-row items-center gap-3 px-5 py-4 border-b space-y-0 bg-amber-50/50 sticky top-0 z-20 shrink-0">
            <div className="p-2 rounded-lg bg-amber-100 shrink-0">
              <Trophy className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1 text-left space-y-0.5">
              <DialogTitle className="text-lg font-bold m-0 text-gray-800">
                My Points
              </DialogTitle>
              <p className="text-xs text-gray-500 m-0">
                Total: <span className="font-bold text-amber-600">{participant.totalPoints || 0}</span> Points
              </p>
            </div>
            <DialogClose className="p-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </DialogClose>
          </DialogHeader>

          <div className="p-5 overflow-y-auto space-y-3 bg-muted/5">
            {programs.length > 0 ? (
              programs.map((prog, idx) => (
                <div key={idx} className="bg-white border rounded-lg p-3 shadow-sm flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-800 text-sm truncate">{prog.name || "Unknown Program"}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      {prog.grade && prog.grade !== "—" && (
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded font-medium">{prog.grade}</span>
                      )}
                      {prog.rank && prog.rank !== "—" && (
                        <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Rank {prog.rank}</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end justify-center bg-gray-50 rounded p-2 min-w-[3.5rem] border border-gray-100 text-center">
                    <span className="text-lg font-bold text-gray-800 leading-none">{prog.points || 0}</span>
                    <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mt-0.5">Pts</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 text-sm py-8 bg-white rounded border border-dashed border-gray-200">
                No programs assigned yet.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
