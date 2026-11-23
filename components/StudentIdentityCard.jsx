"use client";
import { useRef, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Printer, User, Shield } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";
import Header from "@/components/Header";
import { formatDateForDisplay, formatDateMonthYear } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select";

const StudentIdentityCard = ({ student, institution = {}, idCardBackgroundImageUrl = "", idCardSealImageUrl = "" }) => {
    const [selectedSide, setSelectedSide] = useState("Both Sides");
    const [baseUrl, setBaseUrl] = useState(process.env.NEXT_PUBLIC_BASE_URL || "https://scofist.com");
    const pageRef = useRef(null);
    const router = useRouter();

    const handlePrint = useReactToPrint({
        contentRef: pageRef,
        documentTitle: `${student.name} ID Card`,
        suppressErrors: true,
    });

    useEffect(() => {
        if (typeof window !== "undefined" && window.location.origin) {
            setBaseUrl(window.location.origin);
        }
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            router.refresh();
        }, 60000);
        return () => clearInterval(interval);
    }, [router]);

    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}-${currentYear + 1}`;
    const showFront = selectedSide === "Both Sides" || selectedSide === "Front Side";
    const showBack = selectedSide === "Both Sides" || selectedSide === "Back Side";
    const studentAdmissionNo = student.admissionNumber || student.studentSpecificField?.admissionNumber || student._id?.substring(0, 8).toUpperCase();
    const qrUrl = baseUrl ? `${baseUrl}/student-fund/${student._id}` : `/student-fund/${student._id}`;
    const sealUrl = idCardSealImageUrl || "/sdc_seal.png";

    return (
        <div>
            <Header
                title="MY IDENTITY CARD"
                subTitle="View and print your official student identity card"
                rightAction={
                    <div className="hidden md:flex items-center gap-3">
                        <div className="w-36">
                            <Select value={selectedSide} onValueChange={setSelectedSide}>
                                <SelectTrigger id="desktop-side-select" className="h-10">
                                    <SelectValue placeholder="Select Side" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Both Sides">Both Sides</SelectItem>
                                    <SelectItem value="Front Side">Front Side</SelectItem>
                                    <SelectItem value="Back Side">Back Side</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            onClick={handlePrint}
                            className="flex items-center justify-center gap-2 h-10 px-4 bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 border-0 btn-print shrink-0"
                            aria-label="Print"
                        >
                            <Printer size={16} />
                            <span>Print</span>
                        </Button>
                    </div>
                }
            />

            {/* Mobile print controls (below heading) */}
            <div className="flex md:hidden items-center justify-center w-full mb-6">
                <div className="flex items-center gap-2 w-full max-w-[340px]">
                    <div className="flex-1 w-1/2">
                        <Select value={selectedSide} onValueChange={setSelectedSide}>
                            <SelectTrigger id="mobile-side-select" className="h-10 w-full">
                                <SelectValue placeholder="Select Side" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Both Sides">Both Sides</SelectItem>
                                <SelectItem value="Front Side">Front Side</SelectItem>
                                <SelectItem value="Back Side">Back Side</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex-1 w-1/2">
                        <Button
                            onClick={handlePrint}
                            className="flex items-center justify-center gap-2 w-full h-10 bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 border-0 btn-print"
                            aria-label="Print"
                        >
                            <Printer size={16} />
                            <span>Print</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Screen Preview */}
            <div className="flex flex-row flex-wrap items-stretch justify-center gap-6 print:hidden max-w-4xl mx-auto mb-8">
                {/* Front Side */}
                {showFront && (
                    <Card className="shadow-lg overflow-hidden border border-slate-200 bg-white text-slate-900 dark:bg-white dark:text-slate-900 dark:border-slate-200 max-w-[340px] min-w-[300px] w-full flex-1">
                        <CardContent className="p-0 h-full flex flex-col bg-white dark:bg-white text-slate-900 dark:text-slate-900">
                            <div className="relative bg-white dark:bg-white text-slate-900 dark:text-slate-900 w-full flex-1 p-4 overflow-hidden">
                                {idCardBackgroundImageUrl && (
                                    <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
                                        <svg width="100%" height="100%">
                                            <image href={idCardBackgroundImageUrl} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
                                        </svg>
                                    </div>
                                )}
                                <div className="relative z-10 w-full h-full flex flex-col">
                                    <div className="text-center mb-3">
                                        <h2 className="font-bold text-sm uppercase tracking-wider text-slate-900 dark:text-slate-900 drop-shadow-sm">
                                            {institution.name || "Educational Institution"}
                                        </h2>
                                        <p className="text-xs text-slate-600 dark:text-slate-600 font-medium">
                                            {institution.tagline || "Excellence in Education"}
                                        </p>
                                    </div>

                                    <div className="flex justify-center mb-3">
                                        <div className="h-14 w-14 bg-white rounded-full relative overflow-hidden shadow-md p-1 border border-slate-100 flex items-center justify-center">
                                            {institution?.logo?.url ? (
                                                <div className="relative h-full w-full">
                                                    <Image
                                                        src={institution.logo.url}
                                                        alt="Institution Logo"
                                                        fill
                                                        className="object-contain p-0.5"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center">
                                                    <Shield className="text-indigo-700" size={26} />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center">
                                        <div className="mb-3">
                                            <div className="w-24 h-28 bg-white border-2 border-white rounded-md relative overflow-hidden shadow-md">
                                                {student.profilePic?.url ? (
                                                    <div className="relative h-full w-full">
                                                        <Image
                                                            src={student?.profilePic?.url || ""}
                                                            alt={`${student.name}'s photo`}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center bg-slate-50">
                                                        <User size={32} className="text-slate-400" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-center space-y-1">
                                            <h2 className="text-sm font-bold mt-1 bg-slate-100/90 text-slate-900 dark:text-slate-900 border border-slate-200/80 inline-block px-2.5 py-0.5 rounded shadow-sm">
                                                {`Admn No: ${studentAdmissionNo}`}
                                            </h2>
                                            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-900 mt-0.5">{student.name}</h3>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 bg-white dark:bg-white flex flex-col items-center border-t border-slate-100">
                                <div className="text-xs text-center font-bold text-indigo-900 dark:text-indigo-900 mb-1 bg-indigo-50/90 border border-indigo-100/90 rounded-md py-1 px-2 inline-block shadow-sm w-full">
                                    OFFICIAL STUDENT ID
                                </div>
                                <div className="flex items-center justify-between gap-1.5 mt-1 w-full">
                                    <div className="flex-1 flex justify-center items-center p-1 bg-white rounded border border-slate-200 shadow-sm overflow-hidden h-12 min-w-0">
                                        <Barcode
                                            value={studentAdmissionNo}
                                            width={1.2}
                                            height={28}
                                            format="CODE128"
                                            displayValue={false}
                                            background="#ffffff"
                                            lineColor="#000000"
                                            renderer="svg"
                                            margin={0}
                                        />
                                    </div>
                                    <a
                                        href={qrUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="h-12 w-12 shrink-0 p-1 bg-white rounded border border-slate-200 shadow-sm flex items-center justify-center hover:border-indigo-400 hover:shadow transition-all"
                                        title="Scan or click to view fund balance and history"
                                    >
                                        <QRCodeSVG
                                            value={qrUrl}
                                            size={40}
                                            level="M"
                                        />
                                    </a>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Back Side */}
                {showBack && (
                    <Card className="shadow-lg overflow-hidden border border-slate-200 bg-white text-slate-900 dark:bg-white dark:text-slate-900 dark:border-slate-200 max-w-[340px] min-w-[300px] w-full flex-1">
                        <CardContent className="p-4 flex flex-col h-full bg-white dark:bg-white text-slate-900 dark:text-slate-900">
                            <div className="border-b border-slate-200 pb-2 mb-3">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-900 text-center">
                                    {studentAdmissionNo} - Contact Information
                                </h3>
                            </div>

                            <div className="relative my-auto">
                                {sealUrl && (
                                    <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-25 select-none overflow-hidden">
                                        <div className="relative w-44 h-44 mix-blend-multiply">
                                            <Image
                                                src={sealUrl}
                                                alt="Seal"
                                                fill
                                                className="object-contain"
                                            />
                                        </div>
                                    </div>
                                )}
                                <div className="relative text-xs z-10 grid grid-cols-[max-content_auto_1fr] gap-x-1.5 gap-y-1.5 w-full text-slate-900 dark:text-slate-900">
                                    <span className="font-bold text-slate-900 dark:text-slate-900">Class</span>
                                    <span className="text-slate-500 font-bold">:</span>
                                    <span className="text-slate-700 dark:text-slate-700 font-medium min-w-0">{student.className || "N/A"}</span>

                                    <span className="font-bold text-slate-900 dark:text-slate-900">Batch</span>
                                    <span className="text-slate-500 font-bold">:</span>
                                    <span className="text-slate-700 dark:text-slate-700 font-medium min-w-0">{student.batchName || "N/A"}</span>

                                    <span className="font-bold text-slate-900 dark:text-slate-900">Dob</span>
                                    <span className="text-slate-500 font-bold">:</span>
                                    <span className="text-slate-700 dark:text-slate-700 font-medium min-w-0">
                                        {formatDateMonthYear(student.dateOfBirth) || "No DOB provided"}
                                    </span>

                                    <span className="font-bold text-slate-900 dark:text-slate-900">Phone No</span>
                                    <span className="text-slate-500 font-bold">:</span>
                                    <span className="text-slate-700 dark:text-slate-700 font-medium min-w-0">
                                        {student.contactNumber || "No phone provided"}
                                    </span>

                                    <span className="font-bold text-slate-900 dark:text-slate-900">Email</span>
                                    <span className="text-slate-500 font-bold">:</span>
                                    <span className="text-slate-700 dark:text-slate-700 font-medium min-w-0 break-all">
                                        {student.email || "No email provided"}
                                    </span>

                                    <span className="font-bold text-slate-900 dark:text-slate-900">S/o</span>
                                    <span className="text-slate-500 font-bold">:</span>
                                    <span className="text-slate-700 dark:text-slate-700 font-medium min-w-0">
                                        {student.guardianName || "No guardian provided"}
                                    </span>

                                    <span className="font-bold text-slate-900 dark:text-slate-900 whitespace-nowrap">
                                        Contact No
                                    </span>
                                    <span className="text-slate-500 font-bold">:</span>
                                    <span className="text-slate-700 dark:text-slate-700 font-medium min-w-0">
                                        {student.guardianContactNumber || "No contact provided"}
                                    </span>

                                    <span className="font-bold text-slate-900 dark:text-slate-900">Address</span>
                                    <span className="text-slate-500 font-bold">:</span>
                                    <span className="text-slate-700 dark:text-slate-700 text-[0.65rem] break-words leading-tight whitespace-normal min-w-0 font-medium">
                                        {Object.values(student.address || {})
                                            .filter(Boolean)
                                            .join(", ") || "No address provided"}
                                    </span>

                                    <span className="font-bold text-slate-900 dark:text-slate-900">Validity</span>
                                    <span className="text-slate-500 font-bold">:</span>
                                    <span className="text-slate-700 dark:text-slate-700 font-medium min-w-0">{academicYear}</span>
                                </div>
                            </div>

                            <div className="mt-auto bg-indigo-50/90 border border-indigo-100/80 p-2.5 rounded-md">
                                <div className="text-xs text-center text-slate-700 dark:text-slate-700">
                                    <p className="font-bold text-indigo-900 dark:text-indigo-900 text-xs">
                                        {institution.name || "Educational Institution"}
                                    </p>
                                    <p className="text-xxs text-slate-600 dark:text-slate-600 font-medium">
                                        {institution.tagline && <span>({institution.tagline})</span>}
                                    </p>
                                    <p className="text-xxs text-slate-600 dark:text-slate-600">
                                        Sa-adabad, Deli, P.O Kalanad, Kasaragod
                                    </p>
                                    <p className="text-xxs text-slate-600 dark:text-slate-600">
                                        {institution.contact?.primaryPhone &&
                                            `Phone: ${institution.contact.primaryPhone}`}
                                        {institution.contact?.secondaryPhone &&
                                            `, ${institution.contact.secondaryPhone}`}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Hidden Print Layout (A4 Landscape) */}
            <div ref={pageRef} className="hidden print:block space-y-4">
                <div
                    className="print-page w-full p-4 flex flex-wrap"
                    style={{ width: "297mm", height: "210mm" }}
                    aria-hidden="true"
                >
                    <StudentPrintableCard
                        person={student}
                        institution={institution}
                        academicYear={academicYear}
                        idCardBackgroundImageUrl={idCardBackgroundImageUrl}
                        idCardSealImageUrl={sealUrl}
                        showFront={showFront}
                        showBack={showBack}
                        selectedSide={selectedSide}
                    />
                </div>
            </div>

            <style jsx>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }

          body {
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
        </div>
    );
};

// Internal Printable Component matching admin styles
const StudentPrintableCard = ({
    person,
    institution,
    academicYear,
    idCardBackgroundImageUrl,
    idCardSealImageUrl,
    showFront,
    showBack,
    selectedSide,
}) => {
    const studentAdmissionNo = person.admissionNumber || person.studentSpecificField?.admissionNumber || person._id?.substring(0, 8).toUpperCase();
    const wrapperClass = selectedSide === "Both Sides" ? "w-1/2 h-1/2 p-2 flex space-x-2" : "w-1/4 h-1/2 p-2 flex";
    const innerClass = selectedSide === "Both Sides" ? "border rounded shadow w-1/2 overflow-hidden bg-white text-slate-900" : "border rounded shadow w-full overflow-hidden bg-white text-slate-900";

    return (
        <div className={wrapperClass} style={{ pageBreakInside: "avoid" }}>
            {showFront && (
                <div className={innerClass}>
                    <div className="relative bg-white w-full h-full p-4 rounded shadow overflow-hidden flex flex-col">
                        {idCardBackgroundImageUrl && (
                            <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
                                <svg width="100%" height="100%">
                                    <image href={idCardBackgroundImageUrl} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
                                </svg>
                            </div>
                        )}
                        <div className="relative z-10 flex flex-col h-full w-full">
                            <div className="text-center mb-1">
                                <h2 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                                    {institution.name || "Educational Institution"}
                                </h2>
                                <p className="text-xxs text-slate-600 opacity-90">
                                    {institution.tagline || "Excellence in Education"}
                                </p>
                            </div>

                            <div className="flex justify-center mb-1">
                                <div className="h-8 w-8 bg-white rounded-full relative overflow-hidden shadow-sm p-0.5 border border-slate-100 flex items-center justify-center">
                                    {institution?.logo?.url ? (
                                        <div className="relative h-full w-full">
                                            <Image
                                                src={institution.logo.url}
                                                alt="Institution Logo"
                                                fill
                                                unoptimized
                                                priority
                                                className="object-contain p-0.5"
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center">
                                            <Shield className="text-indigo-700" size={16} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col items-center flex-grow">
                                <div className="mb-1">
                                    <div className="w-28 h-28 bg-white border border-slate-200 rounded relative overflow-hidden">
                                        {person.profilePic?.url ? (
                                            <div className="relative h-full w-full">
                                                <Image
                                                    src={person.profilePic.url}
                                                    alt={`${person.name}'s photo`}
                                                    fill
                                                    unoptimized
                                                    priority
                                                    className="object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center bg-slate-50">
                                                <User size={20} className="text-slate-400" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="text-center">
                                    <h3 className="text-base font-bold mt-0.5 bg-slate-100 text-slate-900 inline-block px-1.5 py-0.5 rounded">
                                        {`Admn No: ${studentAdmissionNo}`}
                                    </h3>
                                    <h3 className="font-bold text-xs text-slate-900">{person.name}</h3>
                                </div>
                            </div>

                            <div className="text-xs font-bold text-center mt-auto p-1 flex flex-col items-center w-full">
                                <span className="mb-1 mt-1 bg-indigo-50 border border-indigo-100 rounded-md py-0.5 px-2 shadow-sm text-indigo-900 font-bold w-full whitespace-nowrap">
                                    OFFICIAL STUDENT ID
                                </span>
                                <div className="flex items-center justify-between gap-1.5 mb-1 w-full">
                                    <div className="flex-1 flex items-center justify-center p-1 bg-white rounded border border-slate-200 overflow-hidden h-12 min-w-0">
                                        <Barcode
                                            value={studentAdmissionNo}
                                            width={1.15}
                                            height={28}
                                            format="CODE128"
                                            displayValue={false}
                                            background="#ffffff"
                                            lineColor="#000000"
                                            renderer="svg"
                                            margin={0}
                                        />
                                    </div>
                                    <div
                                        className="h-12 w-12 shrink-0 p-1 bg-white rounded border border-slate-200 flex items-center justify-center overflow-hidden"
                                        title="Scan to view fund balance and history"
                                    >
                                        <QRCodeSVG
                                            value={qrUrl}
                                            size={40}
                                            level="M"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showBack && (
                <div className={innerClass}>
                    <div className="p-2 bg-white h-full flex flex-col">
                        <div className="border-b border-slate-200 pb-1 mb-1">
                            <h3 className="text-xs font-bold text-slate-900 text-center">
                                {studentAdmissionNo} - Contact Information
                            </h3>
                        </div>

                        <div className="relative my-auto">
                            {idCardSealImageUrl && (
                                <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-25 select-none overflow-hidden">
                                    <div className="relative w-44 h-44 mix-blend-multiply">
                                        <Image
                                            src={idCardSealImageUrl}
                                            alt="Seal"
                                            fill
                                            unoptimized
                                            priority
                                            className="object-contain"
                                        />
                                    </div>
                                </div>
                            )}
                            <div className="relative text-xs z-10 grid grid-cols-[max-content_auto_1fr] gap-x-1.5 gap-y-1.5 w-full text-slate-900">
                                <span className="font-bold text-slate-900">Class</span>
                                <span className="text-slate-500 font-bold">:</span>
                                <span className="text-slate-700 font-medium min-w-0">{person.className || "N/A"}</span>

                                <span className="font-bold text-slate-900">Batch</span>
                                <span className="text-slate-500 font-bold">:</span>
                                <span className="text-slate-700 font-medium min-w-0">{person.batchName || "N/A"}</span>

                                <span className="font-bold text-slate-900">Dob</span>
                                <span className="text-slate-500 font-bold">:</span>
                                <span className="text-slate-700 font-medium min-w-0">
                                    {formatDateMonthYear(person.dateOfBirth) || "No DOB provided"}
                                </span>

                                <span className="font-bold text-slate-900">Phone No</span>
                                <span className="text-slate-500 font-bold">:</span>
                                <span className="text-slate-700 font-medium min-w-0">
                                    {person.contactNumber || "No phone provided"}
                                </span>

                                <span className="font-bold text-slate-900">Email</span>
                                <span className="text-slate-500 font-bold">:</span>
                                <span className="text-slate-700 font-medium min-w-0 break-all">
                                    {person.email || "No email provided"}
                                </span>

                                <span className="font-bold text-slate-900">S/o</span>
                                <span className="text-slate-500 font-bold">:</span>
                                <span className="text-slate-700 font-medium min-w-0">
                                    {person.guardianName || "No guardian provided"}
                                </span>

                                <span className="font-bold text-slate-900 whitespace-nowrap">
                                    Contact No
                                </span>
                                <span className="text-slate-500 font-bold">:</span>
                                <span className="text-slate-700 font-medium min-w-0">
                                    {person.guardianContactNumber || "No contact provided"}
                                </span>

                                <span className="font-bold text-slate-900">Address</span>
                                <span className="text-slate-500 font-bold">:</span>
                                <span className="text-slate-700 text-[0.65rem] break-words leading-tight whitespace-normal min-w-0 font-medium">
                                    {Object.values(person.address || {})
                                        .filter(Boolean)
                                        .join(", ") || "No address provided"}
                                </span>

                                <span className="font-bold text-slate-900">Validity</span>
                                <span className="text-slate-500 font-bold">:</span>
                                <span className="text-slate-700 font-medium min-w-0">{academicYear}</span>
                            </div>
                        </div>

                        <div className="bg-indigo-50/90 border border-indigo-100/80 p-1.5 rounded text-center text-xs mt-auto">
                            <p className="font-bold text-indigo-900 text-xs px-8">
                                {institution.name || "Educational Institution"}
                            </p>
                            <p className="text-xxs text-slate-600">
                                {institution.tagline && <span>({institution.tagline})</span>}
                            </p>
                            <p className="text-xxs text-slate-600">
                                Sa-adabad, Deli, P.O Kalanad, Kasaragod
                            </p>
                            <p className="text-xxs text-slate-600">
                                {institution.contact?.primaryPhone &&
                                    `Phone: ${institution.contact.primaryPhone}`}
                                {institution.contact?.secondaryPhone &&
                                    `, ${institution.contact.secondaryPhone}`}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentIdentityCard;
