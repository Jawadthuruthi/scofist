"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, Clock, MapPin, Trophy, FileText, Info } from "lucide-react";
import ResultPostersSection from "./ResultPostersSection";

const ProgramDetailsModal = ({ programId, isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [program, setProgram] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [result, setResult] = useState(null);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    if (!isOpen || !programId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [progRes, schedRes, resRes, setRes] = await Promise.all([
          fetch(`/api/programs?_id=${programId}`),
          fetch(`/api/schedules?programId=${programId}`),
          fetch(`/api/results?programId=${programId}`),
          fetch(`/api/settings`),
        ]);

        if (!progRes.ok) throw new Error("Failed to fetch program details");
        
        const progData = await progRes.json();
        const schedData = await schedRes.json();
        const resData = await resRes.json();
        const setData = await setRes.json();

        setProgram(progData.programs?.[0] || null);
        
        // Find schedule if any
        if (schedData.schedules && schedData.schedules.length > 0) {
          setSchedule(schedData.schedules[0]);
        } else {
          setSchedule(null);
        }

        // Find result if any
        if (resData.results && resData.results.length > 0) {
          // api/results returns full populated participants only when isResultDeclared is true and might need .participantDetails fallback
          setResult(resData.results[0]);
        } else {
          setResult(null);
        }

        setSettings(setData.settings || null);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, programId]);

  // Helper to format time
  const formatTime = (time24) => {
    if (!time24) return "N/A";
    const [hours, minutes] = time24.split(":");
    const hour12 = ((parseInt(hours) + 11) % 12) + 1;
    const ampm = parseInt(hours) >= 12 ? "PM" : "AM";
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Helper to calculate status
  const getStatus = () => {
    if (!schedule || !schedule.date || !schedule.startTime || !schedule.endTime) {
      return { text: "Unscheduled", color: "bg-gray-100 text-gray-800" };
    }
    const now = new Date();
    const scheduleDate = new Date(schedule.date);
    const [startHours, startMinutes] = schedule.startTime.split(":").map(Number);
    const [endHours, endMinutes] = schedule.endTime.split(":").map(Number);
    
    const startDateTime = new Date(scheduleDate);
    startDateTime.setHours(startHours, startMinutes, 0, 0);
    
    const endDateTime = new Date(scheduleDate);
    endDateTime.setHours(endHours, endMinutes, 0, 0);

    if (now < startDateTime) {
      return { text: "Upcoming", color: "bg-blue-100 text-blue-800" };
    } else if (now >= startDateTime && now <= endDateTime) {
      return { text: "Ongoing", color: "bg-green-100 text-green-800" };
    } else {
      return { text: "Completed", color: "bg-purple-100 text-purple-800" };
    }
  };

  const renderItemsWithStar = (text) => {
    if (!text) return null;
    const items = text
      .split(".")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    if (items.length === 0) return <p className="text-sm text-gray-500 italic">No information available.</p>;
    return (
      <div className="space-y-1 mt-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <span className="text-indigo-600 font-bold mt-0.5 shrink-0">*</span>
            <span className="text-sm text-gray-600 leading-relaxed">{item}</span>
          </div>
        ))}
      </div>
    );
  };

  const status = getStatus();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between pr-6">
            <div>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                {program?.name || "Loading..."}
              </DialogTitle>
              {program && (
                <>
                  <p className="text-sm font-semibold text-gray-500 uppercase mt-1">
                    {program?.divisionName || program?.divisionId?.name}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{program.category}</Badge>
                    <Badge variant="outline">{program.type}</Badge>
                    {status.text !== "Unscheduled" && (
                      <Badge className={status.color} variant="secondary">{status.text}</Badge>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-100 text-center">
            {error}
          </div>
        ) : !program ? (
          <div className="text-center text-gray-500 py-8">Program not found.</div>
        ) : (
          <Tabs defaultValue="details" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>
            
            {/* DETAILS TAB */}
            <TabsContent value="details" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-indigo-600" /> Topic
                  </h3>
                  <div className="text-sm text-gray-600 whitespace-pre-wrap">
                    {program.topics ? renderItemsWithStar(program.topics) : "No topic specified."}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-indigo-600" /> Rules
                  </h3>
                  <div className="text-sm text-gray-600 whitespace-pre-wrap">
                    {program.rules ? renderItemsWithStar(program.rules) : "No rules specified."}
                  </div>
                </div>
              </div>

              {program.criteria && program.criteria.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-800 border-b pb-2 mb-3">Evaluation Criteria</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse border border-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 font-medium border-b border-gray-200 text-gray-700">Criteria Name</th>
                          <th className="px-4 py-2 font-medium border-b border-gray-200 w-24 text-gray-700 text-center">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {program.criteria.map((c, i) => (
                          <tr key={i} className="border-b border-gray-200 last:border-0 hover:bg-gray-50">
                            <td className="px-4 py-2 font-medium text-gray-700">{c.name}</td>
                            <td className="px-4 py-2 font-medium text-center text-indigo-700 bg-indigo-50/50">{c.score}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* SCHEDULE TAB */}
            <TabsContent value="schedule" className="pt-4">
              {schedule ? (
                <div className="bg-white border rounded-lg p-6 shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg">
                      <Calendar className="w-8 h-8 text-indigo-500 mb-2" />
                      <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Date</span>
                      <span className="text-lg font-bold text-gray-800">
                        {new Date(schedule.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg">
                      <Clock className="w-8 h-8 text-teal-500 mb-2" />
                      <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Time</span>
                      <span className="text-lg font-bold text-gray-800">
                        {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                      </span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg">
                      <MapPin className="w-8 h-8 text-rose-500 mb-2" />
                      <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Stage</span>
                      <span className="text-lg font-bold text-gray-800">
                        {schedule.stageNumber ? `Stage ${schedule.stageNumber}` : "TBA"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">This program has not been scheduled yet.</p>
                </div>
              )}
            </TabsContent>

            {/* RESULTS TAB */}
            <TabsContent value="results" className="pt-4">
              {result && result.isResultDeclared ? (
                <div className="space-y-4">
                  <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                    <ul className="divide-y divide-gray-100">
                      {result.participants
                        ?.filter(p => p.rank > 0)
                        .sort((a, b) => a.rank - b.rank)
                        .map((p, i) => (
                          <li key={i} className="p-4 flex items-center justify-between hover:bg-gray-50">
                            <div className="flex items-center gap-4">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                                ${p.rank === 1 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 
                                  p.rank === 2 ? 'bg-gray-100 text-gray-700 border border-gray-200' : 
                                  p.rank === 3 ? 'bg-amber-100 text-amber-700 border border-amber-200' : 
                                  'bg-blue-50 text-blue-700'}`}>
                                {p.rank}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">{p.participantDetails?.name || "Unknown Participant"}</p>
                                <p className="text-xs text-gray-500 uppercase">{p.participantDetails?.teamId?.name || "Unknown Team"}</p>
                              </div>
                            </div>
                            <div className="text-right flex items-center justify-end gap-2">
                              {(() => {
                                let displayGrade = p.grade || "-";
                                if (displayGrade.toLowerCase() === "no grade" || displayGrade.toLowerCase() === "f") {
                                  displayGrade = "-";
                                }
                                return (
                                  <>
                                    <Badge variant="outline" className="font-medium bg-white min-w-[24px] text-center">{displayGrade}</Badge>
                                    {p.points > 0 && (
                                      <Badge variant="secondary" className="font-medium bg-gray-100">{p.points} Pts</Badge>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Results have not been declared yet.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProgramDetailsModal;
