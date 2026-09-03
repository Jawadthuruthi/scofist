import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import TeacherAttendance from "@/models/TeacherAttendance";
import TeachersLeaveRecord from "@/models/TeachersLeaveRecord";
import TimeTable from "@/models/TimeTable";
import User from "@/models/User";
import Class from "@/models/Class";
import Subject from "@/models/Subject";
import Settings from "@/models/Settings";
import Attendance from "@/models/Attendance";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// Helper to get consistent YYYY-MM-DD from any Date source using IST Time
const getDS = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  // Convert to IST
  const istDate = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  const year = istDate.getUTCFullYear();
  const month = String(istDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(istDate.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export async function GET(req, res) {
  try {
    await connectToDB();

    const url = new URL(req.url);
    const filterParams = Object.fromEntries(url.searchParams.entries());
    const page = parseInt(filterParams.page || "0");
    const limitParam = filterParams.limit;
    const limit = limitParam === "0" ? Infinity : (parseInt(limitParam) || Infinity);

    // 1. Fetch relevant teachers
    const teacherQuery = { roles: "Teacher" };
    if (filterParams.teacherId) {
      teacherQuery._id = filterParams.teacherId;
    }
    if (filterParams.name) {
      teacherQuery.name = { $regex: filterParams.name, $options: "i" };
    }

    const allTeachers = await User.find(teacherQuery, "_id name dateOfBirth").lean();

    // Sort by seniority (Date of Birth) - oldest first
    allTeachers.sort((a, b) => {
      const d1 = a.dateOfBirth ? new Date(a.dateOfBirth).getTime() : Infinity;
      const d2 = b.dateOfBirth ? new Date(b.dateOfBirth).getTime() : Infinity;
      return d1 - d2;
    });

    // 4. Determine Date Range (Strict UTC) - Moved up to support holiday query
    let startDateParam = filterParams.startDate || filterParams.date;
    let endDateParam = filterParams.endDate || filterParams.date;

    if (!startDateParam && filterParams.year && filterParams.month) {
      const year = parseInt(filterParams.year);
      const month = parseInt(filterParams.month);
      startDateParam = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      endDateParam = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }

    if (!startDateParam) {
      startDateParam = new Date().toISOString().split('T')[0];
      endDateParam = startDateParam;
    }

    let startDate = new Date(startDateParam + "T00:00:00.000Z");
    let endDate = new Date(endDateParam + "T23:59:59.999Z");
    
    if (isNaN(startDate.getTime())) startDate = new Date();
    if (isNaN(endDate.getTime())) endDate = new Date(startDate);

    // 2. Fetch TimeTables, Settings, and Classes for synthesis
    const [timeTables, settings, allClasses] = await Promise.all([
      TimeTable.find({}).lean(),
      Settings.findOne({}).lean(),
      Class.find({}, "_id name section").lean(),
    ]);

    // Build fast classId -> section lookup
    const classSectionMap = {};
    allClasses.forEach(cls => { 
      let section = cls.section || "";
      let name = cls.name || "";
      if (section.toLowerCase().includes("senior") || name.toLowerCase().includes("senior")) {
        section = "Senior Da-awa";
      } else if (section.toLowerCase().includes("junior") || name.toLowerCase().includes("junior")) {
        section = "Junior Da-awa";
      }
      classSectionMap[String(cls._id)] = section; 
    });

    // Build a fast lookup set of non-working date strings from Settings
    const nonWorkingDaySet = new Set([
      ...(settings?.general?.nonWorkingDays || []).map((dt) => getDS(dt)),
      ...(settings?.general?.nonWorkingDaysLog || []).map((entry) => getDS(entry.date))
    ]);
    const seniorDaawaNonWorkingDaySet = new Set([
      ...(settings?.general?.seniorDaawaNonWorkingDays || []).map((dt) => getDS(dt)),
      ...(settings?.general?.seniorDaawaNonWorkingDaysLog || []).map((entry) => getDS(entry.date))
    ]);
    const juniorDaawaNonWorkingDaySet = new Set([
      ...(settings?.general?.juniorDaawaNonWorkingDays || []).map((dt) => getDS(dt)),
      ...(settings?.general?.juniorDaawaNonWorkingDaysLog || []).map((entry) => getDS(entry.date))
    ]);

    const todayIST = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000);
    todayIST.setUTCHours(0, 0, 0, 0);

    const fillDynamicDays = (set, isOff, datesArray) => {
      if (isOff) {
        set.add(getDS(todayIST));
        if (datesArray && datesArray.length > 0) {
          let latestDate = new Date(Math.max(...datesArray.map(d => new Date(d).getTime())));
          latestDate.setUTCHours(0, 0, 0, 0);
          let curr = new Date(latestDate);
          while (curr <= todayIST) {
            set.add(getDS(curr));
            curr.setUTCDate(curr.getUTCDate() + 1);
          }
        }
      }
    };

    fillDynamicDays(nonWorkingDaySet, settings?.general?.isWorkingDay === false, settings?.general?.nonWorkingDays);
    fillDynamicDays(seniorDaawaNonWorkingDaySet, settings?.general?.seniorDaawa?.isWorkingDay === false, settings?.general?.seniorDaawaNonWorkingDays);
    fillDynamicDays(juniorDaawaNonWorkingDaySet, settings?.general?.juniorDaawa?.isWorkingDay === false, settings?.general?.juniorDaawaNonWorkingDays);

    // 6. Synthesize Attendance History
    const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const todayDS = getDS(new Date());

    // 3. Pre-process schedule into a high-performance map
    const scheduleMap = {};
    timeTables.forEach(tt => {
      (tt.timeSlots || []).forEach(slot => {
        if (!slot.teacherId) return;
        const tId = slot.teacherId.toString();
        const day = slot.day;
        
        if (!scheduleMap[tId]) scheduleMap[tId] = {};
        if (!scheduleMap[tId][day]) scheduleMap[tId][day] = [];
        
        scheduleMap[tId][day].push({
          classId: tt.classId,
          subjectId: slot.subjectId,
          periodNumber: slot.periodNumber,
          day: slot.day,
          // Use the EXACT same effective validFrom as the timetable "view by date" component:
          //   slot.validFrom || tt.updatedAt || tt.createdAt
          // Legacy slots (null validFrom) get the timetable document's timestamp as their
          // effective start, so they don't generate phantom absents for all of history.
          validFrom: slot.validFrom || tt.updatedAt || tt.createdAt || null,
          validTo: slot.validTo || null
        });
      });
    });

    const isTodayGlobalWorking = settings?.general?.isWorkingDay !== false;
    // Section-level working day status (only affects today)
    const isSeniorDaawaWorking = settings?.general?.seniorDaawa?.isWorkingDay !== false;
    const isJuniorDaawaWorking = settings?.general?.juniorDaawa?.isWorkingDay !== false;

    // 5. Fetch all data in parallel
    const teacherIds = allTeachers.map(t => t._id.toString());
    const [existingAttendances, conductedClasses, leaveRecords] = await Promise.all([
      // KEY PERF FIX: filter TeacherAttendance at the DB level to only documents
      // that have at least one record in the requested date window.
      // Previously this fetched ALL historical records for ALL teachers.
      TeacherAttendance.aggregate([
        {
          $match: {
            teacherId: { $in: teacherIds },
            "attendanceRecords.date": { $gte: startDate, $lte: endDate },
          },
        },
        {
          $addFields: {
            attendanceRecords: {
              $filter: {
                input: "$attendanceRecords",
                as: "rec",
                cond: {
                  $and: [
                    { $gte: ["$$rec.date", startDate] },
                    { $lte: ["$$rec.date", endDate] },
                  ],
                },
              },
            },
          },
        },
      ]).exec(),
      // Student attendance — ground truth for teacher presence.
      Attendance.find({
        teacherId: { $in: teacherIds },
        date: { $gte: startDate, $lte: endDate },
      }, "teacherId classId subjectId periodNumber date leaveReason").lean(),
      // Leave records — for absent-with-reason entries.
      TeachersLeaveRecord.find({
        teacherId: { $in: teacherIds },
        date: { $gte: startDate, $lte: endDate },
      }, "teacherId classId periodNumber date leaveReason").lean(),
    ]);


    // Build lookup: teacherId -> [attendance objects] for Step 1.5
    // Also build conductedSlotSubjectMap as a fallback subjectId source:
    //   key: teacherId_classId_periodNumber -> subjectId
    // When a historical leave record has no matching timetable slot, we look up
    // the subjectId from actual Attendance records for the same teacher/class/period.
    const conductedClassesByTeacher = {};
    const conductedSlotSubjectMap = {};
    conductedClasses.forEach(att => {
      const tId = att.teacherId.toString();
      if (!conductedClassesByTeacher[tId]) conductedClassesByTeacher[tId] = [];
      conductedClassesByTeacher[tId].push(att);
      // Map: teacherId_classId_periodNumber -> subjectId (any attendance proves the subject)
      const slotKey = `${tId}_${String(att.classId)}_${att.periodNumber}`;
      if (!conductedSlotSubjectMap[slotKey] && att.subjectId) {
        conductedSlotSubjectMap[slotKey] = att.subjectId;
      }
    });

    // Build lookup: teacherId -> [leave records] for Step 1.6
    // Also build leaveReasonMap for joining onto Step 1/2 records.
    const toStr = (v) => (v?._id || v || "").toString().trim();
    const leaveRecordsByTeacher = {};
    const leaveReasonMap = {};
    leaveRecords.forEach(lr => {
      const tId = toStr(lr.teacherId);
      if (!leaveRecordsByTeacher[tId]) leaveRecordsByTeacher[tId] = [];
      leaveRecordsByTeacher[tId].push(lr);
      // leaveReasonMap key: teacherId_classId_periodNumber_YYYY-MM-DD
      const dateKey = getDS(lr.date);
      const key = `${tId}_${toStr(lr.classId)}_${lr.periodNumber}_${dateKey}`;
      if (lr.leaveReason) leaveReasonMap[key] = lr.leaveReason;
    });

    const lookupMap = {};
    existingAttendances.forEach(doc => {
      const tId = doc.teacherId.toString();
      if (!lookupMap[tId]) lookupMap[tId] = {};
      
      (doc.attendanceRecords || []).forEach(r => {
        const dateKey = getDS(r.date);
        const key = `${dateKey}_${String(r.classId)}_${String(r.subjectId)}_${r.periodNumber}`;
        lookupMap[tId][key] = r;
      });
    });

    const formattedData = allTeachers.map(teacher => {
      const records = [];
      const teacherId = teacher._id.toString();
      const teacherSchedules = scheduleMap[teacherId] || {};
      const teacherLookups = lookupMap[teacherId] || {};
      const processedKeys = new Set();

      // 1. First, include ALL actual marked attendance records for this teacher in the range
      // This ensures history is visible even if the TimeTable was reset/deleted.
      Object.entries(teacherLookups).forEach(([key, actual]) => {
        const actualDate = new Date(actual.date);
        if (actualDate >= startDate && actualDate <= endDate) {
          const dateString = getDS(actualDate);
          const isEffectivelyWorking = !nonWorkingDaySet.has(dateString);

          // For today only: skip if the slot's class section is toggled off
          const slotSection = classSectionMap[String(actual.classId)] || "";
          const isSectionWorking = slotSection === "Senior Da-awa" ? !seniorDaawaNonWorkingDaySet.has(dateString)
            : slotSection === "Junior Da-awa" ? !juniorDaawaNonWorkingDaySet.has(dateString)
            : true;

          // Skip counting as absent if it's a non-working day or the section is off today
          if ((!isEffectivelyWorking || !isSectionWorking) && !actual.present) {
            return;
          }

          records.push({
            ...actual,
            date: actual.date
          });
          processedKeys.add(key);
        }
      });

      // 1.5. Add present:true records directly from Attendance (student attendance).
      (conductedClassesByTeacher[teacherId] || []).forEach(att => {
        const ds = getDS(att.date);
        const key = `${ds}_${String(att.classId)}_${String(att.subjectId)}_${att.periodNumber}`;
        
        const isEffectivelyWorking = !nonWorkingDaySet.has(ds);
        const slotSection = classSectionMap[String(att.classId)] || "";
        const isSectionWorking = slotSection === "Senior Da-awa" ? !seniorDaawaNonWorkingDaySet.has(ds)
          : slotSection === "Junior Da-awa" ? !juniorDaawaNonWorkingDaySet.has(ds)
          : true;

        // If it's a non-working day, don't count it as absent even if a leave reason was logged
        if ((!isEffectivelyWorking || !isSectionWorking) && att.leaveReason) {
          return;
        }

        if (!processedKeys.has(key)) {
          records.push({
            _id: `synth_pres_${teacher._id}_${ds}_${att.periodNumber}`,
            teacherId: teacher._id,
            date: new Date(att.date),
            classId: att.classId,
            subjectId: att.subjectId,
            periodNumber: att.periodNumber,
            present: !att.leaveReason,
            synthetic: true,
            leaveReason: att.leaveReason || null
          });
          processedKeys.add(key);
        }
      });

      // 1.6. Add absent records directly from TeachersLeaveRecord.
      // Leave records have no subjectId, so we look it up in order of priority:
      //   1. The timetable slot active on the leave date (validFrom <= date < validTo)
      //   2. Any Attendance record for the same teacher/class/period (conductedSlotSubjectMap)
      //   3. null if neither found (will show "Unknown" — expected for very old data)
      (leaveRecordsByTeacher[teacherId] || []).forEach(lr => {
        const ds = getDS(lr.date);
        const lrClassId = toStr(lr.classId);
        const lrDayName = WEEKDAYS[new Date(lr.date).getUTCDay()];
        const daySlots = teacherSchedules[lrDayName] || [];

        // Priority 1: find the timetable slot that was active on the exact leave date
        const matchingSlot = daySlots.find(s => {
          if (toStr(s.classId) !== lrClassId || s.periodNumber !== lr.periodNumber) return false;
          const vfDS = s.validFrom ? getDS(s.validFrom) : null;
          const vtDS = s.validTo   ? getDS(s.validTo)   : null;
          return (!vfDS || vfDS <= ds) && (!vtDS || vtDS > ds);
        });

        // Priority 2: fall back to any Attendance record for this slot
        const fallbackSlotKey = `${teacherId}_${lrClassId}_${lr.periodNumber}`;
        const subjectId = matchingSlot?.subjectId
          ?? conductedSlotSubjectMap[fallbackSlotKey]
          ?? null;

        const key = `${ds}_${lrClassId}_${String(subjectId)}_${lr.periodNumber}`;
        const slotSection = classSectionMap[lrClassId] || "";
        const isSectionWorking = slotSection === "Senior Da-awa" ? !seniorDaawaNonWorkingDaySet.has(ds)
          : slotSection === "Junior Da-awa" ? !juniorDaawaNonWorkingDaySet.has(ds)
          : true;

        const isEffectivelyWorking = !nonWorkingDaySet.has(ds);

        // Skip adding absent record if section is off or it's a global holiday
        if (!isSectionWorking || !isEffectivelyWorking) {
          return;
        }

        if (!processedKeys.has(key)) {
          records.push({
            _id: `synth_leave_${teacher._id}_${ds}_${lr.periodNumber}`,
            teacherId: teacher._id,
            date: new Date(lr.date),
            classId: lr.classId,
            subjectId,
            periodNumber: lr.periodNumber,
            present: false,
            leaveReason: lr.leaveReason || null,
            synthetic: true
          });
          processedKeys.add(key);
        }
      });

      // 2. Then, synthesize missing records from the TimeTable schedule
      // (handles absent records for slots where no attendance was marked).
      let curr = new Date(startDate);
      while (curr <= endDate) {
        const dayName = WEEKDAYS[curr.getUTCDay()];
        const dateString = getDS(curr);
        const daySlots = teacherSchedules[dayName] || [];

        // Determine if this day is a working day based solely on Settings nonWorkingDays
        // For today, the global toggle is the final truth. For past days, check nonWorkingDays log.
        const isEffectivelyWorking = !nonWorkingDaySet.has(dateString);

        daySlots.forEach(slot => {
          // Filter: Only include slots with subjects, UNLESS it is today (as requested)
          if (!slot.subjectId && dateString !== todayDS) return;

          // Apply filters
          if (filterParams.classId) {
             const classIds = String(filterParams.classId).split(',').map(s => s.trim());
             if (!classIds.includes(String(slot.classId))) return;
          }
          if (filterParams.subjectId) {
             const subjectIds = String(filterParams.subjectId).split(',').map(s => s.trim());
             if (!subjectIds.includes(String(slot.subjectId))) return;
          }
          
          const key = `${dateString}_${String(slot.classId)}_${String(slot.subjectId)}_${slot.periodNumber}`;

          // Use the EXACT same validFrom/validTo logic as the timetable "view by date":
          //   slot covers this date if validFrom <= date AND (no validTo OR validTo > date)
          // This is the single source of truth already used and proven in the timetable component.
          const validFromDS = slot.validFrom ? getDS(slot.validFrom) : null;
          const validToDS   = slot.validTo   ? getDS(slot.validTo)   : null;
          const isStarted   = !validFromDS || validFromDS <= dateString;
          const isNotEnded  = !validToDS   || validToDS   >  dateString;

          // Only add synthetic absent record for scheduled slots not yet claimed by
          // Steps 1 or 1.5. If the teacher actually conducted the class, Step 1.5
          // already added it as present:true and put it in processedKeys.
          // For today only: also skip if the slot's class section is toggled off
          const slotSection = classSectionMap[String(slot.classId)] || "";
          const isSectionWorking = slotSection === "Senior Da-awa" ? !seniorDaawaNonWorkingDaySet.has(dateString)
            : slotSection === "Junior Da-awa" ? !juniorDaawaNonWorkingDaySet.has(dateString)
            : true;

          if (!processedKeys.has(key) && isEffectivelyWorking && isSectionWorking && dateString <= todayDS && isStarted && isNotEnded) {
            records.push({
              _id: `synth_abs_${teacher._id}_${dateString}_${slot.periodNumber}`,
              teacherId: teacher._id,
              date: new Date(curr),
              classId: slot.classId,
              subjectId: slot.subjectId,
              periodNumber: slot.periodNumber,
              present: false,
              synthetic: true
            });
            processedKeys.add(key);
          }
        });
        // UTC increment
        curr.setUTCDate(curr.getUTCDate() + 1);
      }

      return {
        _id: teacher._id,
        name: teacher.name,
        attendanceRecords: records
      };
    });

    // 7. Populate names for synthesized records
    // Collect all classIds and subjectIds — use String() to handle both ObjectId and string types
    const classIds  = [...new Set(formattedData.flatMap(t => t.attendanceRecords.map(r => r.classId  ? String(r.classId)  : null)))].filter(Boolean);
    const subjectIds = [...new Set(formattedData.flatMap(t => t.attendanceRecords.map(r => r.subjectId ? String(r.subjectId) : null)))].filter(Boolean);

    // Build fast lookup: teacherId_classId_periodNumber_YYYY-MM-DD -> leaveReason
    // (leaveReasonMap already built above from the early-fetched leaveRecords)
    
    const [nameClasses, nameSubjects] = await Promise.all([
      Class.find({ _id: { $in: classIds } }, "name").lean(),
      Subject.find({ _id: { $in: subjectIds } }, "name").lean()
    ]);

    const classNameMap = Object.fromEntries(nameClasses.map(c => [c._id.toString(), c.name]));
    const subjectNameMap = Object.fromEntries(nameSubjects.map(s => [s._id.toString(), s.name]));

    formattedData.forEach(teacher => {
      const teacherId = teacher._id.toString();
      teacher.attendanceRecords.forEach(r => {
        if (!r.className) {
          r.className = classNameMap[r.classId?.toString()];
          if (!r.className) {
            r.className = (r.classId && r.classId !== "undefined" && r.classId !== "null") ? r.classId : "N/A";
          }
        }
        if (!r.subjectName) {
          r.subjectName = subjectNameMap[r.subjectId?.toString()];
          if (!r.subjectName) {
            r.subjectName = (r.subjectId && r.subjectId !== "undefined" && r.subjectId !== "null" && r.subjectId !== "") ? r.subjectId : "N/A";
          }
        }
        // Join leaveReason from TeachersLeaveRecord only if they are absent
        const dateKey = getDS(r.date);
        const leaveKey = `${toStr(teacher._id)}_${toStr(r.classId)}_${r.periodNumber}_${dateKey}`;
        if (!r.leaveReason && !r.present && leaveReasonMap[leaveKey]) {
          r.leaveReason = leaveReasonMap[leaveKey];
        }
        if (r.leaveReason) {
          r.present = false;
        }
      });
    });

    const paginatedData = limit === Infinity 
      ? formattedData 
      : formattedData.slice((page * limit), ((page + 1) * limit));

    return NextResponse.json(
      {
        teacherAttendances: paginatedData,
        pagination: {
          page,
          limit,
          total: formattedData.length,
          totalPages: limit === Infinity ? 1 : Math.ceil(formattedData.length / limit),
        },
        message: "Teacher attendance records synthesized successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching teacher attendances:", error);
    return apiResponse.error(error);
  }
}

export async function POST(req, res) {
  try {
    await connectToDB();

    const body = await req.json();

    // Validate required fields for manual teacher attendance creation
    const requiredFields = ["teacherId", "attendanceRecords"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { message: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Make sure each attendance record has a date
    for (const record of body.attendanceRecords) {
      if (!record.date) {
        return NextResponse.json(
          { message: "Each attendance record must have a date" },
          { status: 400 }
        );
      }
    }

    // Use findOneAndUpdate to atomically update in one operation
    const teacherAttendance = await TeacherAttendance.findOne({
      teacherId: body.teacherId,
    });

    if (teacherAttendance) {
      // Update existing records and add new ones in memory
      const updatedRecords = [...teacherAttendance.attendanceRecords];
      const newRecords = [];

      for (const newRecord of body.attendanceRecords) {
        // Convert dates to ISO strings for comparison
        const newRecordDateString = new Date(newRecord.date)
          .toISOString()
          .split("T")[0];

        const existingIndex = updatedRecords.findIndex(
          (existing) =>
            existing.classId.toString() === newRecord.classId.toString() &&
            existing.subjectId.toString() === newRecord.subjectId.toString() &&
            existing.periodNumber === newRecord.periodNumber &&
            existing.day === newRecord.day &&
            new Date(existing.date).toISOString().split("T")[0] ===
            newRecordDateString
        );

        if (existingIndex === -1) {
          // Add new record with current timestamp
          newRecords.push({
            ...newRecord,
            markedAt: new Date(),
          });
        } else {
          // Update existing record with new values and timestamp
          updatedRecords[existingIndex] = {
            ...updatedRecords[existingIndex],
            ...newRecord,
            markedAt: new Date(),
          };
        }
      }

      // Use updateOne to efficiently update the document
      await TeacherAttendance.updateOne(
        { teacherId: body.teacherId },
        {
          $set: { attendanceRecords: [...updatedRecords, ...newRecords] },
        }
      );

      // Return updated document
      const updated = await TeacherAttendance.findOne({
        teacherId: body.teacherId,
      });
      return NextResponse.json(
        {
          teacherAttendance: updated,
          message: "Teacher attendance updated successfully",
        },
        { status: 200 }
      );
    } else {
      // Create new record using insertOne for better performance
      const newAttendance = {
        teacherId: body.teacherId,
        attendanceRecords: body.attendanceRecords.map((record) => ({
          ...record,
          markedAt: new Date(),
        })),
      };

      const result = await TeacherAttendance.create(newAttendance);

      return NextResponse.json(
        {
          teacherAttendance: result,
          message: "Teacher attendance created successfully",
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("Error creating teacher attendance:", error);
    return apiResponse.error(error);
  }
}

export async function PUT(req, res) {
  try {
    await connectToDB();

    const body = await req.json();
    const { teacherId, attendanceRecordIds, updates } = body;

    if (!teacherId || !attendanceRecordIds || !updates) {
      return NextResponse.json(
        { message: "teacherId, attendanceRecordIds, and updates are required" },
        { status: 400 }
      );
    }

    // Use array filter to update multiple records in one operation
    const updateOperations = attendanceRecordIds.map((id) => {
      return {
        "attendanceRecords.$[elem]": {
          ...updates,
          markedAt: new Date(),
        },
      };
    });

    // Use update with array filters for efficient updates
    const result = await TeacherAttendance.updateOne(
      { teacherId },
      { $set: updateOperations[0] },
      {
        arrayFilters: [{ "elem._id": { $in: attendanceRecordIds } }],
        new: true,
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Teacher attendance record not found" },
        { status: 404 }
      );
    }

    // Fetch the updated document
    const updatedAttendance = await TeacherAttendance.findOne({ teacherId })
      .populate("teacherId", "name")
      .populate("attendanceRecords.classId", "name")
      .populate("attendanceRecords.subjectId", "name");

    return NextResponse.json(
      {
        teacherAttendance: updatedAttendance,
        message: "Teacher attendance record updated successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating teacher attendance:", error);
    return apiResponse.error(error);
  }
}

export async function DELETE(req, res) {
  try {
    await connectToDB();

    const { teacherId, attendanceRecordIds } = await req.json();

    if (!teacherId || !attendanceRecordIds || !attendanceRecordIds.length) {
      return NextResponse.json(
        { message: "teacherId and attendanceRecordIds are required" },
        { status: 400 }
      );
    }

    // Use $pull operator to efficiently remove items from array
    const result = await TeacherAttendance.updateOne(
      { teacherId },
      {
        $pull: {
          attendanceRecords: {
            _id: { $in: attendanceRecordIds.map((id) => id.toString()) },
          },
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Teacher attendance record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: `Successfully deleted ${result.modifiedCount} attendance records`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting attendance records:", error);
    return apiResponse.error(error);
  }
}
