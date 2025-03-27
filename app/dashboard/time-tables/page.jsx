"use client";
import Header from "@/components/Header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import React from "react";

const timeTablesPage = () => {
  const [selectedClass, setSelectedClass] = React.useState(null);
  const [timeTables, setTimeTables] = React.useState([
    {
      id: "",
      teacherId: "",
      classId: "",
      subjectName: "",
      timeSlots: [
        {
          startTime: "",
          endTime: "",
          day: "",
          periodNumber: "",
        },
      ],
    },
  ]);

  const mockClasses = Array.from({ length: 10 }, (_, index) => ({
    id: index + 1,
    name: `Class ${index + 1}`,
    subjects: Array.from(
      { length: 10 },
      (_, subjectIndex) => `Subject ${subjectIndex + 1}`
    ),
  }));
  const mockTeachers = Array.from({ length: 10 }, (_, index) => ({
    id: index + 1,
    name: `Teacher ${index + 1}`,
  }));

  React.useEffect(() => {
    if (selectedClass) {
      const filteredTimeTables = timeTables.filter(
        (timeTable) => timeTable.classId === selectedClass
      );
      setTimeTables(filteredTimeTables);
    } else {
      setTimeTables([]);
    }
  }, [selectedClass]);
  const mockTimeTable = [
    {
      subjectName: "Mathematics",
      classId: "10A",
      teacherId: "Mr. Smith",
      timeSlots: [
        { startTime: "09:00", endTime: "10:00", day: "MON" },
        { startTime: "10:00", endTime: "11:00", day: "WED" },
      ],
    },
    {
      subjectName: "Science",
      classId: "10B",
      teacherId: "Mrs. Johnson",
      timeSlots: [
        { startTime: "11:00", endTime: "12:00", day: "TUE" },
        { startTime: "13:00", endTime: "14:00", day: "THU" },
      ],
    },
  ];

  const periods = mockTimeTable.reduce((acc, timeTable) => {
    timeTable.timeSlots.forEach((timeSlot) => {
      const timeRange = `${timeSlot.startTime}-${timeSlot.endTime}`;
      if (!acc.includes(timeRange)) {
        acc.push(timeRange);
      }
    });
    return acc; // Missing return statement was added
  }, []);

  const days = mockTimeTable.reduce((acc, timeTable) => {
    timeTable.timeSlots.forEach((timeSlot) => {
      if (!acc.includes(timeSlot.day)) {
        acc.push(timeSlot.day);
      }
    });
    return acc;
  }, []);

  return (
    <>
      <Header
        title="TIME TABLES MANAGEMENT"
        subTitle="Organize and Oversee Time Tables"
      />
      <div>
        <Select>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select a Class" />
          </SelectTrigger>
          <SelectContent>
            {mockClasses.map((mockClass) => (
              <SelectItem
                key={mockClass.id}
                value={mockClass.id}
                onClick={() => setSelectedClass(mockClass.id)}
              >
                {mockClass.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* time table */}
      <div>
        <Card>
          <CardContent className="p-4">
            <h2 className="text-xl font-bold mb-4">Class Timetable</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day \ Time</TableHead>
                  {periods.map((period, index) => (
                    <TableHead key={index}>{period}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {days.map((day) => (
                  <TableRow key={day}>
                    <TableCell className="font-bold">{day}</TableCell>
                    {periods.map((period, periodIndex) => {
                      const schedule = mockTimeTable.find((entry) =>
                        entry.timeSlots.some(
                          (slot) =>
                            slot.day === day &&
                            `${slot.startTime} - ${slot.endTime}` === period
                        )
                      );
                      return (
                        <TableCell key={periodIndex}>
                          {schedule
                            ? `${schedule.subjectName} (${schedule.classId})`
                            : "-"}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default timeTablesPage;
