"use client";
import { useEffect, useState, use } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function ParticipantPage({ params }) {
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
  const [participant, setParticipant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  // Filter programs based on stage/offstage and individual/group
  const programs = participant.programs || [];
  
  // Categorize programs for display
  const stageIndividual = programs.filter(p => p.category === "Stage" && p.type === "Individual");
  const stageGroup = programs.filter(p => p.category === "Stage" && p.type === "Group");
  const offStageIndividual = programs.filter(p => p.category !== "Stage" && p.type === "Individual");
  const offStageGroup = programs.filter(p => p.category !== "Stage" && p.type === "Group");

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
                {/* Stage Individual */}
                {stageIndividual.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-800 text-indigo-700 mb-1 border-b pb-1">
                      Stage Programs (Individual)
                    </h4>
                    <ul className="space-y-1 pl-1">
                      {stageIndividual.map((program, index) => (
                        <li key={index} className="text-sm text-gray-700 font-medium">
                          {index + 1}. {program.name || "Unknown Program"}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Stage Group */}
                {stageGroup.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-800 text-indigo-700 mb-1 border-b pb-1">
                      Stage Programs (Group)
                    </h4>
                    <ul className="space-y-1 pl-1">
                      {stageGroup.map((program, index) => (
                        <li key={index} className="text-sm text-gray-700 font-medium">
                          {index + 1}. {program.name || "Unknown Program"}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Off Stage Individual */}
                {offStageIndividual.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-800 text-teal-700 mb-1 border-b pb-1">
                      Off Stage Programs (Individual)
                    </h4>
                    <ul className="space-y-1 pl-1">
                      {offStageIndividual.map((program, index) => (
                        <li key={index} className="text-sm text-gray-700 font-medium">
                          {index + 1}. {program.name || "Unknown Program"}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Off Stage Group */}
                {offStageGroup.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-800 text-teal-700 mb-1 border-b pb-1">
                      Off Stage Programs (Group)
                    </h4>
                    <ul className="space-y-1 pl-1">
                      {offStageGroup.map((program, index) => (
                        <li key={index} className="text-sm text-gray-700 font-medium">
                          {index + 1}. {program.name || "Unknown Program"}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 text-sm py-8 bg-gray-50 rounded border border-dashed border-gray-200">
                No programs assigned to this participant.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
