"use client";
import { useRef, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Printer, User, Shield } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import Header from "./Header";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { formatDateForDisplay } from "@/lib/utils";

const StudentsIdCard = ({
  students = [],
  institution = {},
  classes = [],
  idCardBackgroundImageUrl = "",
}) => {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");

  const pageRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: pageRef,
  });

  const currentYear = new Date().getFullYear();
  const academicYear = `${currentYear}-${currentYear + 1}`;

  // Memoize filtered students to prevent recalculation on every render
  const filteredStudents = useMemo(() => {
    return students.filter(
      (student) =>
        (!selectedClass || student.classId === selectedClass) &&
        (!selectedStudent || student._id === selectedStudent)
    );
  }, [students, selectedClass, selectedStudent]);

  // Memoize filtered students by class
  const studentsInSelectedClass = useMemo(() => {
    return students.filter((student) => student.classId === selectedClass);
  }, [students, selectedClass]);

  if (!students.length) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500 text-lg font-medium">
          No student records available
        </p>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="STUDENTS ID CARD"
        subTitle="Official Identity for Students"
      />
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="w-full md:w-1/4">
          <label htmlFor="class-select" className="sr-only">
            Select a Class
          </label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-full" id="class-select">
              <SelectValue placeholder="Select a Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={null}>None</SelectItem>
                {classes.map((classItem) => (
                  <SelectItem key={classItem._id} value={classItem._id}>
                    {classItem.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        {selectedClass && (
          <div className="w-full md:w-1/4">
            <label htmlFor="student-select" className="sr-only">
              Select a Student
            </label>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger className="w-full" id="student-select">
                <SelectValue placeholder="Select a Student" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={null}>None</SelectItem>
                  {studentsInSelectedClass.map((student) => (
                    <SelectItem key={student._id} value={student._id}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div className="flex justify-end mb-8">
        <Button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700"
          aria-label="Print ID Cards"
        >
          <Printer size={16} />
          Print ID Cards
        </Button>
      </div>

      {/* Screen Preview */}
      <div className="grid grid-cols-12 gap-4 print:hidden">
        {filteredStudents.map((student) => (
          <IdCard
            key={student._id}
            student={student}
            institution={institution}
            academicYear={academicYear}
            idCardBackgroundImageUrl={idCardBackgroundImageUrl}
          />
        ))}
      </div>

      {/* Print Layout - A4 Landscape with Front-Back-Front-Back pattern */}
      <div
        ref={pageRef}
        className="hidden print:block print:p-0 print:m-0  print:bg-white"
      >
        {Array.from({ length: Math.ceil(filteredStudents.length / 4) }).map(
          (_, pageIndex) => (
            <div
              key={`page-${pageIndex}`}
              className="print-page w-full p-4 flex flex-wrap"
              style={{
                width: "297mm",
                height: "210mm",
                pageBreakAfter: "always",
                pageBreakInside: "avoid",
                breakAfter: "page",
              }}
              aria-hidden="true" // Hide from screen readers when printing
            >
              <div className="print:hidden text-xs text-gray-400">
                Page {pageIndex + 1}
              </div>

              {filteredStudents
                .slice(pageIndex * 4, (pageIndex + 1) * 4)
                .map((student) => (
                  <PrintableIdCard
                    key={`print-${student._id}`}
                    student={student}
                    institution={institution}
                    academicYear={academicYear}
                    idCardBackgroundImageUrl={idCardBackgroundImageUrl}
                  />
                ))}
            </div>
          )
        )}
      </div>

      {/* Enhanced CSS for print and display */}
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

          .preview-container {
            display: none;
          }

          .print-page {
            page-break-after: always;
            break-after: page;
          }
        }

        .preview-container {
          transition: all 0.3s ease;
        }

        .preview-container:hover {
          transform: translateY(-4px);
        }
      `}</style>
    </div>
  );
};

// Extracted component for ID card preview
const IdCard = ({
  student,
  institution,
  academicYear,
  idCardBackgroundImageUrl,
}) => {
  return (
    <div className="preview-container col-span-12 xs:col-span-6 md:col-span-4 xl:col-span-3 gap-4">
      {/* Front Side Preview */}
      <Card className=" shadow-md overflow-hidden border-none mb-4">
        <CardContent className="p-0">
          <div
            style={{ backgroundImage: `url(${idCardBackgroundImageUrl})` }}
            className="bg-cover bg-center w-full h-full p-4 rounded shadow"
          >
            {/* Centered Institution Title */}
            <div className="text-center mb-3">
              <h2 className="font-bold text-sm uppercase tracking-wider">
                {institution.name || "Educational Institution"}
              </h2>
              <p className="text-xs opacity-90">
                {institution.tagline || "Excellence in Education"}
              </p>
            </div>

            {/* Institution Logo */}
            <div className="flex justify-center mb-3">
              <div className="h-12 w-12 bg-white rounded-full relative overflow-hidden shadow-md">
                {institution.logo ? (
                  <div className="relative h-full w-full">
                    <Image
                      src={institution.logo.url || ""}
                      alt="Institution Logo"
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Shield className="text-indigo-700" size={24} />
                  </div>
                )}
              </div>
            </div>

            {/* Student Photo and Details - Centered Layout */}
            <div className="flex flex-col items-center">
              <div className="mb-3">
                <div className="w-20 h-24 bg-white border-2 border-white rounded-md relative overflow-hidden shadow-md">
                  {student.profilePic?.url ? (
                    <div className="relative h-full w-full">
                      <Image
                        src={student.profilePic.url || ""}
                        alt={`${student.name}'s photo`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <User size={28} className="text-gray-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* Student Name and ID - Centered */}
              <div className="text-center space-y-1">
                <h2 className="text-base font-bold mt-1 bg-white/20 inline-block px-2 py-0.5 rounded">
                  Admn No: {student._id?.substring(0, 8).toUpperCase()}
                </h2>
                <h3 className="font-bold text-xs">{student.name}</h3>
              </div>
            </div>
          </div>

          <div className="p-2 bg-gradient-to-b from-indigo-50 to-white">
            <div className="text-xs text-center font-medium text-indigo-800">
              OFFICIAL STUDENT IDENTIFICATION
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Back Side Preview */}
      <Card className=" shadow-md overflow-hidden border border-gray-200">
        <CardContent className="p-4 flex flex-col h-full">
          <div className="border-b border-gray-200 pb-2 mb-3">
            <h3 className="text-sm font-semibold text-gray-800 text-center">
              Contact Information
            </h3>
          </div>

          <StudentDetails student={student} academicYear={academicYear} />

          <div className="mt-auto bg-indigo-50 p-2 rounded-md">
            <div className="text-xs text-center text-gray-700">
              <p className=" font-bold text-indigo-700">
                {institution.name || "Educational Institution"}
              </p>
              <p className="text-xxs text-gray-700">
                {institution.tagline && <span>({institution.tagline})</span>}
              </p>
              <p className="text-xxs text-gray-700">
                Sa-adabad, Deli, P.O Kalanad, Kasaragod
              </p>
              <p className="text-xxs text-gray-700">
                {institution.contact?.primaryPhone &&
                  `Phone: ${institution.contact.primaryPhone}`}
                {institution.contact?.secondaryPhone &&
                  `, ${institution.contact.secondaryPhone}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Extracted component for student details (reused in both preview and print views)
const StudentDetails = ({ student, academicYear }) => {
  return (
    <div className="relative">
      <div
        className="absolute inset-0 bg-center bg-no-repeat z-0"
        style={{
          backgroundImage: 'url("/sdc_seal.png")',
          opacity: 0.4,
          backgroundSize: "250px",
        }}
      ></div>
      <div className="relative text-xs space-y-1 z-10">
        <div className="flex items-start">
          <span className="mr-1 font-semibold min-w-20 w-20">Class:</span>
          <span className="text-gray-700">{student.className}</span>
        </div>
        <div className="flex items-start">
          <span className="mr-1 font-semibold min-w-20 w-20">Batch:</span>
          <span className="text-gray-700">{student.batchName}</span>
        </div>
        <div className="flex items-start">
          <span className="mr-1 font-semibold min-w-20 w-20">Dob:</span>
          <span className="text-gray-700">
            {formatDateForDisplay(new Date(student.dateOfBirth)) ||
              "No DOB provided"}
          </span>
        </div>
        <div className="flex items-start">
          <span className="mr-1 font-semibold min-w-20 w-20">S/o:</span>
          <span className="text-gray-700">
            {student.guardianName || "No guardian provided"}
          </span>
        </div>
        <div className="flex items-start">
          <span className="mr-1 font-semibold min-w-20 w-20 whitespace-nowrap">
            Contact No:
          </span>
          <span className="text-gray-700">
            {student.guardianContactNumber || "No contact provided"}
          </span>
        </div>
        <div className="flex items-start">
          <span className="mr-1 font-semibold min-w-20 w-20">Address:</span>
          <span className="text-gray-700">
            {Object.values(student.address || {})
              .filter(Boolean)
              .join(", ") || "No address provided"}
          </span>
        </div>
        <div className="flex items-start">
          <span className="mr-1 font-semibold min-w-20 w-20">Phone No:</span>
          <span className="text-gray-700">
            {student.contactNumber || "No phone provided"}
          </span>
        </div>
        <div className="flex items-start">
          <span className="mr-1 font-semibold min-w-20 w-20">Validity:</span>
          <span className="text-gray-700">{academicYear}</span>
        </div>
      </div>
    </div>
  );
};

// Extracted component for printable ID card
const PrintableIdCard = ({
  student,
  institution,
  academicYear,
  idCardBackgroundImageUrl,
}) => {
  return (
    <div
      className="w-1/2 h-1/2 p-2 flex space-x-2"
      style={{ pageBreakInside: "avoid" }}
    >
      {/* Front Side Card */}
      <div className="border rounded shadow w-full overflow-hidden ">
        <div
          style={{ backgroundImage: `url(${idCardBackgroundImageUrl})` }}
          className="bg-cover bg-center w-full h-full p-4 rounded shadow flex flex-col"
        >
          <div className="text-center mb-1">
            <h2 className="font-bold text-xs uppercase tracking-wider">
              {institution.name || "Educational Institution"}
            </h2>
            <p className="text-xxs opacity-90">
              {institution.tagline || "Excellence in Education"}
            </p>
          </div>

          <div className="flex justify-center mb-1">
            <div className="h-8 w-8 bg-white rounded-full relative overflow-hidden">
              {institution.logo ? (
                <div className="relative h-full w-full">
                  <Image
                    src={institution.logo.url || ""}
                    alt="Institution Logo"
                    fill
                    className="object-cover"
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
              <div className="w-28 h-28 bg-white border border-white rounded relative overflow-hidden">
                {student.profilePic?.url ? (
                  <div className="relative h-full w-full">
                    <Image
                      src={student.profilePic.url || ""}
                      alt={`${student.name}'s photo`}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <User size={20} className="text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold mt-0.5 bg-white/20 inline-block px-1 py-0.5 rounded">
                Admn No: {student._id?.substring(0, 8).toUpperCase()}
              </h3>
              <h3 className="font-bold text-xs">{student.name}</h3>
            </div>
          </div>

          <div className="bg-white/10 text-xs font-bold text-center mt-1 p-0.5 rounded">
            OFFICIAL STUDENT ID
          </div>
        </div>
      </div>

      {/* Back Side Card */}
      <div className="border rounded shadow w-full overflow-hidden">
        <div className="p-2 bg-white h-full flex flex-col">
          <div className="border-b border-gray-200 pb-1 mb-1">
            <h3 className="text-xs font-semibold text-gray-800 text-center">
              Contact Information
            </h3>
          </div>

          <StudentDetails student={student} academicYear={academicYear} />

          <div className="bg-indigo-50 p-1 rounded text-center text-xs mt-auto">
            <p className="font-bold text-indigo-700 text-xs px-8">
              {institution.name || "Educational Institution"}
            </p>
            <p className="text-xxs text-gray-700">
              {institution.tagline && <span>({institution.tagline})</span>}
            </p>
            <p className="text-xxs text-gray-700">
              Sa-adabad, Deli, P.O Kalanad, Kasaragod
            </p>
            <p className="text-xxs text-gray-700">
              {institution.contact?.primaryPhone &&
                `Phone: ${institution.contact.primaryPhone}`}
              {institution.contact?.secondaryPhone &&
                `, ${institution.contact.secondaryPhone}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentsIdCard;
