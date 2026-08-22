"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Printer, User } from "lucide-react";
import StudentProfilePrintView from "@/components/StudentProfilePrintView";
import { useDownloadPopup } from "@/hooks/useDownloadPopup";
import { useRef } from "react";

export default function StudentProfileDialog({ student, open, onClose, classes, batches, apiKey }) {
    if (!student) return null;
    const popupRef = useRef(null);
    const { handleDownload } = useDownloadPopup(popupRef, `Student_Profile_${student.name.replace(/\s+/g, '_')}.jpeg`);

    const handlePrint = () => {
        window.print();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent ref={popupRef} data-html2canvas-popup="true" className="w-[95vw] sm:max-w-4xl h-[90vh] sm:max-h-[95vh] p-0 overflow-hidden rounded-xl shadow-2xl flex flex-col [&>button.absolute]:hidden">
                <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md no-print">
                    <button 
                        type="button"
                        className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors focus:outline-none cursor-pointer"
                        onClick={handleDownload}
                        title="Download Image"
                        data-html2canvas-ignore="true"
                    >
                        <User className="h-5 w-5 text-primary" />
                    </button>
                    <div className="flex-1 text-left space-y-0.5">
                        <DialogTitle className="text-xl font-bold m-0">
                            Student Profile Summary
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground m-0">
                            Detailed profile view of {student.name}
                        </DialogDescription>
                    </div>
                    <div className="flex items-center gap-3" data-html2canvas-ignore="true">
                        <Button 
                            variant="default" 
                            size="sm" 
                            onClick={handlePrint}
                            className="flex items-center gap-2 font-bold uppercase tracking-wider text-xs bg-black text-white hover:bg-black/90 px-4 h-8"
                        >
                            <Printer className="h-3.5 w-3.5" />
                            Print
                        </Button>
                        <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none">
                            <X className="h-5 w-5" />
                        </DialogClose>
                    </div>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/10">
                    <StudentProfilePrintView 
                        student={student} 
                        apiKey={apiKey} 
                        classes={classes} 
                        batches={batches}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
