"use client";

import { useState } from "react";
import { MessageCircle, Loader2, X } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "./ui/dialog";
import axios from "axios";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

export default function LiteraryWhatsAppBulkAction({ table, allAbsentees: propAbsentees, groups = [], classes = [], date, dateForDisplay, sessionLabel }) {
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
    staleTime: 1000 * 60 * 10,
  });

  const getClassShortName = (s) => {
    if (s.classShortName) return s.classShortName;
    if (classes && classes.length > 0) {
      const cls = classes.find(
        (c) =>
          (s.classId && String(c._id) === String(s.classId)) ||
          (s.className &&
            (c.name?.toLowerCase() === s.className.toLowerCase() ||
              c.shortname?.toLowerCase() === s.className.toLowerCase()))
      );
      if (cls?.shortname) return cls.shortname;
      if (cls?.name) return cls.name;
    }
    return s.className || "Unknown Class";
  };

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

    let displayCategory = sessionLabel;
    if (!displayCategory) {
      if (allAbsentees.length > 0 && allAbsentees[0].category !== "ALL" && allAbsentees[0].category !== "GROUP") {
        displayCategory = allAbsentees[0].category.charAt(0).toUpperCase() + allAbsentees[0].category.slice(1).toLowerCase();
      } else {
        displayCategory = "Literary";
      }
    }
    let message = `*${displayCategory} Absentees*\n${finalDate}\n\n`;

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
        message += `*${className}*\n`;
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
        message += `*${groupName}*\n`;
        const uniqueStudents = Array.from(new Map(students.map(s => [s.studentId, s])).values());
        uniqueStudents.forEach((s, idx) => {
          const shortClass = getClassShortName(s);
          message += `${idx + 1}. ${s.studentName} (${shortClass})\n`;
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
          <DialogContent
            onClick={(e) => e.stopPropagation()}
            className="rounded-2xl sm:rounded-2xl overflow-hidden max-w-md [&>button.absolute]:hidden flex flex-col p-0 gap-0"
          >
            <DialogHeader className="flex flex-row items-center gap-3 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left space-y-0.5">
                <DialogTitle className="text-base md:text-lg font-bold m-0 text-foreground">
                  Select Teacher
                </DialogTitle>
                <DialogDescription className="m-0 text-xs text-muted-foreground">
                  Choose a teacher to share absentees list.
                </DialogDescription>
              </div>
              <DialogClose
                className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
              </DialogClose>
            </DialogHeader>
            <div className="p-4 space-y-2 bg-muted/5 overflow-y-auto max-h-[60vh]">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading teachers...</span>
                </div>
              ) : teachers.length === 0 ? (
                <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                  No teachers found
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {teachers.map((teacher) => (
                    <div
                      key={teacher._id}
                      className="flex justify-between items-center py-2.5 px-3.5 border bg-card hover:bg-muted/40 rounded-xl transition-all shadow-xs gap-3 cursor-pointer"
                      onClick={() => handleSend(teacher)}
                    >
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-semibold text-sm text-foreground">
                          {teacher.name}
                        </span>
                        {teacher.contactNumber && (
                          <span className="text-xs text-muted-foreground mt-0.5">
                            {teacher.contactNumber}
                          </span>
                        )}
                      </div>
                      <div className="p-2 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <MessageCircle className="w-4 h-4" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
