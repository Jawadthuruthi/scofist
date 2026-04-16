"use client";

import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import StudentDashboard from "@/components/StudentDashboard";

export default function StudentProfileDialog({ student, open, onClose, classes, batches, apiKey }) {
    if (!student) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-7xl h-[90vh] p-0 overflow-hidden rounded-xl shadow-2xl flex flex-col">
                <div className="flex items-center justify-between p-4 border-b bg-card no-print">
                    <DialogTitle className="text-xl font-bold">
                        Student Report: {student.name}
                    </DialogTitle>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => onClose(false)}
                        className="rounded-full"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-muted/5">
                    <StudentDashboard 
                        user={student} 
                        apiKey={apiKey} 
                        classes={classes} 
                        batches={batches}
                        hideHeader={true}
                    />
                </div>
                
                {/* Dialog Footer Actions */}
                <div className="p-3 bg-card flex justify-end gap-3 border-t no-print">
                    <Button variant="outline" onClick={() => onClose(false)} className="px-6 h-9 text-xs">
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
