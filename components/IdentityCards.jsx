"use client";
import { useRef, useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Printer, User, Shield } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import Barcode from "react-barcode";
import Header from "./Header";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { MultiSelect } from "./ui/multi-select";
import { formatDateForDisplay, formatOptions } from "@/lib/utils";
import { useRouter } from "next/navigation";

const IdentityCards = ({
  students = [],
  institution = {},
  classes = [],
  idCardBackgroundImageUrl = "",
  teachers = [],
}) => {
  const [selectionType, setSelectionType] = useState("Student ID");
  const [selectedClass, setSelectedClass] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState([]);
  const [selectedSide, setSelectedSide] = useState("Both Sides");

  const pageRef = useRef(null);

  const router = useRouter();

  const handlePrint = useReactToPrint({
    contentRef: pageRef,
    documentTitle: "Identity Cards",
  });

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
      console.log("hi");
    }, 60000);

    return () => clearInterval(interval);
  }, [router]);

  const currentYear = new Date().getFullYear();
  const academicYear = `${currentYear}-${currentYear + 1}`;

  // Memoize filtered students to prevent recalculation on every render
  const filteredStudents = useMemo(() => {
    if (selectionType === "Teacher ID") return [];
    return students.filter(
      (student) =>
        (selectedClass.length === 0 || selectedClass.includes(student.classId)) &&
        (selectedStudent.length === 0 || selectedStudent.includes(student._id))
    );
  }, [students, selectedClass, selectedStudent, selectionType]);

  const filteredTeachers = useMemo(() => {
    if (selectionType === "Student ID") return [];
    return teachers.filter((teacher) => selectedTeacher.length === 0 || selectedTeacher.includes(teacher._id));
  }, [teachers, selectedTeacher, selectionType]);

  // Memoize filtered students by class
  const studentsInSelectedClass = useMemo(() => {
    if (selectedClass.length === 0) return students;
    return students.filter((student) => selectedClass.includes(student.classId));
  }, [students, selectedClass]);

  // Formatting options for MultiSelect
  const classOptions = useMemo(() => classes.map((c) => ({ value: c._id, label: c.name })), [classes]);
  const studentOptions = useMemo(() => formatOptions(studentsInSelectedClass), [studentsInSelectedClass]);
  const teacherOptions = useMemo(() => formatOptions(teachers), [teachers]);

  if (!students.length) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500 text-lg font-medium">
          No student records available
        </p>
      </div>
    );
  }

  const itemsPerPage = selectedSide === "Both Sides" ? 4 : 8;
  const filteredList = selectionType === "Student ID" ? filteredStudents : filteredTeachers;

  return (
    <div>
      <Header
        title="IDENTITY CARDS"
        subTitle="Official Identity for Students and Teachers"
      />
      <div className="flex flex-col md:flex-row gap-4 mb-6 md:items-end flex-wrap">
        <div className="w-full md:flex-1 md:min-w-[150px]">
          <label className="text-sm font-medium mb-1 block">ID Type</label>
          <Select value={selectionType} onValueChange={setSelectionType}>
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Student ID">Student ID</SelectItem>
              <SelectItem value="Teacher ID">Teacher ID</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectionType === "Student ID" ? (
          <>
            <div className="w-full md:flex-1 md:min-w-[150px]">
              <label htmlFor="class-select" className="text-sm font-medium mb-1 block">
                Select a Class
              </label>
              <MultiSelect
                options={classOptions}
                onValueChange={setSelectedClass}
                value={selectedClass}
                placeholder="Select a Class"
                multiSelect={true}
              />
            </div>

            <div className="w-full md:flex-1 md:min-w-[150px]">
              <label htmlFor="student-select" className="text-sm font-medium mb-1 block">
                Select a Student
              </label>
              <MultiSelect
                options={studentOptions}
                onValueChange={setSelectedStudent}
                value={selectedStudent}
                placeholder="Select a Student"
                multiSelect={true}
              />
            </div>
          </>
        ) : (
          <div className="w-full md:flex-1 md:min-w-[150px]">
            <label className="text-sm font-medium mb-1 block">Select Teacher</label>
            <MultiSelect
              options={teacherOptions}
              onValueChange={setSelectedTeacher}
              value={selectedTeacher}
              placeholder="Select a teacher"
              multiSelect={true}
            />
          </div>
        )}

        {/* Print Side and Print Button Column */}
        <div className="w-full md:flex-1 md:min-w-[150px] flex flex-col gap-3">
          {/* Print Button */}
          <Button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 w-full"
            aria-label="Print"
          >
            <Printer size={16} />
            Print
          </Button>

          {/* Side Selection */}
          <div>
            <label htmlFor="side-select" className="text-sm font-medium mb-1 block">
              Print Side
            </label>
            <Select value={selectedSide} onValueChange={setSelectedSide}>
              <SelectTrigger id="side-select">
                <SelectValue placeholder="Select Side" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Both Sides">Both Sides</SelectItem>
                <SelectItem value="Front Side">Front Side</SelectItem>
                <SelectItem value="Back Side">Back Side</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Screen Preview */}
      <div className="grid grid-cols-12 gap-4 print:hidden mb-8">
        {filteredList.map((person) => (
          <IdCard
            key={person._id}
            person={person}
            institution={institution}
            academicYear={academicYear}
            idCardBackgroundImageUrl={idCardBackgroundImageUrl}
            isStudent={selectionType === "Student ID"}
            selectedSide={selectedSide}
          />
        ))}
      </div>
      {/* Print Layout - A4 Landscape with Front-Back-Front-Back pattern */}
      <div ref={pageRef} className="hidden print:block">
        {Array.from({
          length: Math.ceil(filteredList.length / itemsPerPage),
        }).map((_, pageIndex) => (
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

            {filteredList
              .slice(pageIndex * itemsPerPage, (pageIndex + 1) * itemsPerPage)
              .map((person) => (
                <PrintableIdCard
                  key={`print-${person._id}`}
                  person={person}
                  institution={institution}
                  academicYear={academicYear}
                  idCardBackgroundImageUrl={idCardBackgroundImageUrl}
                  isStudent={selectionType === "Student ID"}
                  selectedSide={selectedSide}
                />
              ))}
          </div>
        ))}
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
  person,
  institution,
  academicYear,
  idCardBackgroundImageUrl,
  isStudent,
  selectedSide,
}) => {
  const showFront = selectedSide === "Both Sides" || selectedSide === "Front Side";
  const showBack = selectedSide === "Both Sides" || selectedSide === "Back Side";

  return (
    <div className={`preview-container col-span-12 xs:col-span-6 md:col-span-4 xl:col-span-3 gap-4 flex flex-col`}>
      {/* Front Side Preview */}
      {showFront && (
        <Card className=" shadow-md overflow-hidden border-none flex-1">
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

              {/* Person Photo and Details - Centered Layout */}
              <div className="flex flex-col items-center">
                <div className="mb-3">
                  <div className="w-20 h-24 bg-white border-2 border-white rounded-md relative overflow-hidden shadow-md">
                    {person.profilePic?.url ? (
                      <div className="relative h-full w-full">
                        <Image
                          src={person.profilePic.url || ""}
                          alt={`${person.name}'s photo`}
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

                {/* Person Name and ID - Centered */}
                <div className="text-center space-y-1">
                  <h2 className="text-base font-bold mt-1 bg-white/20 inline-block px-2 py-0.5 rounded">
                    {isStudent
                      ? `Admn No: ${person._id?.substring(0, 8).toUpperCase()}`
                      : ""}
                  </h2>
                  <h3 className="font-bold text-xs">{person.name}</h3>
                  {!isStudent && (
                    <p className="text-xs">
                      {person.address?.place || "No place provided"}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-2">
              <div className="text-xs text-center font-medium text-indigo-800 mb-1 bg-white/80 rounded-md py-0.5 px-2 inline-block shadow-sm">
                {isStudent
                  ? "OFFICIAL STUDENT IDENTIFICATION"
                  : "OFFICIAL TEACHER IDENTIFICATION"}
              </div>
              {isStudent && (
                <div className="flex justify-center mt-2 p-1 bg-white rounded shadow-sm overflow-hidden h-12">
                  <Barcode
                    value={person._id?.substring(0, 8).toUpperCase()}
                    width={1.5}
                    height={30}
                    format="CODE128"
                    displayValue={false}
                    background="#ffffff"
                    renderer="svg"
                    margin={0}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Back Side Preview */}
      {showBack && (
        <Card className=" shadow-md overflow-hidden border border-gray-200 flex-1">
          <CardContent className="p-4 flex flex-col h-full">
            <div className="border-b border-gray-200 pb-2 mb-3">
              <h3 className="text-sm font-semibold text-gray-800 text-center">
                Contact Information
              </h3>
            </div>

            <PersonDetails
              person={person}
              academicYear={academicYear}
              isStudent={isStudent}
            />

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
      )}
    </div>
  );
};

// Extracted component for person details (reused in both preview and print views)
const PersonDetails = ({ person, academicYear, isStudent }) => {
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
        {isStudent && (
          <>
            <div className="flex items-start">
              <span className="mr-1 font-semibold min-w-20 w-20">Class:</span>
              <span className="text-gray-700">{person.className}</span>
            </div>
            <div className="flex items-start">
              <span className="mr-1 font-semibold min-w-20 w-20">Batch:</span>
              <span className="text-gray-700">{person.batchName}</span>
            </div>
            <div className="flex items-start">
              <span className="mr-1 font-semibold min-w-20 w-20">S/o:</span>
              <span className="text-gray-700">
                {person.guardianName || "No guardian provided"}
              </span>
            </div>
            <div className="flex items-start">
              <span className="mr-1 font-semibold min-w-20 w-20 whitespace-nowrap">
                Contact No:
              </span>
              <span className="text-gray-700">
                {person.guardianContactNumber || "No contact provided"}
              </span>
            </div>
          </>
        )}
        {!isStudent && (
          <>
            <div className="flex items-start">
              <span className="mr-1 font-semibold min-w-20 w-20">Email:</span>
              <span className="text-gray-700">
                {person.email || "No email provided"}
              </span>
            </div>
            <div className="flex items-start">
              <span className="mr-1 font-semibold min-w-20 w-20">
                Date of Joining:
              </span>
              <span className="text-gray-700">
                {formatDateForDisplay(new Date(person.dateOfJoining)) ||
                  "No date provided"}
              </span>
            </div>
            <div className="flex items-start">
              <span className="mr-1 font-semibold min-w-20 w-20">
                Alternative Contact:
              </span>
              <span className="text-gray-700">
                {person.alternativeContactNumber || "No contact provided"}
              </span>
            </div>
          </>
        )}
        <div className="flex items-start">
          <span className="mr-1 font-semibold min-w-20 w-20">Dob:</span>
          <span className="text-gray-700">
            {formatDateForDisplay(new Date(person.dateOfBirth)) ||
              "No DOB provided"}
          </span>
        </div>
        <div className="flex items-start">
          <span className="mr-1 font-semibold min-w-20 w-20">Address:</span>
          <span className="text-gray-700">
            {Object.values(person.address || {})
              .filter(Boolean)
              .join(", ") || "No address provided"}
          </span>
        </div>
        <div className="flex items-start">
          <span className="mr-1 font-semibold min-w-20 w-20">Phone No:</span>
          <span className="text-gray-700">
            {person.contactNumber || "No phone provided"}
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
  person,
  institution,
  academicYear,
  idCardBackgroundImageUrl,
  isStudent,
  selectedSide,
}) => {
  const showFront = selectedSide === "Both Sides" || selectedSide === "Front Side";
  const showBack = selectedSide === "Both Sides" || selectedSide === "Back Side";

  const wrapperClass = selectedSide === "Both Sides" ? "w-1/2 h-1/2 p-2 flex space-x-2" : "w-1/4 h-1/2 p-2 flex";
  const innerClass = selectedSide === "Both Sides" ? "border rounded shadow w-1/2 overflow-hidden" : "border rounded shadow w-full overflow-hidden";

  return (
    <div
      className={wrapperClass}
      style={{ pageBreakInside: "avoid" }}
    >
      {/* Front Side Card */}
      {showFront && (
        <div className={innerClass}>
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
                  {person.profilePic?.url ? (
                    <div className="relative h-full w-full">
                      <Image
                        src={person.profilePic.url || ""}
                        alt={`${person.name}'s photo`}
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
                  {isStudent
                    ? `Admn No: ${person._id?.substring(0, 8).toUpperCase()}`
                    : ""}
                </h3>
                <h3 className="font-bold text-xs">{person.name}</h3>
                {!isStudent && (
                  <p className="text-xs">
                    {person.address?.place || "No place provided"}
                  </p>
                )}
              </div>
            </div>

            <div className="text-xs font-bold text-center mt-auto p-1 flex flex-col items-center">
              <span className="mb-4 mt-1 bg-white/80 rounded-md py-0.5 px-2 shadow-sm text-indigo-900">{isStudent ? "OFFICIAL STUDENT ID" : "OFFICIAL TEACHER ID"}</span>
              {isStudent && (
                <div className="p-1 mb-1 bg-white rounded overflow-hidden h-12 flex items-center">
                  <Barcode
                    value={person._id?.substring(0, 8).toUpperCase()}
                    width={1.5}
                    height={30}
                    format="CODE128"
                    displayValue={false}
                    background="#ffffff"
                    renderer="svg"
                    margin={0}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Back Side Card */}
      {showBack && (
        <div className={innerClass}>
          <div className="p-2 bg-white h-full flex flex-col">
            <div className="border-b border-gray-200 pb-1 mb-1">
              <h3 className="text-xs font-semibold text-gray-800 text-center">
                Contact Information
              </h3>
            </div>

            <PersonDetails
              person={person}
              academicYear={academicYear}
              isStudent={isStudent}
            />

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
      )}
    </div>
  );
};

export default IdentityCards;
