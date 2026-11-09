"use client";
import { sortClasses } from "@/lib/utils";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Loader, Printer } from "lucide-react";
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

export default function StudentsCertificate({ apiKey, userId }) {
    const [batches, setBatches] = useState([]);
    const [classes, setClasses] = useState([]);
    const [students, setStudents] = useState([]);
    
    const [selectedClass, setSelectedClass] = useState("");
    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [loading, setLoading] = useState(false);
    const [studentLoading, setStudentLoading] = useState(false);

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const [batchesRes, classesRes] = await Promise.all([
                    axios.get("/api/batches", { headers: { "api-key": apiKey } }),
                    axios.get("/api/classes?status=Active", { headers: { "api-key": apiKey } })
                ]);
                setBatches(batchesRes.data.batches || []);
                const fetchedClasses = (classesRes.data.classes || [])
                    .filter((c) => c?.status !== "Closed")
                    .sort((a, b) => {
                    const classCompare = sortClasses(a, b);
                    if (classCompare !== 0) return classCompare;
                    return String(a.name || "").localeCompare(String(b.name || ""));
                });
                setClasses(fetchedClasses);
            } catch (error) {
                console.error(error);
            }
        };
        fetchMetadata();
    }, [apiKey]);

    useEffect(() => {
        if (!selectedClass) {
            setStudents([]);
            return;
        }
        const fetchStudents = async () => {
            setStudentLoading(true);
            try {
                const res = await axios.get("/api/users", {
                    headers: { "api-key": apiKey },
                    params: { roles: "Student", classId: selectedClass, limit: 1000 }
                });
                const activeStudents = (res.data.users || []).filter(s => 
                    s.status === "Active" || s.studentSpecificField?.status === "Active"
                );
                setStudents(activeStudents);
            } catch (error) {
                console.error(error);
            } finally {
                setStudentLoading(false);
            }
        };
        fetchStudents();
    }, [selectedClass, apiKey]);

    const selectedStudent = students.find(s => s._id === selectedStudentId);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="flex flex-col gap-6 h-full print:block print:h-auto">
            <div className="flex flex-col sm:flex-row gap-4 print:hidden items-start sm:items-center shrink-0">
                <div className="w-full sm:w-64">
                    <Select value={selectedClass} onValueChange={(val) => { setSelectedClass(val); setSelectedStudentId(""); }}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Class" />
                        </SelectTrigger>
                        <SelectContent>
                            {classes.map(c => (
                                <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
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
                    <Button onClick={handlePrint} className="w-full sm:w-auto sm:ml-auto bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 border-0 btn-print">
                        <Printer className="w-4 h-4 mr-2" />
                        Print Certificate
                    </Button>
                )}
            </div>

            {selectedStudent && (
                <div className="w-full flex-1 overflow-auto bg-gray-50/50 rounded-lg print:bg-white flex justify-start xl:justify-center print:overflow-visible print:block print:h-auto">
                    <div className="w-[210mm] h-[297mm] min-w-[210mm] min-h-[297mm] print:w-full print:h-full print:min-w-0 print:min-h-0 bg-white text-black px-12 py-16 shadow-sm border border-gray-200 print:shadow-none print:border-none print:p-0 my-4 print:my-0 print:mx-0 box-border print:overflow-hidden shrink-0 flex flex-col">
                        <CertificateContent student={selectedStudent} batch={batches.find(b => b._id === selectedStudent?.studentSpecificField?.batchId || b._id === selectedStudent?.batchId)} classes={classes} apiKey={apiKey} />
                    </div>
                </div>
            )}
        </div>
    );
}

function CertificateContent({ student, batch, classes, apiKey }) {
    const studentData = { ...student, ...(student?.studentSpecificField || {}) };
    
    const fatherName = studentData.guardianName || studentData.fatherName || "________________";
    const village = studentData.place || studentData.village || "________________";
    const postOffice = studentData.postOffice || "________________";
    const taluk = studentData.taluk || "________________"; 
    const district = studentData.district || "________________";
    const admissionNo = studentData.admissionNumber || studentData.registerNumber || student._id || "________________";
    let dateOfBirth = "________________";
    if (studentData.dateOfBirth) {
        try {
            dateOfBirth = format(new Date(studentData.dateOfBirth), "dd/MM/yyyy");
        } catch(e) {}
    }
    
    const religion = "ISLAM";
    const caste = "MUSLIM";
    const motherTongue = "MALAYALAM";
    
    const academicYear = batch?.academicYear || "2026-27";
    const stdClass = classes?.find(c => c._id === studentData.classId);
    const standard = stdClass?.name || batch?.name || "12th std";

    return (
        <div className="flex flex-col items-center font-serif text-center h-full w-full">
            <div className="w-full mb-10">
                <PrintHeader apiKey={apiKey} displayOnScreen={true} />
            </div>

            <div className="w-full flex justify-between mb-16 font-sans font-medium text-lg">
                <span contentEditable suppressContentEditableWarning>CNo. XX</span>
                <span contentEditable suppressContentEditableWarning>DATE: {format(new Date(), "dd/MM/yyyy")}</span>
            </div>

            <h2 className="text-3xl font-bold mb-16 uppercase tracking-wider underline underline-offset-8 decoration-2" contentEditable suppressContentEditableWarning>STUDENT CERTIFICATE</h2>

            <div className="text-left w-full text-lg leading-10 space-y-6 px-4">
                <p className="indent-12 text-justify font-medium" contentEditable suppressContentEditableWarning>
                    This is to certify that Mr. <span className="font-bold">{student.name}</span> s/o <span className="font-bold">{fatherName}</span> belongs to <span className="font-bold">{village}</span> Village, <span className="font-bold">{postOffice}</span> Post, <span className="font-bold">{taluk}</span> Taluk, <span className="font-bold">{district}</span> District, is a student of this institution during the year <span className="font-bold">{academicYear}</span> studying in <span className="font-bold">{standard}</span>.
                </p>
                <p className="font-medium" contentEditable suppressContentEditableWarning>
                    His Date of Birth is <span className="font-bold">{dateOfBirth}</span> and Admission Number is <span className="font-bold">{admissionNo}</span>.
                </p>
                <p className="indent-12 font-medium" contentEditable suppressContentEditableWarning>
                    He is belongs to <span className="font-bold">{religion}</span> Religion , <span className="font-bold">{caste}</span> Caste and Mother tongue is <span className="font-bold">{motherTongue}</span>.
                </p>
                
                <p className="mt-12 font-medium" contentEditable suppressContentEditableWarning>
                    The above details are correct to the best of our knowledge
                </p>
            </div>

            {/* Footer */}
            <div className="mt-auto pt-10 w-full flex justify-between items-end px-10 pb-10">
                <div className="w-32 h-32 flex items-center justify-center">
                    <img src="/sdc_seal.png" alt="College Seal" className="max-w-full max-h-full object-contain" />
                </div>

                <div className="text-center font-sans">
                    <div className="mb-2 h-16 w-48 border-b-2 border-transparent relative">
                        {/* Signature placeholder */}
                    </div>
                    <p className="font-medium text-lg mb-1" contentEditable suppressContentEditableWarning>Principal</p>
                    <p className="font-medium text-lg mb-1" contentEditable suppressContentEditableWarning>Shareef Sa-adi</p>
                    <p className="font-medium text-lg" contentEditable suppressContentEditableWarning>Maviladam</p>
                </div>
            </div>
        </div>
    );
}
