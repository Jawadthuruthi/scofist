import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import StudentAttendance from "@/models/StudentAttendance";
import User from "@/models/User";
import Class from "@/models/Class";
import Subject from "@/models/Subject";
import LeaveRecord from "@/models/LeaveRecord";
import Batch from "@/models/Batch";
import { NextResponse } from "next/server";
import { sortClasses } from "@/lib/utils";
import { isStudentActiveInPeriod } from "@/lib/studentUtils";

export async function GET(req, res) {
  try {
    await connectToDB();

    // Parse URL to get search params
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "0");
    const limit = parseInt(url.searchParams.get("limit")) || Infinity;

    // Build filter object from query parameters
    const filterParams = {};
    for (const [key, value] of url.searchParams.entries()) {
      // Skip pagination, limit, projection, and control flags
      if (!["page", "limit", "projection", "toppersOnly", "name"].includes(key)) {
        filterParams[key] = value;
      }
    }

    const isToppersOnly = url.searchParams.get("toppersOnly") === "true";
    const nameFilter = url.searchParams.get("name");

    // Get projection param
    const projectionParam = url.searchParams.get("projection");
    let projections = {};

    // Convert projection param to MongoDB projection object
    if (projectionParam) {
      const fields = projectionParam.split(",");
      fields.forEach((field) => {
        projections[field] = 1; // Include each field
      });
    }

    // Handle date filtering first to provide period context for student activity evaluation
    let dateFilter = null;
    if (filterParams.date) {
      // Convert string date to Date object for exact date match
      const exactDate = new Date(filterParams.date);
      const startOfDay = new Date(exactDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(exactDate);
      endOfDay.setHours(23, 59, 59, 999);

      dateFilter = {
        start: startOfDay,
        end: endOfDay,
      };
    } else if (filterParams.startDate || filterParams.endDate) {
      dateFilter = {};

      if (filterParams.startDate) {
        const startDate = new Date(filterParams.startDate);
        startDate.setHours(0, 0, 0, 0);
        dateFilter.start = startDate;
      }

      if (filterParams.endDate) {
        const endDate = new Date(filterParams.endDate);
        endDate.setHours(23, 59, 59, 999);
        dateFilter.end = endDate;
      }
    }

    const periodStart = dateFilter?.start || null;
    const periodEnd = dateFilter?.end || null;

    // Load batch map for verifying batch start/end timeline
    const allBatches = await Batch.find({}, "_id startYear endYear status").lean();
    const batchMap = {};
    allBatches.forEach(b => {
      batchMap[b._id.toString()] = b;
    });

    // Build MongoDB query for the student document level
    const documentQuery = {};
    if (filterParams.studentId) {
      documentQuery.studentId = filterParams.studentId;
    } else if (nameFilter) {
      // Search for students by name
      const matchingStudents = await User.find({
        name: { $regex: nameFilter, $options: "i" },
        roles: "Student"
      }, { _id: 1 }).lean();

      if (matchingStudents.length > 0) {
        documentQuery.studentId = { $in: matchingStudents.map(m => m._id.toString()) };
      } else {
        // If name search is active but no students found, force empty result
        documentQuery.studentId = "NULL_USER_ID";
      }
    }

    // Handle batch and class filters at the student document level
    if (filterParams.classId || filterParams.batchId) {
      const userQuery = { roles: "Student" };

      if (filterParams.classId) {
        const classIds = filterParams.classId.split(',').map(s => s.trim());
        userQuery.$or = [
          { "studentSpecificField.classId": { $in: classIds } },
          {
            "studentSpecificField.subjectTypeAssignments": {
              $in: classIds.flatMap(id => [`${id}:CORE`, `${id}:MAJOR`])
            }
          }
        ];
      }

      if (filterParams.batchId) {
        const batchIds = filterParams.batchId.split(',').map(s => s.trim());
        userQuery["studentSpecificField.batchId"] = { $in: batchIds };
      }

      const matchingUsers = await User.find(userQuery, { _id: 1, studentSpecificField: 1 }).lean();
      // Filter students who were active during the selected period (not just current status)
      const activeMatchingUsers = matchingUsers.filter(u =>
        isStudentActiveInPeriod(u, periodStart, periodEnd, batchMap)
      );
      const matchedIds = activeMatchingUsers.map(m => m._id.toString());

      if (matchedIds.length > 0) {
        if (documentQuery.studentId) {
          if (documentQuery.studentId.$in) {
            documentQuery.studentId.$in = documentQuery.studentId.$in.filter(id => matchedIds.includes(id));
            if (documentQuery.studentId.$in.length === 0) documentQuery.studentId = "NULL_USER_ID";
          } else {
            if (!matchedIds.includes(documentQuery.studentId)) {
              documentQuery.studentId = "NULL_USER_ID";
            }
          }
        } else {
          documentQuery.studentId = { $in: matchedIds };
        }
      } else {
        documentQuery.studentId = "NULL_USER_ID";
      }
    } else if (dateFilter || isToppersOnly) {
      // When dateFilter is present or toppersOnly is requested, filter by active students of the selected period (excluding dropped out students)
      const allStudents = await User.find({ roles: "Student" }, { _id: 1, studentSpecificField: 1 }).lean();
      const activeMatchingUsers = allStudents.filter(u =>
        isStudentActiveInPeriod(u, periodStart, periodEnd, batchMap)
      );
      const matchedIds = activeMatchingUsers.map(m => m._id.toString());

      if (matchedIds.length > 0) {
        if (documentQuery.studentId) {
          if (documentQuery.studentId.$in) {
            documentQuery.studentId.$in = documentQuery.studentId.$in.filter(id => matchedIds.includes(id));
            if (documentQuery.studentId.$in.length === 0) documentQuery.studentId = "NULL_USER_ID";
          } else {
            if (!matchedIds.includes(documentQuery.studentId)) {
              documentQuery.studentId = "NULL_USER_ID";
            }
          }
        } else {
          documentQuery.studentId = { $in: matchedIds };
        }
      } else {
        documentQuery.studentId = "NULL_USER_ID";
      }
    }

    // Store record-level filters separately - these will be used later for filtering the records array
    const recordFilters = {};
    if (filterParams.classId) {
      recordFilters.classId = filterParams.classId;
    }
    if (filterParams.batchId) {
      recordFilters.batchId = filterParams.batchId;
    }
    if (filterParams.subjectId) {
      recordFilters.subjectId = filterParams.subjectId;
    }

    console.log("Filters:", { documentQuery, recordFilters, dateFilter });

    // Fetch all classes to determine core/major subjects for filtering
    const allClasses = await Class.find({}, "name coreSubjects majorSubjects").lean();
    const classSubjectMap = {};
    allClasses.forEach(c => {
      classSubjectMap[c._id] = {
        core: (c.coreSubjects || []).map(s => s.toString()),
        major: (c.majorSubjects || []).map(s => s.toString())
      };
    });

    // Build a pre-match for the date range at the document level.
    // MongoDB can use the index on attendanceRecords.date to prune documents
    // before the more expensive per-record $filter runs.
    const datePreMatch = {};
    if (dateFilter?.start || dateFilter?.end) {
      datePreMatch["attendanceRecords.date"] = {
        ...(dateFilter.start ? { $gte: dateFilter.start } : {}),
        ...(dateFilter.end ? { $lte: dateFilter.end } : {}),
      };
    }

    // Combined document-level match: studentId filter + date pre-filter
    const fullDocumentQuery = { ...documentQuery, ...datePreMatch };

    // Aggregation pipeline — date pre-filter applied in first $match so index is used
    const pipeline = [
      { $match: fullDocumentQuery },

      // Fine-grained per-record filter
      {
        $addFields: {
          attendanceRecords: {
            $filter: {
              input: "$attendanceRecords",
              as: "record",
              cond: {
                $and: [
                  // Filter by class if specified
                  ...(recordFilters.classId
                    ? [{ $in: [{ $toString: "$$record.classId" }, recordFilters.classId.split(',').map(s => s.trim())] }]
                    : []),

                  // Filter by batch if specified
                  ...(recordFilters.batchId
                    ? [{
                      $or: [
                        { $in: [{ $toString: "$$record.batchId" }, recordFilters.batchId.split(',').map(s => s.trim())] },
                        { $eq: [{ $toString: "$$record.batchId" }, "[object Object]"] }
                      ]
                    }]
                    : []),

                  // Filter by subject if specified
                  ...(recordFilters.subjectId
                    ? [{ $in: [{ $toString: "$$record.subjectId" }, recordFilters.subjectId.split(',').map(s => s.trim())] }]
                    : []),

                  // Date filtering
                  ...(dateFilter?.start ? [{ $gte: ["$$record.date", dateFilter.start] }] : []),
                  ...(dateFilter?.end ? [{ $lte: ["$$record.date", dateFilter.end] }] : []),
                ],
              },
            },
          },
        },
      },

      // Only keep documents that have at least one matching record
      { $match: { "attendanceRecords.0": { $exists: true } } },
    ];

    if (!isToppersOnly) {
      if (documentQuery.studentId && documentQuery.studentId === "NULL_USER_ID") {
        return NextResponse.json({
          studentAttendances: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
          message: "No students found"
        }, { status: 200 });
      }

      // Fetch all matched documents, sort in memory by class and admission number, then paginate.
      const attendances = await StudentAttendance.aggregate(pipeline).exec();
      const total = attendances.length;

      const userIds = attendances.map(a => a.studentId);

      // Fetch users with classId, admissionNumber and status for sorting & status awareness
      const [users, allSubjectsList, allTeachersList] = await Promise.all([
        User.find({ _id: { $in: userIds } }, "_id name studentSpecificField.classId studentSpecificField.admissionNumber studentSpecificField.status").lean(),
        Subject.find({}, "_id name").lean(),
        User.find({ roles: "Teacher" }, "_id name").lean(),
      ]);

      const userMap = new Map(users.map(u => [u._id.toString(), u]));
      // Build class name map from the allClasses already fetched at the top of this handler
      const allClassesMap = new Map(allClasses.map(c => [c._id.toString(), c.name]));
      const allSubjectsMap = new Map(allSubjectsList.map(s => [s._id.toString(), s.name]));
      const allTeachersMap = new Map(allTeachersList.map(t => [t._id.toString(), t.name]));

      // Fetch LeaveRecords for these students to attach leave reasons
      const leaveRecordsList = await LeaveRecord.find({
        studentId: { $in: userIds }
      }).lean();

      let formattedStudentAttendances = attendances.map(doc => {
        let records = doc.attendanceRecords || [];

        // Filter for CORE and MAJOR subjects if they are defined
        records = records.filter(r => {
          const cId = r.classId?.toString();
          const sId = r.subjectId?.toString();
          const subjects = classSubjectMap[cId];
          if (!subjects) return false;
          if (subjects.core.length === 0 && subjects.major.length === 0) return true;
          return subjects.core.includes(sId) || subjects.major.includes(sId);
        });

        const studentLeaves = leaveRecordsList.filter(lr => lr.studentId?.toString() === doc.studentId.toString());
        const uInfo = userMap.get(doc.studentId.toString());
        const studentClassId = uInfo?.studentSpecificField?.classId?.toString();
        const studentClassName = allClassesMap.get(studentClassId) || "Unknown";

        return {
          _id: doc.studentId,
          name: uInfo?.name || "Unknown Student",
          status: uInfo?.studentSpecificField?.status || "",
          classId: studentClassId,
          className: studentClassName,
          attendanceRecords: records.map(r => {
            const classIdStr = r.classId?.toString();
            const subjectIdStr = r.subjectId?.toString();
            const teacherIdStr = r.teacherId?.toString();

            let finalLeaveReason = r.leaveReason;
            if (!finalLeaveReason && (r.present === false || r.present === null)) {
              const rDate = new Date(r.date);
              rDate.setUTCHours(0, 0, 0, 0);
              const matchedLeave = studentLeaves.find(lr => {
                const start = new Date(lr.dateOfLeave);
                start.setUTCHours(0, 0, 0, 0);
                const end = new Date(lr.arrivedDate || lr.dateOfArrival);
                end.setUTCHours(23, 59, 59, 999);
                return rDate >= start && rDate <= end;
              });
              if (matchedLeave) {
                finalLeaveReason = matchedLeave.leaveReason;
              }
            }

            return {
              date: r.date,
              present: r.present ?? false,
              periodNumber: r.periodNumber,
              classId: classIdStr,
              className: allClassesMap.get(classIdStr) || studentClassName || "Unknown",
              subjectId: subjectIdStr,
              subjectName: allSubjectsMap.get(subjectIdStr) || "Unknown",
              teacherId: teacherIdStr,
              teacherName: allTeachersMap.get(teacherIdStr) || "N/A",
              leaveReason: finalLeaveReason || null
            };
          }).sort((a, b) => {
            const timeA = a.date ? new Date(a.date).getTime() : 0;
            const timeB = b.date ? new Date(b.date).getTime() : 0;
            if (timeA !== timeB) return timeA - timeB;
            return (Number(a.periodNumber) || 0) - (Number(b.periodNumber) || 0);
          })
        };
      });

      // Sort by Class Order and Admission Number
      formattedStudentAttendances.sort((a, b) => {
        const uA = userMap.get(a._id.toString());
        const uB = userMap.get(b._id.toString());

        const classIdA = uA?.studentSpecificField?.classId?.toString();
        const classIdB = uB?.studentSpecificField?.classId?.toString();

        const classA = allClassesMap.get(classIdA);
        const classB = allClassesMap.get(classIdB);

        const cA = { name: classA || "", originalName: classA || "" };
        const cB = { name: classB || "", originalName: classB || "" };

        const classCmp = sortClasses(cA, cB);
        if (classCmp !== 0) return classCmp;

        // If in same class, sort by admission number
        const admA = parseInt(uA?.studentSpecificField?.admissionNumber) || Infinity;
        const admB = parseInt(uB?.studentSpecificField?.admissionNumber) || Infinity;
        return admA - admB;
      });

      const paginatedStudentAttendances = limit === Infinity
        ? formattedStudentAttendances
        : formattedStudentAttendances.slice(page * limit, (page + 1) * limit);

      return NextResponse.json({
        studentAttendances: paginatedStudentAttendances,
        pagination: {
          page,
          limit,
          total,
          totalPages: limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
        },
        message: "Student attendance records fetched successfully"
      }, { status: 200 });
    }

    // If toppersOnly is true, calculate percentage and get the top student per class
    pipeline.push(
      { $unwind: "$attendanceRecords" },
      // Lookup student to match their enrolled class (ensures only enrolled students compete for that class's topper)
      {
        $lookup: {
          from: "users",
          localField: "studentId",
          foreignField: "_id",
          as: "studentDoc"
        }
      },
      { $unwind: "$studentDoc" },
      // Toppers of a class must be students whose primary enrolled class is that class
      {
        $match: {
          $expr: {
            $eq: ["$attendanceRecords.classId", "$studentDoc.studentSpecificField.classId"]
          }
        }
      },
      // Filter for CORE and MAJOR subjects in aggregation
      {
        $lookup: {
          from: "classes",
          localField: "attendanceRecords.classId",
          foreignField: "_id",
          as: "recordClassDetails"
        }
      },
      { $unwind: "$recordClassDetails" },
      {
        $match: {
          $expr: {
            $or: [
              { $in: ["$attendanceRecords.subjectId", "$recordClassDetails.coreSubjects"] },
              { $in: ["$attendanceRecords.subjectId", "$recordClassDetails.majorSubjects"] },
              // If both are empty, allow all records for this class
              {
                $and: [
                  { $eq: [{ $size: { $ifNull: ["$recordClassDetails.coreSubjects", []] } }, 0] },
                  { $eq: [{ $size: { $ifNull: ["$recordClassDetails.majorSubjects", []] } }, 0] }
                ]
              }
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            classId: "$attendanceRecords.classId",
            studentId: "$studentId"
          },
          totalClasses: { $sum: 1 },
          presentClasses: {
            $sum: { $cond: [{ $eq: ["$attendanceRecords.present", true] }, 1, 0] }
          },
          records: { $push: "$attendanceRecords" }
        }
      },
      {
        $addFields: {
          percentage: {
            $round: [
              { $multiply: [{ $divide: ["$presentClasses", "$totalClasses"] }, 100] },
              1
            ]
          }
        }
      },
      // Group by class to find the max percentage and collect students to preserve ties
      {
        $group: {
          _id: "$_id.classId",
          maxPercentage: { $max: "$percentage" },
          allStudents: {
            $push: {
              studentId: "$_id.studentId",
              percentage: "$percentage",
              records: "$records"
            }
          }
        }
      },
      { $unwind: "$allStudents" },
      {
        $match: {
          $expr: {
            $and: [
              { $eq: ["$allStudents.percentage", "$maxPercentage"] },
              { $gt: ["$maxPercentage", 0] }
            ]
          }
        }
      },
      {
        $project: {
          _id: 0,
          classId: "$_id",
          studentId: "$allStudents.studentId",
          attendanceRecords: "$allStudents.records",
          percentage: "$allStudents.percentage"
        }
      }
    );

    // Now add $lookups to populate names (shared by both flows)
    pipeline.push(
      // Student Name
      {
        $lookup: {
          from: "users",
          localField: "studentId",
          foreignField: "_id",
          as: "studentInfo"
        }
      },
      { $unwind: { path: "$studentInfo", preserveNullAndEmptyArrays: true } },

      // Topper Class Info
      {
        $lookup: {
          from: "classes",
          localField: "classId",
          foreignField: "_id",
          as: "topperClassInfo"
        }
      },
      { $unwind: { path: "$topperClassInfo", preserveNullAndEmptyArrays: true } },

      // Unwind attendanceRecords to populate each one
      { $unwind: { path: "$attendanceRecords", preserveNullAndEmptyArrays: true } },

      // Subject Name for records
      {
        $lookup: {
          from: "subjects",
          localField: "attendanceRecords.subjectId",
          foreignField: "_id",
          as: "subjectInfo"
        }
      },
      { $unwind: { path: "$subjectInfo", preserveNullAndEmptyArrays: true } },

      // Teacher Name for records
      {
        $lookup: {
          from: "users",
          localField: "attendanceRecords.teacherId",
          foreignField: "_id",
          as: "teacherInfo"
        }
      },
      { $unwind: { path: "$teacherInfo", preserveNullAndEmptyArrays: true } },

      // Group back by student AND class
      {
        $group: {
          _id: {
            studentId: "$studentId",
            classId: "$classId"
          },
          studentName: { $first: "$studentInfo.name" },
          className: { $first: "$topperClassInfo.name" },
          percentage: { $first: "$percentage" }, // For toppers flow
          studentStatus: { $first: "$studentInfo.studentSpecificField.status" },
          attendanceRecords: {
            $push: {
              date: "$attendanceRecords.date",
              present: "$attendanceRecords.present",
              periodNumber: "$attendanceRecords.periodNumber",
              classId: "$topperClassInfo._id",
              className: "$topperClassInfo.name",
              subjectId: "$attendanceRecords.subjectId",
              subjectName: "$subjectInfo.name",
              teacherId: "$attendanceRecords.teacherId",
              teacherName: "$teacherInfo.name",
              leaveReason: "$attendanceRecords.leaveReason"
            }
          }
        }
      }
    );

    // Execute the final aggregation pipeline
    const results = await StudentAttendance.aggregate(pipeline).exec();

    // Fetch LeaveRecords for these students to attach leave reasons
    const studentIdsToFetchLeaves = results.map(r => (r._id?.studentId || r._id).toString());
    let leaveRecordsList = [];
    if (studentIdsToFetchLeaves.length > 0) {
      leaveRecordsList = await LeaveRecord.find({
        studentId: { $in: studentIdsToFetchLeaves }
      }).lean();
    }

    // Format final results
    const formattedStudentAttendances = results.map((record) => {
      const studentId = record._id?.studentId || record._id;
      const classId = record._id?.classId || record.classId;
      const studentLeaves = leaveRecordsList.filter(lr => lr.studentId?.toString() === studentId.toString());

      return {
        _id: studentId,
        name: record.studentName || "Unknown Student",
        classId: classId,
        className: record.className || "Unknown Class",
        percentage: record.percentage,
        status: record.studentStatus || "",
        attendanceRecords: (record.attendanceRecords || []).map(item => {
          let finalLeaveReason = item.leaveReason;
          if (!finalLeaveReason && (item.present === false || item.present === null)) {
            const rDate = new Date(item.date);
            rDate.setUTCHours(0, 0, 0, 0);
            const matchedLeave = studentLeaves.find(lr => {
              const start = new Date(lr.dateOfLeave);
              start.setUTCHours(0, 0, 0, 0);
              const end = new Date(lr.arrivedDate || lr.dateOfArrival);
              end.setUTCHours(23, 59, 59, 999);
              return rDate >= start && rDate <= end;
            });
            if (matchedLeave) {
              finalLeaveReason = matchedLeave.leaveReason;
            }
          }

          return {
            ...item,
            teacherName: item.teacherName || "N/A",
            leaveReason: finalLeaveReason || null
          };
        }).sort((a, b) => {
          const timeA = a.date ? new Date(a.date).getTime() : 0;
          const timeB = b.date ? new Date(b.date).getTime() : 0;
          if (timeA !== timeB) return timeA - timeB;
          return (Number(a.periodNumber) || 0) - (Number(b.periodNumber) || 0);
        })
      };
    });

    // Sort toppers by Class Order and Student ID
    formattedStudentAttendances.sort((a, b) => {
      const classCmp = sortClasses({ name: a.className }, { name: b.className });
      if (classCmp !== 0) return classCmp;
      return String(a._id).localeCompare(String(b._id), undefined, { numeric: true });
    });

    // Get total count more efficiently (same documentQuery logic)
    const countPipeline = [
      { $match: documentQuery },
      {
        $addFields: {
          filtered: {
            $filter: {
              input: "$attendanceRecords",
              as: "record",
              cond: {
                $and: [
                  ...(recordFilters.classId ? [{ $eq: [{ $toString: "$$record.classId" }, recordFilters.classId] }] : []),
                  ...(recordFilters.batchId ? [{ $eq: [{ $toString: "$$record.batchId" }, recordFilters.batchId] }] : []),
                  ...(recordFilters.subjectId ? [{ $eq: [{ $toString: "$$record.subjectId" }, recordFilters.subjectId] }] : []),
                  ...(dateFilter?.start ? [{ $gte: ["$$record.date", dateFilter.start] }] : []),
                  ...(dateFilter?.end ? [{ $lte: ["$$record.date", dateFilter.end] }] : []),
                ],
              },
            },
          },
        },
      },
      { $match: { "filtered.0": { $exists: true } } },
      { $count: "total" },
    ];

    const countResult = await StudentAttendance.aggregate(countPipeline).exec();
    const total = countResult.length > 0 ? countResult[0].total : 0;

    return NextResponse.json(
      {
        studentAttendances: formattedStudentAttendances,
        pagination: {
          page,
          limit,
          total,
          totalPages: limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
        },
        message: "Student attendance records fetched successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Student attendance fetch error:", error);
    return apiResponse.error(error);
  }
}
