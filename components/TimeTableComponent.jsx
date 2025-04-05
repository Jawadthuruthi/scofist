"use client";
import { Button } from "@/components/ui/button";
import useCrud from "@/hooks/use-crud";
import usePrint from "@/hooks/use-print";
import { DAYS } from "@/lib/utils";
import { useCallback, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";

const TimeTableComponent = ({ token, teacherId }) => {
  const timeTableRef = useRef(null);

  const { useFetchItems } = useCrud("timeTables", token);
  const { useFetchItems: useFetchPeriods } = useCrud("periods", token);

  const fetchItemsQuery = useFetchItems(0, 0, { teacherId });
  const fetchPeriodsQuery = useFetchPeriods(0, 0, {});

  const timeTables = fetchItemsQuery.data?.timeTables || [];
  const periods = fetchPeriodsQuery.data?.periods || [];

  const timeTableData = timeTables.reduce(
    (acc, timeTable) => {
      const slots = timeTable.timeSlots.filter(
        (slot) => slot.teacherId?._id === teacherId
      );
      const classId = timeTable.classId;
      return {
        timeSlots: [
          ...(acc.timeSlots || []),
          ...slots.map((slot) => ({ ...slot, classId })),
        ],
      };
    },
    { timeSlots: [] }
  );

  const getCellData = useCallback(
    (periodNumber, day) => {
      return timeTableData.timeSlots?.find(
        (slot) => slot.periodNumber === periodNumber && slot.day === day
      );
    },
    [timeTableData.timeSlots]
  );

  const getPeriodTime = useCallback(
    (periodNumber) => {
      const period = periods.find((p) => p.periodNumber === periodNumber);
      return period ? period.formattedTime : `Period ${periodNumber}`;
    },
    [periods]
  );

  const handlePrint = usePrint({
    content: () => timeTableRef.current,
    documentTitle: `Time Table`,
  });

  return (
    <div>
      {fetchItemsQuery.isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div
          ref={timeTableRef}
          className="overflow-x-auto border border-collapse rounded-md"
        >
          <div className="hidden w-full print:block">
            <h3 className="text-center text-lg font-semibold my-4">
              Time Table
            </h3>
          </div>
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="border  bg-accent sticky left-0 rig z-10"></TableHead>
                {periods.map((period) => (
                  <TableHead
                    key={period?._id}
                    className="text-center border-t font-bold whitespace-nowrap"
                  >
                    <div className="flex flex-col items-center text-xxs">
                      <span>{getPeriodTime(period.periodNumber)}</span>
                      <span className="text-xxs text-muted-foreground">
                        Period {period.periodNumber}
                      </span>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {DAYS.map((day) => (
                <TableRow key={day} className="hover:bg-accent/50">
                  <TableCell className="border font-medium bg-accent sticky left-0 z-10">
                    <div className="flex items-center gap-2">
                      {day.slice(0, 3)}
                    </div>
                  </TableCell>
                  {periods.map((period) => {
                    const cellData = getCellData(period.periodNumber, day);
                    return (
                      <TableCell
                        key={period?._id}
                        className="border text-center"
                      >
                        {cellData ? (
                          <div className="flex flex-col items-center justify-center hover:bg-accent">
                            <p className="font-medium text-xs">
                              {cellData.subjectId?.name || ""}
                            </p>
                            <p className="text-xxs text-accent-foreground">
                              {cellData.classId?.name || ""}
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-semibold">-</span>
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <div className="flex justify-end mt-4">
        <Button variant="default" onClick={handlePrint}>
          Print
        </Button>
      </div>
    </div>
  );
};

export default TimeTableComponent;
