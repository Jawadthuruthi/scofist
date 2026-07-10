"use client";

import { useState } from "react";
import { MessageCircle, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import axios from "axios";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

export default function LiteraryWhatsAppBulkAction({ table, allAbsentees: propAbsentees, groups = [], classes = [], date, dateForDisplay }) {
  const [open, setOpen] = useState(false);

  const { data: teachers = [], isLoading: loading } = useQuery({
    queryKey: ["teachersListWhatsApp"],
    queryFn: async () => {
      const res = await axios.get("/api/users?roles=Teacher");
      const sortedTeachers = (res.data.users || []).sort((a, b) => {
        const idA = a._id ? a._id.toString() : "";
        const idB = b._id ? b._id.toString() : "";
        return idA.localeCompare(idB, undefined, { numeric: true });
      });
      return sortedTeachers;
    },
    staleTime: 1000 * 60 * 10,
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

    let allAbsentees = propAbsentees || [];

    if (!propAbsentees) {
      const rows = table?.getFilteredRowModel()?.rows;
      if (!rows || rows.length === 0) {
        toast.error("No data found.");
        return;
      }

      // Collect all absentees from all rows
      rows.forEach(row => {
        const { absentees } = row.original;
        if (absentees && absentees.length > 0) {
          allAbsentees = [...allAbsentees, ...absentees];
        }
      });
    }

    if (allAbsentees.length === 0) {
      toast.error("No absentees found in the current view.");
      return;
    }

    // Try to get date from props, or from the first row, or fallback to today
    let finalDate = dateForDisplay || date;
    if (!finalDate && table) {
      const rows = table.getFilteredRowModel()?.rows;
      if (rows && rows.length > 0) {
        const firstRow = rows[0].original;
        finalDate = firstRow.dateForDisplay || (firstRow.date ? new Date(firstRow.date).toLocaleDateString() : null);
      }
    }
    if (!finalDate && allAbsentees.length > 0 && allAbsentees[0].date) {
      finalDate = new Date(allAbsentees[0].date).toLocaleDateString();
    }
    if (!finalDate) {
      finalDate = new Date().toLocaleDateString();
    }

    let message = `*Literary Absentees*\n${finalDate}\n\n`;

    // The current table can be mixed (Group and General). We group them by Category, then by GroupName/ClassName.
    const groupedGeneral = {};
    const groupedGroups = {};

    allAbsentees.forEach(student => {
      if (student.category === "GROUP") {
        const groupId = student.groupId;
        const group = groups.find((g) => g._id === groupId);
        const groupName = group ? group.name : (groupId || "Unknown Team");
        if (!groupedGroups[groupName]) groupedGroups[groupName] = [];
        groupedGroups[groupName].push(student);
      } else {
        const className = student.className || "Unknown Class";
        if (!groupedGeneral[className]) groupedGeneral[className] = [];
        groupedGeneral[className].push(student);
      }
    });

    const classOrderMap = new Map();
    classes.forEach((c, index) => {
      classOrderMap.set(c.name, index);
    });

    const groupOrderMap = new Map();
    groups.forEach((g, index) => {
      groupOrderMap.set(g.name, index);
    });

    if (Object.keys(groupedGeneral).length > 0) {
      message += `*--- General ---*\n\n`;
      
      const sortedClasses = Object.entries(groupedGeneral).sort(([classNameA], [classNameB]) => {
        const indexA = classOrderMap.has(classNameA) ? classOrderMap.get(classNameA) : 99999;
        const indexB = classOrderMap.has(classNameB) ? classOrderMap.get(classNameB) : 99999;
        return indexA - indexB;
      });

      for (const [className, students] of sortedClasses) {
        message += `*Class: ${className}*\n`;
        // Deduplicate students by ID just in case
        const uniqueStudents = Array.from(new Map(students.map(s => [s.studentId, s])).values());
        uniqueStudents.forEach((s, idx) => {
          message += `${idx + 1}. ${s.studentName} (${s.studentId || "Unknown ID"})\n`;
        });
        message += `\n`;
      }
    }

    if (Object.keys(groupedGroups).length > 0) {
      message += `*--- Group ---*\n\n`;
      
      const sortedGroups = Object.entries(groupedGroups).sort(([groupNameA], [groupNameB]) => {
        const indexA = groupOrderMap.has(groupNameA) ? groupOrderMap.get(groupNameA) : 99999;
        const indexB = groupOrderMap.has(groupNameB) ? groupOrderMap.get(groupNameB) : 99999;
        return indexA - indexB;
      });

      for (const [groupName, students] of sortedGroups) {
        message += `*Team: ${groupName}*\n`;
        const uniqueStudents = Array.from(new Map(students.map(s => [s.studentId, s])).values());
        uniqueStudents.forEach((s, idx) => {
          message += `${idx + 1}. ${s.studentName} (${s.className || "Unknown Class"})\n`;
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
        className="text-green-500 hover:text-green-600 hover:bg-green-50 h-8 w-8 ml-auto"
        onClick={handleOpen}
        title="Send All Absentees to WhatsApp"
      >
        <MessageCircle className="w-4 h-4" />
      </Button>
      
      {open && (
        <Dialog open={open} onOpenChange={(val) => { if (!val) setOpen(false); }}>
          <DialogContent onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle>Select Teacher to Send Consolidated WhatsApp</DialogTitle>
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
