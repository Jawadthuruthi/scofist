"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
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
            <div className="flex justify-between py-1 text-sm break-inside-avoid font-montserrat">
                <span className="text-muted-foreground font-medium">{label}:</span>
                <span className="font-semibold text-right">{value}</span>
            </div>
        );
    };

    const SectionHeader = ({ title }) => (
        <h3 className="text-lg font-bold text-gray-800 mt-4 mb-2 break-after-avoid font-montserrat">{title}</h3>
    );

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md bg-white p-0 overflow-hidden sm:max-w-lg">
                <div className="p-6 overflow-y-auto max-h-[90vh] print:max-h-none print:overflow-visible font-montserrat" ref={printRef}>
                    <PrintHeader
                        title="STUDENT PROFILE"
                        apiKey={apiKey}
                        displayOnScreen={false}
                    />
                    {/* Header Section */}
                    <div className="flex justify-between items-start mb-6 break-inside-avoid">
                        <div className="flex flex-col space-y-1">
                            <DialogTitle className="text-2xl font-bold text-gray-900 uppercase tracking-wide text-left font-montserrat">
                                {student.name}
                            </DialogTitle>
                            <div className="text-lg font-semibold text-gray-700 mt-1 font-montserrat">
                                Student ID : {student._id || student.username}
                            </div>
                        </div>

                        <Avatar className="w-20 h-20 border-2 border-gray-100 shadow-sm ml-4 rounded-xl">
                            <AvatarImage
                                src={student.profilePic?.url}
                                alt={student.name}
                                className="object-cover"
                            />
                            <AvatarFallback className="text-2xl bg-gray-200 text-gray-500 rounded-xl font-montserrat">
                                {student.name?.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                    </div>

                    <div className="space-y-1">
                        {/* Personal Details */}
                        <SectionHeader title="Personal Details" />
                        <DetailRow label="Email" value={student.email} />
                        <DetailRow label="Phone" value={student.contactNumber} />
                        <DetailRow label="Alt Phone" value={student.alternativeNumber} />
                        <DetailRow label="Aadhar No" value={student.studentSpecificField?.aadharNo || student.aadharNo} />
                        <DetailRow
                            label="DOB"
                            value={student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : null}
                        />

                        <Separator className="my-4" />

                        {/* Address Details */}
                        <SectionHeader title="Address Details" />
                        <DetailRow
                            label="Guardian Name"
                            value={student.studentSpecificField?.guardianName || student.guardianName}
                        />
                        <DetailRow
                            label="Relationship"
                            value={student.studentSpecificField?.relationship || student.relationship}
                        />
                        <DetailRow
                            label="Guardian Phone"
                            value={student.studentSpecificField?.guardianContactNumber || student.guardianContactNumber}
                        />
                        <DetailRow
                            label="Guardian Alt."
                            value={student.studentSpecificField?.guardianAlternativeNumber || student.guardianAlternativeNumber}
                        />
                        {student.address && (
                            <div className="flex justify-between py-1 text-sm">
                                <span className="text-muted-foreground font-medium w-1/3">Address:</span>
                                <div className="text-right w-2/3 font-semibold">
                                    {student.address.houseName && <div>{student.address.houseName}</div>}
                                    {student.address.place && <div>{student.address.place}</div>}
                                    {student.address.postOffice && <div>{student.address.postOffice}</div>}
                                    {student.address.district && <div>{student.address.district}</div>}
                                    {student.address.state && <div>{student.address.state} - {student.address.pin}</div>}
                                </div>
                            </div>
                        )}

                        <Separator className="my-4" />

                        {/* Academic Details */}
                        <SectionHeader title="Academic Details" />

                        {(() => {
                            const currentStatus = (student.droppedOutDate || student.droppedOutClass) ? "Dropped Out" :
                                student.graduatedYear ? "Graduated" :
                                    (student.status || "Active");

                            return (
                                <>
                                    <DetailRow label="Status" value={currentStatus} />

                                    {/* Status Specific Details */}
                                    {currentStatus === "Dropped Out" && (
                                        <>
                                            <DetailRow
                                                label="Dropout Class"
                                                value={
                                                    classes?.find(c => c._id === student.droppedOutClass)?.name ||
                                                    student.droppedOutClass ||
                                                    "N/A"
                                                }
                                            />
                                            <DetailRow
                                                label="Dropout Date"
                                                value={student.droppedOutDate ? new Date(student.droppedOutDate).toLocaleDateString() : "N/A"}
                                            />
                                            {student.droppedOutReason && student.droppedOutReason.toLowerCase() !== 'unknown' && (
                                                <DetailRow label="Dropout Reason" value={student.droppedOutReason} />
                                            )}
                                        </>
                                    )}

                                    {currentStatus === "Graduated" && (
                                        <>
                                            <DetailRow label="Graduated Year" value={student.graduatedYear} />
                                            <DetailRow label="Islamic Qual." value={student.islamicQualification} />
                                            <DetailRow label="Academic Qual." value={student.academicQualification} />
                                        </>
                                    )}

                                    {/* Common Academic Info */}
                                    {currentStatus === "Active" && (
                                        <>
                                            <DetailRow label="Class" value={student.className || student.classId?.name} />
                                            <DetailRow label="Batch" value={student.batchName || student.batchId?.name} />
                                        </>
                                    )}

                                    <DetailRow
                                        label="Admission Class"
                                        value={student.admissionClassName || student.admissionClassId?.name}
                                    />
                                    <DetailRow
                                        label="Admission Date"
                                        value={student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : "N/A"}
                                    />
                                </>
                            );
                        })()}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-gray-50 flex justify-end gap-2 border-t">
                    <Button variant="outline" onClick={() => onClose(false)}>
                        Close
                    </Button>
                    <Button onClick={handlePrint} className="gap-2">
                        <Printer className="w-4 h-4" /> Print
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
