"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDateShort, cn } from "@/lib/utils";
import PrintHeader from "@/components/PrintHeader";

const InfoField = ({ label, value, fullWidth = false }) => {
  if (!value) return null;
  return (
    <div className={`flex border-b border-gray-100 last:border-0 py-1.5 print:py-[6px] items-start text-sm print:text-[13px] leading-tight ${fullWidth ? 'sm:col-span-2' : ''}`}>
      <span className="font-semibold text-gray-500 min-w-[120px] print:min-w-[110px] uppercase tracking-tighter text-[11px] print:text-[11px]">{label}</span>
      <span className="text-gray-400 mr-2">:</span>
      <div className="text-gray-900 break-words font-normal flex-1">{value}</div>
    </div>
  );
};

const Section = ({ title, children }) => (
  <div className="mb-4 print:mb-2 break-inside-avoid shadow-sm print:shadow-none border border-gray-100 print:border-gray-200 rounded-lg overflow-hidden">
    <div className="bg-gray-50/50 print:bg-gray-50 px-4 py-2 print:py-1.5 border-b border-gray-100 print:border-gray-200">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider print:text-[13px]">
        {title}
        </h3>
    </div>
    <div className="px-4 py-2 print:py-[6px] grid grid-cols-1 sm:grid-cols-2 gap-x-12 print:gap-x-8">
      {children}
    </div>
  </div>
);

export default function StudentProfilePrintView({ student, classes, batches, apiKey }) {
  if (!student) return null;

  const renderCourseDisplay = (coursesList) => {
    if (!Array.isArray(coursesList)) return null;
    let target = coursesList.filter(
      (c) =>
        c &&
        (!c.status || String(c.status).trim().toLowerCase() === "ongoing") &&
        c.courseName?.trim()
    );
    if (target.length === 0) {
      target = coursesList.filter((c) => c && c.courseName?.trim());
    }
    if (target.length === 0) return null;

    return (
      <div className="flex flex-col gap-2">
        {target.map((c, idx) => {
          const status = c.status || "Ongoing";
          const yearStr = c.year
            ? String(c.year).toLowerCase().startsWith("year")
              ? String(c.year).trim()
              : `Year ${String(c.year).trim()}`
            : null;
          const subInfo = [yearStr, c.universityBoard?.trim() || null]
            .filter(Boolean)
            .join(" • ");

          return (
            <div key={idx} className="flex flex-col">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-medium text-gray-900 text-sm">
                  {c.courseName}
                </span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider border leading-none inline-flex items-center",
                    status === "Completed"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 print:bg-transparent print:border-gray-300 print:text-gray-800"
                      : status === "Pending"
                      ? "bg-amber-50 text-amber-700 border-amber-200 print:bg-transparent print:border-gray-300 print:text-gray-800"
                      : "bg-blue-50 text-blue-700 border-blue-200 print:bg-transparent print:border-gray-300 print:text-gray-800"
                  )}
                >
                  {status}
                </span>
              </div>
              {subInfo && (
                <div className="text-[11px] text-gray-500 print:text-gray-600 mt-0.5 font-normal leading-tight">
                  {subInfo}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const ongoingIslamicCourse = React.useMemo(() => {
    const list =
      student?.studentSpecificField?.islamicCourses ||
      student?.islamicCourses ||
      [];
    return renderCourseDisplay(list);
  }, [student]);

  const ongoingAcademicCourse = React.useMemo(() => {
    const list =
      student?.studentSpecificField?.academicCourses ||
      student?.academicCourses ||
      [];
    return renderCourseDisplay(list);
  }, [student]);

  const getInitials = (name) => {
    return name
      ? name
          .split(" ")
          .map((word) => word.charAt(0))
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "ST";
  };

  return (
    <div 
      id="student-profile-print-area"
      className="bg-white mx-auto print:font-sans w-full max-w-[210mm] print:shadow-none print:border-none print:leading-none relative flex flex-col px-2 sm:px-[8mm]"
      style={{
        minHeight: "auto",
      }}
    >
      <style>{`
        @media print {
            @page {
                size: A4;
                margin: 0;
            }
            body {
                background: white !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            
            /* 
             * Hide the main background app (dashboard) entirely.
             * This collapses the 10+ page table to 0 height, eliminating blank pages!
             */
            .min-w-full.max-w-full {
                display: none !important;
            }
            
            /* Also hide any other background elements visually */
            body * {
                visibility: hidden;
            }

            /* SHOW PRINT AREA */
            #student-profile-print-area, 
            #student-profile-print-area * {
                visibility: visible;
            }

            /* RESET DIALOG POSITIONING FOR PRINT */
            [role="dialog"] {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                transform: none !important;
                width: 100% !important;
                height: auto !important;
                max-height: none !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                box-shadow: none !important;
                overflow: visible !important;
            }
            
            #student-profile-print-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                height: auto;
                max-height: 297mm; /* Max A4 height */
                overflow: hidden; /* Prevent spillover to page 2 */
                box-sizing: border-box;
            }

            .no-print,
            .no-print *,
            button.absolute.right-4.top-4, /* Hide shadcn dialog close icon */
            [data-state="open"] > button.absolute { 
                display: none !important;
                visibility: hidden !important;
            }
            
            /* Narrow down the PrintHeader padding for this view */
            .print-header-compact div {
                padding-top: 0 !important;
                padding-bottom: 0 !important;
                margin-bottom: 0px !important;
            }
        }
      `}</style>

      {/* College Header - Compact in Print */}
      <div className="mb-2 print:mb-0 print-header-compact">
        <PrintHeader title="STUDENT PROFILE SUMMARY" apiKey={apiKey} displayOnScreen={true} />
      </div>

      {/* Personal Info with Photo - Ultra Compact */}
      <div className="relative mb-4 print:mb-2 break-inside-avoid shadow-sm print:shadow-none border border-gray-100 print:border-gray-200 rounded-lg overflow-hidden shrink-0">
        <div className="bg-gray-50/50 print:bg-gray-50 px-4 py-2 print:py-1.5 border-b border-gray-100 print:border-gray-200">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider print:text-[13px]">
            PERSONAL DETAILS
            </h3>
        </div>
        <div className="px-4 py-2 print:py-[6px] flex flex-col sm:flex-row gap-4 sm:gap-8 justify-between relative">
            {/* Photo Area - First on mobile, absolute on desktop/print */}
            <div className="flex justify-center sm:absolute sm:right-4 sm:top-2 w-full sm:w-auto order-first sm:order-none print:absolute print:right-4 print:top-2 print:w-auto mb-2 sm:mb-0">
                <Avatar className="h-24 w-24 sm:h-28 sm:w-28 print:h-24 print:w-24 border-2 border-slate-100 rounded-lg shadow-inner overflow-hidden">
                    <AvatarImage src={student?.profilePic?.url} alt={student?.name} className="object-cover" />
                    <AvatarFallback className="bg-slate-50 text-slate-300 font-black text-2xl">
                        {getInitials(student.name)}
                    </AvatarFallback>
                </Avatar>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 grow gap-x-12 print:gap-x-8 sm:pr-32 print:pr-24 w-full">
                <InfoField label="Full Name" value={student.name} fullWidth={true} />
                <InfoField label="Email" value={student?.email} fullWidth={true} />
                {Array.isArray(student?.roles) &&
                  student.roles.filter((r) => r && r !== "User").length > 1 && (
                    <InfoField
                      label="Roles"
                      value={student.roles.filter((r) => r && r !== "User").join(", ")}
                      fullWidth={true}
                    />
                  )}
                
                <InfoField label="Student ID" value={student._id} />
                <InfoField label="Admission No" value={student?.studentSpecificField?.admissionNumber || student?.admissionNumber} />
                <InfoField label="Date of Birth" value={formatDateShort(student?.dateOfBirth)} />
                <InfoField label="Blood Group" value={student?.studentSpecificField?.bloodGroup || student?.bloodGroup} />
                <InfoField label="Aadhar No" value={student?.studentSpecificField?.aadharNo || student?.aadharNo} />
                <InfoField label="Contact No" value={student.contactNumber} />
                <InfoField label="Alt. Contact" value={student.alternativeNumber} />
            </div>
        </div>
      </div>

      {/* Academic Info */}
      <Section title="ACADEMIC RECORDS">
        {/* Using resolved class/batch names with fallbacks */}
        <InfoField label="Current Class" value={student.className || classes?.find(c => String(c._id) === String(student?.studentSpecificField?.classId))?.name} />
        <InfoField label="Current Batch" value={student.batchName || batches?.find(b => String(b._id) === String(student?.studentSpecificField?.batchId))?.name} />
        <InfoField label="Admission Class" value={student.admissionClassName || classes?.find(c => String(c._id) === String(student?.studentSpecificField?.admissionClassId))?.name} />
        <InfoField label="Admission Date" value={formatDateShort(student?.studentSpecificField?.admissionDate || student?.admissionDate)} />
        <InfoField label="Islamic Qualif." value={student?.studentSpecificField?.islamicQualification || student?.islamicQualification} />
        <InfoField label="Islamic Course" value={ongoingIslamicCourse} />
        <InfoField label="Academic Qualif." value={student?.studentSpecificField?.academicQualification || student?.academicQualification} />
        <InfoField label="Academic Course" value={ongoingAcademicCourse} />
        <InfoField label="Graduated Year" value={student?.studentSpecificField?.graduatedYear || student?.graduatedYear} />
        <InfoField label="Current Status" value={student?.studentSpecificField?.status || student?.status} />
      </Section>

      {/* Guardian Details */}
      <Section title="GUARDIAN INFORMATION">
        <InfoField 
          label="Guardian Name" 
          value={student?.studentSpecificField?.guardianName || student?.guardianName || student?.guardian?.name} 
        />
        <InfoField 
          label="Relationship" 
          value={student?.studentSpecificField?.relationship || student?.relationship || student?.guardian?.relationship} 
        />
        <InfoField 
          label="Guardian Phone" 
          value={student?.studentSpecificField?.guardianContactNumber || student?.guardianContactNumber || student?.guardian?.contactNumber} 
        />
        <InfoField 
          label="G. Alt Phone" 
          value={student?.studentSpecificField?.guardianAlternativeNumber || student?.guardianAlternativeNumber || student?.guardian?.alternativeNumber} 
        />
      </Section>

      {/* Address - Redesigned with individual labels */}
      <Section title="RESIDENTIAL ADDRESS">
        <InfoField label="House Name" value={student?.studentSpecificField?.address?.houseName || student?.address?.houseName || student?.houseName} />
        <InfoField label="Place" value={student?.studentSpecificField?.address?.place || student?.address?.place || student?.place} />
        <InfoField label="Location Point" value={student?.studentSpecificField?.address?.locationPoint || student?.address?.locationPoint || student?.locationPoint} />
        <InfoField label="Post Office" value={student?.studentSpecificField?.address?.postOffice || student?.address?.postOffice || student?.postOffice} />
        <InfoField label="District" value={student?.studentSpecificField?.address?.district || student?.address?.district || student?.district} />
        <InfoField label="State" value={student?.studentSpecificField?.address?.state || student?.address?.state || student?.state} />
        <InfoField label="Pin Code" value={student?.studentSpecificField?.address?.pin || student?.address?.pin || student?.pin} />
      </Section>

      {/* Dropout Info if applicable */}
      {student?.status === "Dropped Out" && (
        <Section title="WITHDRAWAL DETAILS">
            <InfoField label="Dropout Date" value={formatDateShort(student?.droppedOutDate)} />
            <InfoField label="Dropout Class" value={student.droppedOutClass} />
            <InfoField label="Dropout Reason" value={student?.droppedOutReason} />
        </Section>
      )}

      {/* Verification footer - REMOVE ON PRINT as requested */}
      <div className="mt-8 pt-4 border-t border-gray-100 print:hidden no-print">
        <div className="flex justify-between items-end opacity-50 grayscale">
            <div className="text-[10px] font-medium text-gray-400">
                Generated: {new Date().toLocaleString()}
            </div>
            <div className="flex flex-col items-center">
                <div className="w-40 h-px bg-gray-300 mb-1"></div>
                <span className="text-[9px] font-bold uppercase text-gray-400">Office Scan Verified</span>
            </div>
        </div>
      </div>
    </div>
  );
}
