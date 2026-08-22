"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDownloadPopup } from "@/hooks/useDownloadPopup";
import { useRef } from "react";
import { Loader, Users, X, Eye } from "lucide-react";
import useCrud from "@/hooks/use-crud";
import { formatDateForDisplay } from "@/lib/utils";

const PendingRequestsDialog = ({ open, onClose, apiKey, onView, role = "Student" }) => {
  const { useFetchItems } = useCrud("users", apiKey);

  const { data, isLoading } = useFetchItems(
    0,
    100, // Fetch up to 100 pending requests
    {
      roles: role,
      profileUpdateStatus: "Pending",
    },
    {
      enabled: open,
      refetchOnWindowFocus: true,
    }
  );

  const popupRef = useRef(null);
  const { handleDownload } = useDownloadPopup(popupRef, `Pending_Requests_${role}.jpeg`);

  const pendingStudents = useMemo(() => {
    const students = data?.users || [];
    return [...students].sort((a, b) => {
      const dateA = new Date(a.profileRequestDate || 0).getTime();
      const dateB = new Date(b.profileRequestDate || 0).getTime();
      return dateB - dateA;
    });
  }, [data]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent ref={popupRef} data-html2canvas-popup="true" className="rounded-2xl sm:rounded-2xl max-w-3xl max-h-[70vh] sm:max-h-[85vh] [&>button.absolute]:hidden grid grid-rows-[auto_minmax(0,1fr)] p-0 gap-0">
        <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md">
          <button 
            type="button"
            className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors focus:outline-none cursor-pointer"
            onClick={handleDownload}
            title="Download Image"
            data-html2canvas-ignore="true"
          >
            <Users className="h-5 w-5 text-primary" />
          </button>
          <div className="flex-1 text-left space-y-0.5">
            <DialogTitle className="text-xl font-bold m-0">Profile Update Requests</DialogTitle>
            <DialogDescription className="m-0">
              {role}s who have requested
            </DialogDescription>
          </div>
          <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none" data-html2canvas-ignore="true">
            <X className="h-5 w-5" />
          </DialogClose>
        </DialogHeader>

        <div className="overflow-auto p-5 bg-background">
          <div className="border rounded-md">
            <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[40px] px-2 sm:px-4 text-xs sm:text-sm">Sl No</TableHead>
                <TableHead className="px-2 sm:px-4 text-xs sm:text-sm">ID</TableHead>
                <TableHead className="px-2 sm:px-4 text-xs sm:text-sm">Name</TableHead>
                <TableHead className="px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell">Date of Request</TableHead>
                <TableHead className="text-right px-2 sm:px-4 text-xs sm:text-sm">View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : pendingStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No pending profile requests
                  </TableCell>
                </TableRow>
              ) : (
                pendingStudents.map((student, index) => (
                  <TableRow key={student._id}>
                    <TableCell className="font-medium px-2 sm:px-4 py-2 sm:py-3">{index + 1}</TableCell>
                    <TableCell className="text-xs text-muted-foreground px-2 sm:px-4 py-2 sm:py-3 max-w-[80px] sm:max-w-none truncate" title={student._id}>{student._id}</TableCell>
                    <TableCell className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-sm">{student.name}</TableCell>
                    <TableCell className="px-2 sm:px-4 py-2 sm:py-3 text-sm hidden sm:table-cell">
                      {student.profileRequestDate 
                        ? formatDateForDisplay(student.profileRequestDate)
                        : "N/A"}
                    </TableCell>
                    <TableCell className="text-right px-2 sm:px-4 py-2 sm:py-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => onView(student)}
                        title="View Request"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PendingRequestsDialog;
