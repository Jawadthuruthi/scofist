"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Loader, Check, X, ChevronLeft, ChevronRight, Printer } from "lucide-react";
import axios from "axios";
import Cookies from "js-cookie";
import { useReactToPrint } from "react-to-print";

// UI Components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Header from "./Header";

const AttendanceSheet = ({ apiKey }) => {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [leaveRecords, setLeaveRecords] = useState({});
  const [daysInMonth, setDaysInMonth] = useState([]);
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const componentRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  const month = date.getMonth();
  const year = date.getFullYear();

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        const response = await axios.get("/api/classes", {
          headers: { "api-key": apiKey },
        });
        setClasses(response.data.classes || []);
      } catch (error) {
        toast.error("Failed to fetch classes.");
        console.error("Error fetching classes:", error);
      } finally {
        setLoading(false);
      }
    };
    if (apiKey) {
      fetchClasses();
    }
  }, [apiKey]);

  useEffect(() => {
    if (selectedClass) {
      const classDetails = classes.find((c) => c._id === selectedClass);
      setSubjects(classDetails?.subjects || []);
      setSelectedSubject("");
    }
  }, [selectedClass, classes]);

  useEffect(() => {
    const fetchStudentsAndAttendance = async () => {
      if (selectedClass && selectedSubject) {
        try {
          setLoading(true);
          // Fetch students
          const studentsRes = await axios.get("/api/users", {
            headers: { "api-key": apiKey },
            params: { roles: "Student", classId: selectedClass, status: "Active" },
          });
          setStudents(studentsRes.data.users || []);

          // Fetch attendance
          const attendanceRes = await axios.get("/api/attendance-sheet", {
            headers: { "api-key": apiKey },
            params: { classId: selectedClass, subjectId: selectedSubject, month, year },
          });
          setAttendance(attendanceRes.data.attendance || {});

          // Fetch leave records
          const leaveRecordsRes = await axios.get("/api/monthly-leave-records", {
            headers: { "api-key": apiKey },
            params: { classId: selectedClass, month, year },
          });
          setLeaveRecords(leaveRecordsRes.data.leaveRecords || {});

        } catch (error) {
          toast.error("Failed to fetch data.");
          console.error("Error fetching data:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchStudentsAndAttendance();
  }, [selectedClass, selectedSubject, month, year, apiKey]);

  useEffect(() => {
    const newDate = new Date(year, month, 1);
    const days = [];
    while (newDate.getMonth() === month) {
      days.push(new Date(newDate));
      newDate.setDate(newDate.getDate() + 1);
    }
    setDaysInMonth(days);
  }, [month, year]);

  const handleMonthChange = (increment) => {
    setDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() + increment);
      return newDate;
    });
  };

  const isNextMonthDisabled = () => {
    const today = new Date();
    return year > today.getFullYear() || (year === today.getFullYear() && month >= today.getMonth());
  };

  const PrintableComponent = () => (
    <div ref={componentRef} className="p-4">
        <h2 className="text-xl font-bold mb-4 text-center">
            Attendance Report - {date.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
        <h3 className="text-lg mb-2 text-center">
            Class: {classes.find(c => c._id === selectedClass)?.name} | Subject: {subjects.find(s => s._id === selectedSubject)?.name}
        </h3>
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead>Student</TableHead>
                {daysInMonth.map((day) => (
                <TableHead key={day.toISOString()} className="text-center">{day.getDate()}</TableHead>
                ))}
            </TableRow>
            </TableHeader>
            <TableBody>
            {students.map((student) => (
                <TableRow key={student._id}>
                <TableCell className="font-medium">{student.name}</TableCell>
                {daysInMonth.map((day) => {
                    const dayOfMonth = day.getDate();
                    const isPresent = attendance[student._id]?.[dayOfMonth];
                    const leaveReason = leaveRecords[student._id]?.[dayOfMonth];
                    return (
                    <TableCell key={day.toISOString()} className="text-center">
                        {isPresent === true && "P"}
                        {isPresent === false && (
                        <>
                            <div>A</div>
                            {leaveReason && <div className="text-xs">{leaveReason}</div>}
                        </>
                        )}
                        {isPresent === undefined && "-"}
                    </TableCell>
                    );
                })}
                </TableRow>
            ))}
            </TableBody>
        </Table>
    </div>
  );


  return (
    <div className="space-y-6">
        <div style={{ display: "none" }}>
            <PrintableComponent />
        </div>
      <Header
        title="ATTENDANCE SHEET"
        subTitle="Monthly attendance report for each subject"
      />
      <div className="flex justify-between items-center">
        <div className="flex gap-4">
          <Select onValueChange={setSelectedClass} value={selectedClass}>
            <SelectTrigger>
              <SelectValue placeholder="Select Class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={setSelectedSubject} value={selectedSubject} disabled={!selectedClass}>
            <SelectTrigger>
              <SelectValue placeholder="Select Subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => handleMonthChange(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold w-32 text-center">
            {date.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h3>
          <Button variant="outline" size="icon" onClick={() => handleMonthChange(1)} disabled={isNextMonthDisabled()}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center h-40">
          <Loader className="h-8 w-8 animate-spin" />
        </div>
      )}

      {!loading && selectedClass && selectedSubject && (
        <>
          <div className="overflow-x-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10">Student</TableHead>
                  {daysInMonth.map((day) => (
                    <TableHead key={day.toISOString()} className="text-center">{day.getDate()}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student._id}>
                    <TableCell className="sticky left-0 bg-background z-10 font-medium">{student.name}</TableCell>
                    {daysInMonth.map((day) => {
                      const dayOfMonth = day.getDate();
                      const isPresent = attendance[student._id]?.[dayOfMonth];
                      const leaveReason = leaveRecords[student._id]?.[dayOfMonth];
                      return (
                        <TableCell key={day.toISOString()} className="text-center">
                          {isPresent === true && <Check className="text-green-500 mx-auto" />}
                          {isPresent === false && (
                            <div className="flex flex-col items-center">
                              <X className="text-red-500" />
                              {leaveReason && (
                                <span className="text-xs text-muted-foreground writing-mode-vertical-rl">
                                  {leaveReason}
                                </span>
                              )}
                            </div>
                          )}
                          {isPresent === undefined && <span className="text-muted-foreground">-</span>}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
            <div className="flex justify-end mt-4">
                <Button onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print
                </Button>
            </div>
        </>
      )}
    </div>
  );
};

export default AttendanceSheet;
