"use client";

import { useState } from "react";
import { MessageCircle, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import axios from "axios";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

export default function LiteraryWhatsAppAction({ rowData, groups = [] }) {
  const [open, setOpen] = useState(false);

  const { data: teachers = [], isLoading: loading } = useQuery({
    queryKey: ["teachersListWhatsApp"],
    queryFn: async () => {
      const res = await axios.get("/api/users?roles=Teacher");
      const sortedTeachers = (res.data.users || []).sort((a, b) => {
        if (a.dateOfBirth && b.dateOfBirth) {
          const timeA = new Date(a.dateOfBirth).getTime();
          const timeB = new Date(b.dateOfBirth).getTime();
          if (timeA !== timeB) return timeA - timeB; // Older (smaller date) first
        } else if (a.dateOfBirth) {
          return -1;
        } else if (b.dateOfBirth) {
          return 1;
        }
        
        const idA = a._id ? a._id.toString() : "";
        const idB = b._id ? b._id.toString() : "";
        return idA.localeCompare(idB, undefined, { numeric: true });
      });
      return sortedTeachers;
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });

  const handleOpen = (e) => {
    e.stopPropagation();
    setOpen(true);
  };

  const handleSend = (teacher) => {
    if (!teacher || !teacher.contactNumber) {
      toast.error("Teacher contact number not found");
      return;
    }

    const { absentees, category, date, dateForDisplay, sessionLabel } = rowData;
    
    if (!absentees || absentees.length === 0) {
      toast.error("No absentees found for this date.");
      return;
    }
    
    const formattedDate = dateForDisplay || new Date(date).toLocaleDateString();
    
    const displayCategory = sessionLabel || (category === "ALL" || category === "GROUP" ? "Literary" : category.charAt(0).toUpperCase() + category.slice(1).toLowerCase());
    let message = `*${displayCategory} Absentees*\n${formattedDate}\n\n`;
    
    if (category === "GROUP") {
      // Group attendance -> group by Team (groupId)
      const grouped = absentees.reduce((acc, student) => {
         const groupId = student.groupId;
         const group = groups.find((g) => g._id === groupId);
         const groupName = group ? group.name : (groupId || "Unknown Team");
         
         if (!acc[groupName]) acc[groupName] = [];
         acc[groupName].push(student);
         return acc;
      }, {});
      
      for (const [groupName, students] of Object.entries(grouped)) {
        message += `*Team: ${groupName}*\n`;
        students.forEach((s, idx) => {
          message += `${idx + 1}. ${s.studentName} (${s.className || "Unknown Class"})\n`;
        });
        message += `\n`;
      }
    } else {
      // General attendance -> group by class
      const grouped = absentees.reduce((acc, student) => {
         const className = student.className || "Unknown Class";
         if (!acc[className]) acc[className] = [];
         acc[className].push(student);
         return acc;
      }, {});
      
      for (const [className, students] of Object.entries(grouped)) {
        message += `*Class: ${className}*\n`;
        students.forEach((s, idx) => {
          message += `${idx + 1}. ${s.studentName} (${s.studentId || "Unknown ID"})\n`;
        });
        message += `\n`;
      }
    }
    
    const formattedNumber = teacher.contactNumber.replace(/\D/g, '');
    const url = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    setOpen(false);
  };

  return (
    <>
      <Button 
        variant="ghost" 
        size="icon" 
        className="text-green-500 hover:text-green-600 hover:bg-green-50 h-8 w-8"
        onClick={handleOpen}
        title="Send to WhatsApp"
      >
        <MessageCircle className="w-4 h-4" />
      </Button>
      
      {open && (
        <Dialog open={open} onOpenChange={(val) => { if (!val) setOpen(false); }}>
          <DialogContent onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle>Select Teacher to Send WhatsApp</DialogTitle>
            </DialogHeader>
            <div className="py-2 max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                  <span className="ml-2 text-sm text-gray-500">Loading teachers...</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {teachers.map((teacher) => (
                    <Button
                      key={teacher._id}
                      variant="outline"
                      className="justify-start h-auto py-2 px-3 flex items-center"
                      onClick={() => handleSend(teacher)}
                    >
                      <div className="flex flex-col items-start w-full text-left">
                        <span className="font-medium text-sm">{teacher.name}</span>
                        {teacher.contactNumber && (
                          <span className="text-xs text-muted-foreground">{teacher.contactNumber}</span>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
