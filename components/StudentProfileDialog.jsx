"use client";

import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Printer, MapPin, UserSquare2, Award, FileText } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";

import PrintHeader from "@/components/PrintHeader";

export default function StudentProfileDialog({ student, open, onClose, classes, apiKey }) {
    const printRef = useRef(null);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        content: () => printRef.current,
        documentTitle: `${student?.name}_Profile`,
    });

    if (!student) return null;

    const DetailRow = ({ label, value }) => {
        if (!value || value === "N/A") return null;
        return (
            <div className="flex items-start py-0.5 text-sm break-inside-avoid w-full">
                <div className="flex-1 grid grid-cols-[160px_10px_1fr] items-start">
                    <span className="text-muted-foreground font-medium uppercase text-xs tracking-wide pt-0.5 ml-8">{label}</span>
                    <span className="text-muted-foreground font-medium text-center pt-0.5">:</span>
                    <span className="font-semibold text-gray-800 text-sm whitespace-pre-wrap">{value}</span>
                </div>
            </div>
        );
    };

    const SectionHeader = ({ title, icon: Icon, className }) => (
        <div className={`flex items-center gap-2 mb-3 break-after-avoid bg-muted/30 p-2 rounded-md border-l-4 border-primary ${className || 'mt-6'}`}>
            {Icon && <Icon className="w-5 h-5 text-primary" />}
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">{title}</h3>
        </div>
    );

    const getStatusBadge = (status) => {
        let bg = "bg-green-100 text-green-800 border-green-200";
        if (status === "Dropped Out") bg = "bg-red-100 text-red-800 border-red-200";
        if (status === "Graduated") bg = "bg-blue-100 text-blue-800 border-blue-200";
        return (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${bg}`}>
                {status}
            </span>
        );
    };

    const currentStatus = (student.droppedOutDate || student.droppedOutClass) ? "Dropped Out" :
        student.graduatedYear ? "Graduated" :
            (student.status || "Active");

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md bg-white p-4 sm:p-6 overflow-hidden sm:max-w-2xl rounded-xl shadow-2xl">
                <div className="overflow-y-auto max-h-[85vh] print:max-h-none print:overflow-visible print:m-8" ref={printRef}>
                    <PrintHeader
                        title="STUDENT PROFILE"
                        apiKey={apiKey}
                        displayOnScreen={false}
                    />

                    {/* Header Section */}
                    <div className="bg-gradient-to-br from-muted/50 to-muted/10 p-5 sm:px-8 border-b break-inside-avoid relative rounded-t-lg">
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            <Avatar className="w-32 h-32 border-4 border-white shadow-lg rounded-2xl flex-shrink-0">
                                <AvatarImage
                                    src={student.profilePic?.url}
                                    alt={student.name}
                                    className="object-cover"
                                />
                                <AvatarFallback className="text-4xl bg-primary/10 text-primary font-bold rounded-2xl">
                                    {student.name?.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col space-y-1 text-center sm:text-left flex-1 justify-center">
                                <div className="flex flex-col sm:items-start gap-1 justify-center sm:justify-start">
                                    <DialogTitle className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
                                        {student.name}
                                    </DialogTitle>
                                    <div className="flex items-center gap-2 text-muted-foreground font-medium w-full text-left">
                                        <span className="w-28 ml-8 font-semibold uppercase text-xs">Adm No:</span>
                                        <span className="text-gray-800">{student._id || student.username}</span>
                                    </div>
                                    {(student.className || student.classId?.name) && (
                                        <div className="flex items-center gap-2 text-muted-foreground font-medium w-full text-left">
                                            <span className="w-28 ml-8 font-semibold uppercase text-xs">Class:</span>
                                            <span className="text-gray-800">{student.className || student.classId?.name}</span>
                                        </div>
                                    )}
                                    {(student.batchName || student.batchId?.name) && (
                                        <div className="flex items-center gap-2 text-muted-foreground font-medium w-full text-left">
                                            <span className="w-28 ml-8 font-semibold uppercase text-xs">Batch:</span>
                                            <span className="text-gray-800">{student.batchName || student.batchId?.name}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-muted-foreground font-medium w-full text-left mt-1">
                                        <span className="w-28 ml-8 font-semibold uppercase text-xs">Status:</span>
                                        <span>{getStatusBadge(currentStatus)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 pb-6 px-4 sm:px-6 space-y-4">
                        {/* Personal Details */}
                        <SectionHeader title="Personal Details" icon={UserSquare2} className="mt-2" />
                        <div className="flex flex-col gap-y-1 pl-2">
                            <DetailRow
                                label="Date Of Birth"
                                value={student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : null}
                            />
                            <DetailRow label="Email" value={student.email} />
                            <DetailRow label="Contact Number" value={student.contactNumber} />
                            <DetailRow label="Alt Phone" value={student.alternativeNumber} />
                            <DetailRow label="Aadhar No" value={student.studentSpecificField?.aadharNo || student.aadharNo} />
                            <DetailRow label="Blood Group" value={student.bloodGroup} />
                        </div>

                        {/* Address Details */}
                        <SectionHeader title="Address Details" icon={MapPin} />
                        <div className="pl-2 space-y-1">
                            {student.address && (
                                <DetailRow
                                    label="Full Address"
                                    value={
                                        <div className="leading-relaxed">
                                            {student.address.houseName && <span>{student.address.houseName}, </span>}
                                            {student.address.place && <span>{student.address.place}</span>}
                                            {(student.address.postOffice || student.address.district) && <br />}
                                            {student.address.postOffice && <span>PO {student.address.postOffice}, </span>}
                                            {student.address.district && <span>{student.address.district}</span>}
                                            {(student.address.state || student.address.pin) && <br />}
                                            {student.address.state && <span>{student.address.state}</span>}
                                            {student.address.pin && <span> - {student.address.pin}</span>}
                                        </div>
                                    }
                                />
                            )}
                            <div className="flex flex-col gap-y-1 mt-1">
                                <DetailRow
                                    label="Guardian Name"
                                    value={student.studentSpecificField?.guardianName || student.guardianName}
                                />
                                <DetailRow
                                    label="Relationship"
                                    value={student.studentSpecificField?.relationship || student.relationship}
                                />
                                <DetailRow
                                    label="G. Contact Number"
                                    value={student.studentSpecificField?.guardianContactNumber || student.guardianContactNumber}
                                />
                                <DetailRow
                                    label="Alt Phone"
                                    value={student.studentSpecificField?.guardianAlternativeNumber || student.guardianAlternativeNumber}
                                />
                            </div>
                        </div>

                        {/* Academic Details */}
                        <SectionHeader title="Academic Details" icon={Award} />
                        <div className="flex flex-col gap-y-1 pl-2">
                            <DetailRow
                                label="Admission Class"
                                value={student.admissionClassName || student.admissionClassId?.name}
                            />
                            <DetailRow
                                label="Admission Date"
                                value={student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : "N/A"}
                            />
                            <DetailRow label="Status" value={currentStatus} />

                            {/* Status Specific Details */}
                            {currentStatus === "Dropped Out" && (
                                <>
                                    <DetailRow
                                        label="Dropout Class"
                                        value={classes?.find(c => c._id === student.droppedOutClass)?.name || student.droppedOutClass || "N/A"}
                                    />
                                    <DetailRow
                                        label="Dropout Date"
                                        value={student.droppedOutDate ? new Date(student.droppedOutDate).toLocaleDateString() : "N/A"}
                                    />
                                    {student.droppedOutReason && student.droppedOutReason.toLowerCase() !== 'unknown' && (
                                        <DetailRow
                                            label="Dropout Reason"
                                            value={student.droppedOutReason}
                                        />
                                    )}
                                </>
                            )}

                            {currentStatus === "Graduated" && (
                                <>
                                    <DetailRow label="Status Details" value={`Graduated in ${student.graduatedYear}`} />
                                    <DetailRow label="Islamic Qual." value={student.islamicQualification} />
                                    <DetailRow label="Academic Qual." value={student.academicQualification} />
                                </>
                            )}
                        </div>
                        <div className="h-6 print:hidden"></div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-muted/30 flex justify-end gap-3 border-t print:hidden">
                    <Button variant="outline" onClick={() => onClose(false)} className="px-6">
                        Close
                    </Button>
                    <Button onClick={handlePrint} className="gap-2 px-6">
                        <Printer className="w-4 h-4" /> Print
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
