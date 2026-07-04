"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { Button } from "./ui/button";
import ClassPerformanceModal from "./ClassPerformanceModal";

export default function LiteraryPerformanceAction({ rowData, apiKey }) {
  const [performanceModalOpen, setPerformanceModalOpen] = useState(false);

  const handleOpen = (e) => {
    e.stopPropagation();
    setPerformanceModalOpen(true);
  };

  const { category, classId, groupId, _id } = rowData;
  const targetClassId = category === "GROUP" ? groupId : classId;
  const subjectName = category === "GROUP" ? "Literary - Group" : `Literary - ${category || "General"}`;

  const slot = {
    classId: targetClassId,
    subjectId: { name: subjectName },
  };

  return (
    <>
      <Button 
        variant="ghost" 
        size="icon" 
        className="text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 h-8 w-8 print:hidden"
        onClick={handleOpen}
        title="Performance"
      >
        <TrendingUp className="w-4 h-4" />
      </Button>
      
      {performanceModalOpen && (
        <ClassPerformanceModal 
          open={performanceModalOpen} 
          onOpenChange={setPerformanceModalOpen}
          slot={slot}
          attendanceRecord={rowData}
          apiKey={apiKey}
          defaultComment="Literary Performance"
        />
      )}
    </>
  );
}
