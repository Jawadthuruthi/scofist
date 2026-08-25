"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDateShort } from "@/lib/utils";
import PrintHeader from "@/components/PrintHeader";

const InfoField = ({ label, value, fullWidth = false }) => {
  if (!value) return null;
  return (
    <div className={`flex border-b border-gray-100 last:border-0 py-1.5 print:py-[6px] items-start text-sm print:text-[13px] leading-tight ${fullWidth ? 'sm:col-span-2' : ''}`}>
      <span className="font-semibold text-gray-500 min-w-[120px] print:min-w-[110px] uppercase tracking-tighter text-[11px] print:text-[11px]">{label}</span>
      <span className="text-gray-400 mr-2">:</span>
      <span className="text-gray-900 break-words font-normal flex-1">{value}</span>
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
    <div className="px-4 py-2 print:py-[6px] grid grid-cols-1 gap-x-12 print:gap-x-8">
      {children}
    </div>
  </div>
);

export default function TeacherProfilePrintView({ teacher, apiKey }) {
  if (!teacher) return null;

  const getInitials = (name) => {
    return name
      ? name
          .split(" ")
          .map((word) => word.charAt(0))
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "TC";
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
            
            .min-w-full.max-w-full {
                display: none !important;
            }
            
            body * {
                visibility: hidden;
            }

            #student-profile-print-area, 
            #student-profile-print-area * {
                visibility: visible;
            }

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
                max-height: 297mm;
                overflow: hidden;
                box-sizing: border-box;
            }

            .no-print,
            .no-print *,
            button.absolute.right-4.top-4,
            [data-state="open"] > button.absolute { 
                display: none !important;
                visibility: hidden !important;
            }
            
            .print-header-compact div {
                padding-top: 0 !important;
                padding-bottom: 0 !important;
                margin-bottom: 0px !important;
            }
        }
      `}</style>

      {/* College Header - Compact in Print */}
      <div className="mb-2 print:mb-0 print-header-compact">
        <PrintHeader title="TEACHER PROFILE SUMMARY" apiKey={apiKey} displayOnScreen={true} />
      </div>

      {/* Personal Info with Photo - Ultra Compact */}
      <div className="relative mb-4 print:mb-2 break-inside-avoid shadow-sm print:shadow-none border border-gray-100 print:border-gray-200 rounded-lg overflow-hidden shrink-0">
        <div className="bg-gray-50/50 print:bg-gray-50 px-4 py-2 print:py-1.5 border-b border-gray-100 print:border-gray-200">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider print:text-[13px]">
            PERSONAL DETAILS
            </h3>
        </div>
        <div className="px-4 py-2 print:py-[6px] flex flex-col sm:flex-row gap-4 sm:gap-8 justify-between relative">
            {/* Photo Area */}
            <div className="flex justify-center sm:absolute sm:right-4 sm:top-2 w-full sm:w-auto order-first sm:order-none print:absolute print:right-4 print:top-2 print:w-auto mb-2 sm:mb-0">
                <Avatar className="h-24 w-24 sm:h-28 sm:w-28 print:h-24 print:w-24 border-2 border-slate-100 rounded-lg shadow-inner overflow-hidden">
                    <AvatarImage src={teacher?.profilePic?.url} alt={teacher?.name} className="object-cover" />
                    <AvatarFallback className="bg-slate-50 text-slate-300 font-black text-2xl">
                        {getInitials(teacher.name)}
                    </AvatarFallback>
                </Avatar>
            </div>
            <div className="grid grid-cols-1 grow gap-x-12 print:gap-x-8 sm:pr-32 print:pr-24 w-full">
                <InfoField label="Full Name" value={teacher.name} fullWidth={true} />
                <InfoField label="Email" value={teacher?.email} fullWidth={true} />
                
                <InfoField label="Teacher ID" value={teacher._id} fullWidth={true} />
                <InfoField label="Date of Birth" value={formatDateShort(teacher?.dateOfBirth)} fullWidth={true} />
                <InfoField label="Contact No" value={teacher.contactNumber} fullWidth={true} />
                <InfoField label="Alt. Contact" value={teacher.alternativeNumber} fullWidth={true} />
            </div>
        </div>
      </div>

      {/* Professional Info */}
      <Section title="PROFESSIONAL RECORDS">
        <InfoField label="Date Of Joining" value={formatDateShort(teacher?.dateOfJoining)} fullWidth={true} />
        <InfoField label="Roles" value={teacher?.roles?.join(", ")} fullWidth={true} />
        <InfoField label="Current Status" value={teacher?.status} fullWidth={true} />
      </Section>

      {/* Address */}
      <Section title="RESIDENTIAL ADDRESS">
        <InfoField label="House Name" value={teacher?.houseName || teacher?.address?.houseName} fullWidth={true} />
        <InfoField label="Place" value={teacher?.place || teacher?.address?.place} fullWidth={true} />
        <InfoField label="Post Office" value={teacher?.postOffice || teacher?.address?.postOffice} fullWidth={true} />
        <InfoField label="District" value={teacher?.district || teacher?.address?.district} fullWidth={true} />
        <InfoField label="State" value={teacher?.state || teacher?.address?.state} fullWidth={true} />
        <InfoField label="Pin Code" value={teacher?.pin || teacher?.address?.pin} fullWidth={true} />
      </Section>

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
