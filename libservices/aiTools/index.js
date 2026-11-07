import { directoryTool } from "./directoryTool.js";
import { attendanceTool } from "./attendanceTool.js";
import { timetableTool } from "./timetableTool.js";
import { academicsTool } from "./academicsTool.js";
import { operationsTool } from "./operationsTool.js";

export function getAITools() {
  return {
    lookupDirectory: directoryTool(),
    checkAttendance: attendanceTool(),
    getTimetable: timetableTool(),
    getAcademicMarks: academicsTool(),
    getOperationsStatus: operationsTool(),
  };
}
