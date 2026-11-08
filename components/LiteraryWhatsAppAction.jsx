"use client";

import { useState } from "react";
import { MessageCircle, Loader2, X } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "./ui/dialog";
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
        message += `*${groupName}*\n`;
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
        message += `*${className}*\n`;
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
                  Select Teacher to Send Absentees List
                </DialogTitle>
                <DialogDescription className="m-0 text-xs text-muted-foreground">
                  Choose a teacher to share absentees via WhatsApp
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
