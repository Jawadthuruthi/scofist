"use client";
import { useRef, useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Printer, User, Shield, Settings, X } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import Barcode from "react-barcode";
import Header from "./Header";
import dynamic from "next/dynamic";
import { useDownloadPopup } from "@/hooks/useDownloadPopup";
const FormComponent = dynamic(() => import("./FormComponent"), { ssr: false });
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogDescription,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { MultiSelect } from "./ui/multi-select";
import { formatDateForDisplay, formatDateMonthYear, formatOptions } from "@/lib/utils";
import { useRouter } from "next/navigation";

const idCardFormField = [
  {
    name: "backgroundImage",
    label: "ID Card Background",
    inputType: "image",
    type: "object",
    className: "col-span-2 sm:col-span-1",
    maxFileSize: 2 * 1024 * 1024,
    allowedTypes: ["image/jpeg", "image/jpg", "image/png"],
    aspectRatio: "2:3",
    hasSubmitButton: true,
    defaultValue: {},
  },
  {
    name: "sealImage",
    label: "ID Card Seal",
    inputType: "image",
    type: "object",
    className: "col-span-2 sm:col-span-1",
    maxFileSize: 2 * 1024 * 1024,
    allowedTypes: ["image/jpeg", "image/jpg", "image/png"],
    aspectRatio: "1:1",
    hasSubmitButton: true,
    defaultValue: { url: "/sdc_seal.png" },
  },
];

const IdentityCards = ({
  students = [],
  institution = {},
  classes = [],
  idCardBackgroundImageUrl = "",
  idCardSealImageUrl = "",
  teachers = [],
  apiKey,
  settings = {},
  userRole,
  allRoles = [],
  userId,
}) => {
  const [selectionType, setSelectionType] = useState("Student ID");
  const [selectedClass, setSelectedClass] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState([]);
  const [selectedSide, setSelectedSide] = useState("Both Sides");

  const pageRef = useRef(null);
  const popupRef = useRef(null);
  const { handleDownload } = useDownloadPopup(popupRef, `ID_Card_Settings.jpeg`);

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
  const filteredList = useMemo(() => {
    const list = selectionType === "Student ID" ? filteredStudents : filteredTeachers;
    if (userRole === "Student" && userId) {
      return list.filter((person) => String(person._id) === String(userId));
    }
    return list;
  }, [selectionType, filteredStudents, filteredTeachers, userRole, userId]);

  const isManagementView = userRole === "College Admin" || userRole === "Teacher";

  return (
    <div>
      <Header
        title={userRole === "Student" ? "MY IDENTITY CARD" : "IDENTITY CARDS"}
        subTitle={userRole === "Student" ? "View and print your official student identity card" : "Identity cards for Students and Teachers"}
        rightAction={
          userRole === "Student" ? (
            <div className="hidden md:flex items-center gap-3">
              <div className="w-36">
                <Select value={selectedSide} onValueChange={setSelectedSide}>
                  <SelectTrigger id="side-select-desktop" className="h-10">
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
          ) : (
            (userRole === "College Admin" || allRoles.includes("College Admin")) && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" title="Settings">
                    <Settings size={16} />
                  </Button>
                </DialogTrigger>
                <DialogContent ref={popupRef} data-html2canvas-popup="true" className="sm:max-w-2xl overflow-hidden rounded-2xl sm:rounded-2xl max-h-[90vh] [&>button.absolute]:hidden flex flex-col p-0 gap-0 border-gray-100 shadow-xl">
                  <DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md">
                    <button 
                      type="button"
                      className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors focus:outline-none cursor-pointer"
                      onClick={handleDownload}
                      title="Download Image"
                      data-html2canvas-ignore="true"
                    >
                      <Settings className="h-5 w-5 text-primary" />
                    </button>
                    <div className="flex-1 text-left space-y-0.5">
                      <DialogTitle className="text-xl font-bold m-0">ID Card Settings</DialogTitle>
                      <DialogDescription className="m-0 text-sm">
                        Background and seal for ID cards
                      </DialogDescription>
                    </div>
                    <DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none" data-html2canvas-ignore="true">
                      <X className="h-5 w-5" />
                    </DialogClose>
                  </DialogHeader>
                  <div className="p-6 overflow-y-auto">
                    <FormComponent
                      formFields={idCardFormField}
                      apiKey={apiKey}
                      data={settings.idCard}
                      resource="settings"
                      hideDefaultSubmit={true}
                      removeCardWrapper={true}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            )
          )
        }
      />

      {/* For student login: print side and print button on mobile only (below heading) */}
      {userRole === "Student" && (
        <div className="flex md:hidden items-center justify-center w-full mb-6">
          <div className="flex items-center gap-2 w-full max-w-[340px]">
            <div className="flex-1 w-1/2">
              <Select value={selectedSide} onValueChange={setSelectedSide}>
                <SelectTrigger id="side-select-mobile" className="h-10 w-full">
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
      )}

      {/* Management controls for admin/teacher */}
      {isManagementView && (
        <div className="flex flex-col md:flex-row gap-4 mb-6 md:items-end flex-wrap xl:flex-nowrap">
          <div className="flex flex-row gap-4 w-full md:w-auto md:flex-1 md:max-w-[666px]">
            <div className="w-1/2 md:w-full md:flex-1 md:max-w-[325px]">
              <label className="text-sm font-medium mb-1 block">ID Type</label>
              <Select value={selectionType} onValueChange={setSelectionType}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Student ID">Student ID</SelectItem>
                  <SelectItem value="Teacher ID">Teacher ID</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectionType === "Student ID" ? (
              <div className="w-1/2 md:w-full md:flex-1 md:max-w-[325px]">
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
            ) : (
              <div className="w-1/2 md:w-full md:flex-1 md:max-w-[325px]">
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
          </div>

          {selectionType === "Student ID" && (
            <div className="w-full md:flex-1 md:max-w-[325px]">
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
          )}

          <div className="w-full md:flex-1 md:max-w-[325px] flex flex-col gap-3">
            <div className="flex gap-2 items-end w-full">
              <div className="flex-1">
                <label htmlFor="side-select" className="text-sm font-medium mb-1 block">
                  Print Side
                </label>
                <Select value={selectedSide} onValueChange={setSelectedSide}>
                  <SelectTrigger id="side-select" className="h-10">
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
                className="flex items-center justify-center gap-2 flex-1 h-10 bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 border-0 btn-print"
                aria-label="Print"
              >
                <Printer size={16} />
                Print
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Screen Preview */}
      <div className="grid grid-cols-12 gap-4 print:hidden mb-8">
        {filteredList.map((person) => (
          <IdCard
            key={person._id}
            person={person}
            institution={institution}
            academicYear={academicYear}
            idCardBackgroundImageUrl={idCardBackgroundImageUrl}
            idCardSealImageUrl={idCardSealImageUrl}
            isStudent={selectionType === "Student ID"}
            selectedSide={selectedSide}
            userRole={userRole}
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

            {(() => {
              let pageItems = filteredList.slice(pageIndex * itemsPerPage, (pageIndex + 1) * itemsPerPage);

              if (selectedSide === "Back Side") {
                // For back side, we have 4 items per row. We must reverse the items within each row
                // and pad with nulls so the back aligns perfectly with the front when the paper is flipped.
                const row1 = pageItems.slice(0, 4);
                const row2 = pageItems.slice(4, 8);
                
                while (row1.length < 4) row1.push(null);
                while (row2.length < 4) row2.push(null);
                
                pageItems = [...row1.reverse(), ...row2.reverse()];
              }

              return pageItems.map((person, i) => {
                if (!person) {
                  return <div key={`empty-${i}`} className="w-1/4 h-1/2 p-2" />;
                }
                return (
                  <PrintableIdCard
                    key={`print-${person._id}`}
                    person={person}
                    institution={institution}
                    academicYear={academicYear}
                    idCardBackgroundImageUrl={idCardBackgroundImageUrl}
                    idCardSealImageUrl={idCardSealImageUrl}
                    isStudent={selectionType === "Student ID"}
                    selectedSide={selectedSide}
                  />
                );
              });
            })()}
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
  idCardSealImageUrl,
  isStudent,
  selectedSide,
  userRole,
}) => {
  const showFront = selectedSide === "Both Sides" || selectedSide === "Front Side";
  const showBack = selectedSide === "Both Sides" || selectedSide === "Back Side";

  const isStudentView = userRole === "Student";
  const studentAdmissionNo = person.admissionNumber || person.studentSpecificField?.admissionNumber || person._id?.substring(0, 8).toUpperCase();

  return (
    <div className={`preview-container ${isStudentView ? "col-span-12 flex-row flex-wrap items-stretch justify-center" : "col-span-12 xs:col-span-6 md:col-span-4 xl:col-span-3 flex-col"} gap-6 flex`}>
      {/* Front Side Preview */}
      {showFront && (
        <Card className={`shadow-lg overflow-hidden border border-slate-200 bg-white text-slate-900 dark:bg-white dark:text-slate-900 dark:border-slate-200 flex-1 ${isStudentView ? "max-w-[340px] min-w-[300px] w-full" : ""}`}>
          <CardContent className="p-0 flex flex-col h-full bg-white dark:bg-white text-slate-900 dark:text-slate-900">
            <div className="relative bg-white dark:bg-white text-slate-900 dark:text-slate-900 w-full flex-1 p-4 overflow-hidden">
              {idCardBackgroundImageUrl && (
                <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
                  <svg width="100%" height="100%">
                    <image href={idCardBackgroundImageUrl} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
                  </svg>
                </div>
              )}
              <div className="relative z-10 w-full h-full flex flex-col">
                {/* Centered Institution Title */}
                <div className="text-center mb-3">
                  <h2 className="font-bold text-sm uppercase tracking-wider text-slate-900 dark:text-slate-900 drop-shadow-sm">
                    {institution.name || "Educational Institution"}
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-600 font-medium">
                    {institution.tagline || "Excellence in Education"}
                  </p>
                </div>

                {/* Institution Logo */}
                <div className="flex justify-center mb-3">
                  <div className="h-14 w-14 bg-white rounded-full relative overflow-hidden shadow-md p-1 border border-slate-100 flex items-center justify-center">
                    {institution.logo ? (
                      <div className="relative h-full w-full">
                        <Image
                          src={institution.logo.url || ""}
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

                {/* Person Photo and Details - Centered Layout */}
                <div className="flex flex-col items-center">
                  <div className="mb-3">
                    <div className="w-24 h-28 bg-white border-2 border-white rounded-md relative overflow-hidden shadow-md">
                      {person.profilePic?.url ? (
                        <div className="relative h-full w-full">
                          <Image
                            src={person?.profilePic?.url || ""}
                            alt={`${person.name}'s photo`}
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

                  {/* Person Name and ID - Centered */}
                  <div className="text-center space-y-1">
                    <h2 className="text-sm font-bold mt-1 bg-slate-100/90 text-slate-900 dark:text-slate-900 border border-slate-200/80 inline-block px-2.5 py-0.5 rounded shadow-sm">
                      {isStudent
                        ? `Admn No: ${studentAdmissionNo}`
                        : "Faculty"}
                    </h2>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-900 mt-0.5">{person.name}</h3>
                    {!isStudent && (
                      <div className="text-xs text-slate-600 dark:text-slate-600">
                        <p>{person.address?.place || person.place || "No place provided"}</p>
                        {(person.address?.district || person.district) && (
                          <p>{person.address?.district || person.district}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-white dark:bg-white flex flex-col items-center border-t border-slate-100">
              <div className="text-xs text-center font-bold text-indigo-900 dark:text-indigo-900 mb-1 bg-indigo-50/90 border border-indigo-100/90 rounded-md py-1 px-2 inline-block shadow-sm w-full">
                {isStudent
                  ? "OFFICIAL STUDENT ID"
                  : "OFFICIAL TEACHER ID"}
              </div>
              {isStudent && (
                <div className="flex justify-center mt-1 p-1 bg-white rounded border border-slate-200 shadow-sm overflow-hidden h-12">
                  <Barcode
                    value={studentAdmissionNo}
                    width={1.5}
                    height={30}
                    format="CODE128"
                    displayValue={false}
                    background="#ffffff"
                    lineColor="#000000"
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
        <Card className={`shadow-lg overflow-hidden border border-slate-200 bg-white text-slate-900 dark:bg-white dark:text-slate-900 dark:border-slate-200 flex-1 ${isStudentView ? "max-w-[340px] min-w-[300px] w-full" : ""}`}>
          <CardContent className="p-4 flex flex-col h-full bg-white dark:bg-white text-slate-900 dark:text-slate-900">
            <div className="border-b border-slate-200 pb-2 mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-900 text-center">
                {isStudent ? `${studentAdmissionNo} - ` : ""}Contact Information
              </h3>
            </div>

            <PersonDetails
              person={person}
              academicYear={academicYear}
              isStudent={isStudent}
              idCardSealImageUrl={idCardSealImageUrl}
            />

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
  );
};

// Extracted component for person details (reused in both preview and print views)
const PersonDetails = ({ person, academicYear, isStudent, idCardSealImageUrl }) => {
  const sealUrl = idCardSealImageUrl || "/sdc_seal.png";
  
  return (
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
        {isStudent ? (
          <>
            <span className="font-bold text-slate-900 dark:text-slate-900">Class</span>
            <span className="text-slate-500 font-bold">:</span>
            <span className="text-slate-700 dark:text-slate-700 font-medium min-w-0">{person.className || "N/A"}</span>

            <span className="font-bold text-slate-900 dark:text-slate-900">Batch</span>
            <span className="text-slate-500 font-bold">:</span>
            <span className="text-slate-700 dark:text-slate-700 font-medium min-w-0">{person.batchName || "N/A"}</span>

            <span className="font-bold text-slate-900 dark:text-slate-900">Dob</span>
            <span className="text-slate-500 font-bold">:</span>
            <span className="text-slate-700 dark:text-slate-700 font-medium min-w-0">
              {formatDateMonthYear(person.dateOfBirth) || "No DOB provided"}
            </span>

            <span className="font-bold text-slate-900 dark:text-slate-900">Phone No</span>
            <span className="text-slate-500 font-bold">:</span>
            <span className="text-slate-700 dark:text-slate-700 font-medium min-w-0">
              {person.contactNumber || "No phone provided"}
            </span>

            <span className="font-bold text-slate-900 dark:text-slate-900">Email</span>
            <span className="text-slate-500 font-bold">:</span>
            <span className="text-slate-700 dark:text-slate-700 font-medium min-w-0 break-all">
              {person.email || "No email provided"}
            </span>

            <span className="font-bold text-slate-900 dark:text-slate-900">S/o</span>
            <span className="text-slate-500 font-bold">:</span>
            <span className="text-slate-700 dark:text-slate-700 font-medium min-w-0">
              {person.guardianName || "No guardian provided"}
            </span>

            <span className="font-bold text-slate-900 dark:text-slate-900 whitespace-nowrap">
              Contact No
            </span>
            <span className="text-slate-500 font-bold">:</span>
            <span className="text-slate-700 dark:text-slate-700 font-medium min-w-0">
              {person.guardianContactNumber || "No contact provided"}
            </span>

            <span className="font-bold text-slate-900 dark:text-slate-900">Address</span>
            <span className="text-slate-500 font-bold">:</span>
            <span className="text-slate-700 dark:text-slate-700 text-[0.65rem] break-words leading-tight whitespace-normal min-w-0 font-medium">
              {Object.values(person.address || {})
                .filter(Boolean)
                .join(", ") || "No address provided"}
            </span>

            <span className="font-bold text-slate-900 dark:text-slate-900">Validity</span>
            <span className="text-slate-500 font-bold">:</span>
            <span className="text-slate-700 dark:text-slate-700 font-medium min-w-0">{academicYear}</span>
          </>
        ) : (
          <>
            <span className="font-bold text-slate-900 dark:text-slate-900">Email</span>
            <span className="text-slate-500 font-bold">:</span>
            <span className="text-slate-700 dark:text-slate-700 font-medium min-w-0 break-all">
              {person.email || "No email provided"}
            </span>

            <span className="font-bold text-slate-900 dark:text-slate-900">Date of Joining</span>
            <span className="text-slate-500 font-bold">:</span>
            <span className="text-slate-700 dark:text-slate-700 font-medium min-w-0">
              {formatDateForDisplay(new Date(person.dateOfJoining)) ||
                "No date provided"}
            </span>

            <span className="font-bold text-slate-900 dark:text-slate-900">Alternative Contact</span>
            <span className="text-slate-500 font-bold">:</span>
            <span className="text-slate-700 dark:text-slate-700 font-medium min-w-0">
              {person.alternativeContactNumber || "No contact provided"}
            </span>

            <span className="font-bold text-slate-900 dark:text-slate-900">Dob</span>
            <span className="text-slate-500 font-bold">:</span>
            <span className="text-slate-700 dark:text-slate-700 font-medium min-w-0">
              {formatDateForDisplay(new Date(person.dateOfBirth)) ||
                "No DOB provided"}
            </span>

            <span className="font-bold text-slate-900 dark:text-slate-900">Address</span>
            <span className="text-slate-500 font-bold">:</span>
            <span className="text-slate-700 dark:text-slate-700 text-[0.65rem] break-words leading-tight whitespace-normal min-w-0 font-medium">
              {Object.values(person.address || {})
                .filter(Boolean)
                .join(", ") || "No address provided"}
            </span>

            <span className="font-bold text-slate-900 dark:text-slate-900">Phone No</span>
            <span className="text-slate-500 font-bold">:</span>
            <span className="text-slate-700 dark:text-slate-700 font-medium min-w-0">
              {person.contactNumber || "No phone provided"}
            </span>

            <span className="font-bold text-slate-900 dark:text-slate-900">Validity</span>
            <span className="text-slate-500 font-bold">:</span>
            <span className="text-slate-700 dark:text-slate-700 font-medium min-w-0">{academicYear}</span>
          </>
        )}
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
  idCardSealImageUrl,
  isStudent,
  selectedSide,
}) => {
  const showFront = selectedSide === "Both Sides" || selectedSide === "Front Side";
  const showBack = selectedSide === "Both Sides" || selectedSide === "Back Side";

  const wrapperClass = selectedSide === "Both Sides" ? "w-1/2 h-1/2 p-2 flex space-x-2" : "w-1/4 h-1/2 p-2 flex";
  const innerClass = selectedSide === "Both Sides" ? "border rounded shadow w-1/2 overflow-hidden bg-white text-slate-900" : "border rounded shadow w-full overflow-hidden bg-white text-slate-900";
  const studentAdmissionNo = person.admissionNumber || person.studentSpecificField?.admissionNumber || person._id?.substring(0, 8).toUpperCase();

  return (
    <div
      className={wrapperClass}
      style={{ pageBreakInside: "avoid" }}
    >
      {/* Front Side Card */}
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
                  {institution.logo ? (
                    <div className="relative h-full w-full">
                      <Image
                        src={institution.logo.url || ""}
                        alt="Institution Logo"
                        fill
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
                          src={person?.profilePic?.url || ""}
                          alt={`${person.name}'s photo`}
                          fill
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
                    {isStudent
                      ? `Admn No: ${studentAdmissionNo}`
                      : ""}
                  </h3>
                  <h3 className="font-bold text-xs text-slate-900">{person.name}</h3>
                  {!isStudent && (
                    <div className="text-xs text-slate-600">
                      <p>{person.address?.place || person.place || "No place provided"}</p>
                      {(person.address?.district || person.district) && (
                        <p>{person.address?.district || person.district}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-xs font-bold text-center mt-auto p-1 flex flex-col items-center w-full">
                <span className="mb-1 mt-1 bg-indigo-50 border border-indigo-100 rounded-md py-0.5 px-2 shadow-sm text-indigo-900 font-bold w-full whitespace-nowrap">
                  {isStudent ? "OFFICIAL STUDENT ID" : "OFFICIAL TEACHER ID"}
                </span>
                {isStudent && (
                  <div className="p-1 mb-1 bg-white rounded border border-slate-200 overflow-hidden h-12 flex items-center">
                    <Barcode
                      value={studentAdmissionNo}
                      width={1.5}
                      height={30}
                      format="CODE128"
                      displayValue={false}
                      background="#ffffff"
                      lineColor="#000000"
                      renderer="svg"
                      margin={0}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Back Side Card */}
      {showBack && (
        <div className={innerClass}>
          <div className="p-2 bg-white h-full flex flex-col">
            <div className="border-b border-slate-200 pb-1 mb-1">
              <h3 className="text-xs font-bold text-slate-900 text-center">
                {isStudent ? `${studentAdmissionNo} - ` : ""}Contact Information
              </h3>
            </div>

            <PersonDetails
              person={person}
              academicYear={academicYear}
              isStudent={isStudent}
              idCardSealImageUrl={idCardSealImageUrl}
            />

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

export default IdentityCards;
