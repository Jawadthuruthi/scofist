"use client";

import React from "react";
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

export default function ClassProfilePrintView({ classData, apiKey }) {
  if (!classData) return null;

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

      <div className="mb-2 print:mb-0 print-header-compact">
        <PrintHeader title="CLASS PROFILE SUMMARY" apiKey={apiKey} displayOnScreen={true} />
      </div>

      <div className="relative mb-4 print:mb-2 break-inside-avoid shadow-sm print:shadow-none border border-gray-100 print:border-gray-200 rounded-lg overflow-hidden shrink-0">
        <div className="bg-gray-50/50 print:bg-gray-50 px-4 py-2 print:py-1.5 border-b border-gray-100 print:border-gray-200">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider print:text-[13px]">
            CLASS DETAILS
            </h3>
        </div>
        <div className="px-4 py-2 print:py-[6px] grid grid-cols-1 gap-x-12 print:gap-x-8 w-full">
            <InfoField label="Class Name" value={classData.name} fullWidth={true} />
            <InfoField label="Class ID" value={classData._id} fullWidth={true} />
            <InfoField label="Short Name" value={classData.shortname} fullWidth={true} />
            <InfoField label="Batch Name" value={classData.batchName} fullWidth={true} />
            <InfoField label="Section" value={classData.section} fullWidth={true} />
            <InfoField label="Current Status" value={classData.status} fullWidth={true} />
        </div>
      </div>

      <Section title="ACADEMIC ASSIGNMENTS">
        <InfoField label="Assigned Teacher" value={classData.teacherName} fullWidth={true} />
        <InfoField label="Core Subjects" value={classData.coreSubjectsName?.join(", ")} fullWidth={true} />
        <InfoField label="Major Subjects" value={classData.majorSubjectsName?.join(", ")} fullWidth={true} />
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
