"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ComboBox } from "@/components/ui/combobox";
import { format } from "date-fns";
import PrintHeader from "@/components/PrintHeader";

export default function ClearanceCertificate({ apiKey, userId }) {
    const [batches, setBatches] = useState([]);
    const [classes, setClasses] = useState([]);
    const [students, setStudents] = useState([]);
    
    const [selectedBatch, setSelectedBatch] = useState("");
    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [studentLoading, setStudentLoading] = useState(false);

    const sortedBatches = [...batches].sort((a, b) => {
        const yearA = a.academicYear || "";
        const yearB = b.academicYear || "";
        return yearB.localeCompare(yearA);
    });

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const [batchesRes, classesRes] = await Promise.all([
                    axios.get("/api/batches", { headers: { "api-key": apiKey } }),
                    axios.get("/api/classes", { headers: { "api-key": apiKey } })
                ]);
                setBatches(batchesRes.data.batches || []);
                setClasses(classesRes.data.classes || []);
            } catch (error) {
                console.error(error);
            }
        };
        fetchMetadata();
    }, [apiKey]);

    useEffect(() => {
        if (!selectedBatch) {
            setStudents([]);
            return;
        }
        const fetchStudents = async () => {
            setStudentLoading(true);
            try {
                const res = await axios.get("/api/users", {
                    headers: { "api-key": apiKey },
                    params: { roles: "Student", batchId: selectedBatch, limit: 1000 }
                });
                const fetchedStudents = res.data.users || [];
                const sortedStudents = [...fetchedStudents].sort((a, b) => {
                    const idA = a.studentSpecificField?.admissionNumber || a.registerNumber || a._id || "";
                    const idB = b.studentSpecificField?.admissionNumber || b.registerNumber || b._id || "";
                    
                    const numA = parseInt(idA.replace(/\D/g, ''), 10);
                    const numB = parseInt(idB.replace(/\D/g, ''), 10);
                    
                    if (!isNaN(numA) && !isNaN(numB)) {
                        return numA - numB;
                    }
                    return idA.toString().localeCompare(idB.toString());
                });
                setStudents(sortedStudents);
            } catch (error) {
                console.error(error);
            } finally {
                setStudentLoading(false);
            }
        };
        fetchStudents();
    }, [selectedBatch, apiKey]);

    const selectedStudent = students.find(s => s._id === selectedStudentId);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="flex flex-col gap-6 h-full print:block print:h-auto">
            <div className="flex flex-col sm:flex-row gap-4 print:hidden items-start sm:items-center shrink-0">
                <div className="w-full sm:w-64">
                    <Select value={selectedBatch} onValueChange={(val) => { setSelectedBatch(val); setSelectedStudentId(""); }}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Batch" />
                        </SelectTrigger>
                        <SelectContent>
                            {sortedBatches.map(b => (
                                <SelectItem key={b._id} value={b._id}>{`${b.name} (${b.academicYear || "N/A"})`}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="w-full sm:w-64">
                    <ComboBox 
                        items={students.map(s => ({
                            value: s._id,
                            label: `${s.name} (${s.studentSpecificField?.admissionNumber || s.registerNumber || s._id})`
                        }))}
                        value={selectedStudentId}
                        onSelect={setSelectedStudentId}
                        placeholder={studentLoading ? "Loading..." : "Select Student"}
                    />
                </div>
                {selectedStudent && (
                    <Button onClick={handlePrint} className="w-full sm:w-auto sm:ml-auto">
                        <Printer className="w-4 h-4 mr-2" />
                        Print Certificate
                    </Button>
                )}
            </div>

            {selectedStudent && (
                <div className="w-full flex-1 overflow-auto bg-gray-50/50 rounded-lg print:bg-white flex justify-start xl:justify-center print:overflow-visible print:block print:h-auto">
                    <div className="w-[210mm] h-[297mm] min-w-[210mm] min-h-[297mm] print:w-full print:h-full print:min-w-0 print:min-h-0 bg-white text-black px-12 py-12 shadow-sm border border-gray-200 print:shadow-none print:border-none print:p-0 my-4 print:my-0 print:mx-0 box-border print:overflow-hidden shrink-0 flex flex-col">
                        <CertificateContent student={selectedStudent} batch={batches.find(b => b._id === selectedStudent?.studentSpecificField?.batchId || b._id === selectedStudent?.batchId)} apiKey={apiKey} />
                    </div>
                </div>
            )}
        </div>
    );
}

function CertificateContent({ student, batch, apiKey }) {
    const studentData = { ...student, ...(student?.studentSpecificField || {}) };
    
    const fatherName = studentData.guardianName || studentData.fatherName || "________________";
    const address = `${studentData.place || studentData.village || "________________"}, ${studentData.postOffice || "________________"} P.O, ${studentData.district || "________________"}`;
    const admissionNo = studentData.admissionNumber || studentData.registerNumber || student._id || "________________";
    
    const academicYear = batch?.academicYear || "2026-27";
    
    return (
        <div className="flex flex-col font-serif h-full w-full">
            <div className="w-full mb-6">
                <PrintHeader apiKey={apiKey} displayOnScreen={true} />
            </div>

            <div className="w-full flex justify-between mb-8 font-sans font-medium text-base">
                <span contentEditable suppressContentEditableWarning>DCC Number 09/2026</span>
                <span contentEditable suppressContentEditableWarning>Date:{format(new Date(), "dd/MM/yyyy")}</span>
            </div>

            <h2 className="text-xl font-bold mb-8 uppercase tracking-wider underline underline-offset-4 decoration-2 text-center" contentEditable suppressContentEditableWarning>DOCUMENTS CLEARANCE CERTIFICATE</h2>

            <div className="text-left w-full text-base leading-8 space-y-4 mb-6">
                <p className="text-justify font-medium" contentEditable suppressContentEditableWarning>
                    This is to certify that <span className="font-bold">{student.name}</span> S/o <span className="font-bold">{fatherName}</span> (<span className="font-bold">{address}</span>) was a student of this institution, -Admission No: <span className="font-bold">{admissionNo}</span> during the academic year <span className="font-bold">{academicYear}</span>. He has completed/ discontinued his course of integrated PG, for which he had admitted here. I assure that the office has given back all documents submitted here.
                </p>
                <div className="flex justify-between items-end pt-4">
                    <p className="font-bold" contentEditable suppressContentEditableWarning>Statement on Leaving:</p>
                    <p className="font-medium text-right mt-12" contentEditable suppressContentEditableWarning>Head of the department</p>
                </div>
            </div>

            <div className="mb-6">
                <h3 className="font-bold text-center underline uppercase mb-4" contentEditable suppressContentEditableWarning>OFFICIAL CONFIRMATION</h3>
                <table className="w-full border-collapse border border-black text-sm text-center font-sans mb-4">
                    <thead>
                        <tr>
                            <th className="border border-black p-2 font-medium" contentEditable suppressContentEditableWarning>Library</th>
                            <th className="border border-black p-2 font-medium" contentEditable suppressContentEditableWarning>IT Lab</th>
                            <th className="border border-black p-2 font-medium" contentEditable suppressContentEditableWarning>Stationary</th>
                            <th className="border border-black p-2 font-medium" contentEditable suppressContentEditableWarning>Debts</th>
                            <th className="border border-black p-2 font-medium" contentEditable suppressContentEditableWarning>Coupen</th>
                            <th className="border border-black p-2 font-medium" contentEditable suppressContentEditableWarning>Fund</th>
                            <th className="border border-black p-2 font-medium" contentEditable suppressContentEditableWarning>Staff</th>
                            <th className="border border-black p-2 font-medium" contentEditable suppressContentEditableWarning>Admission Fee</th>
                            <th className="border border-black p-2 font-medium" contentEditable suppressContentEditableWarning>Book</th>
                            <th className="border border-black p-2 font-medium" contentEditable suppressContentEditableWarning>Other</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-black p-4" contentEditable suppressContentEditableWarning></td>
                            <td className="border border-black p-4" contentEditable suppressContentEditableWarning></td>
                            <td className="border border-black p-4" contentEditable suppressContentEditableWarning></td>
                            <td className="border border-black p-4" contentEditable suppressContentEditableWarning></td>
                            <td className="border border-black p-4" contentEditable suppressContentEditableWarning></td>
                            <td className="border border-black p-4" contentEditable suppressContentEditableWarning></td>
                            <td className="border border-black p-4" contentEditable suppressContentEditableWarning></td>
                            <td className="border border-black p-4" contentEditable suppressContentEditableWarning></td>
                            <td className="border border-black p-4" contentEditable suppressContentEditableWarning></td>
                            <td className="border border-black p-4" contentEditable suppressContentEditableWarning></td>
                        </tr>
                    </tbody>
                </table>
                <p className="font-medium mb-12" contentEditable suppressContentEditableWarning>As mentioned Above All liabilities are cleared</p>
                <div className="flex justify-between font-medium">
                    <span contentEditable suppressContentEditableWarning>Students Secretary</span>
                    <span contentEditable suppressContentEditableWarning>Office Secretary</span>
                </div>
            </div>

            <div className="mt-4 pt-6 text-base">
                <h3 className="font-bold text-center underline uppercase mb-4" contentEditable suppressContentEditableWarning>STUDENTS CONFIRMATION</h3>
                <p className="font-medium text-justify mb-8" contentEditable suppressContentEditableWarning>
                    It is to confirm that I have received all my documents from this institution, Sa-adiya College of Islamic Dawa.
                </p>
                <div className="flex flex-col space-y-6 font-medium">
                    <div className="flex items-center">
                        <span className="w-72" contentEditable suppressContentEditableWarning>Name & Signature of the student</span>
                        <span>:</span>
                    </div>
                    <div className="flex items-center">
                        <span className="w-72" contentEditable suppressContentEditableWarning>Name & Signature of the Guardian</span>
                        <span>:</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
