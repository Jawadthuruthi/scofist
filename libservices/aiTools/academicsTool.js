import { tool } from "ai";
import { z } from "zod";
import connectToDB from "@/lib/db";
import Mark from "@/models/Mark";
import User from "@/models/User";
import Class from "@/models/Class";
import { escapeRegex, buildNameSearchRegex } from "./utils.js";

export const academicsTool = () =>
  tool({
    description:
      "Query examination marks, report card scores, top achievers, or subject performance for students.",
    parameters: z.object({
      studentName: z.string().optional().describe("Student name to fetch exam marks for"),
      admissionNo: z.string().optional().describe("Student admission number"),
      examName: z.string().optional().describe("Exam name, e.g. 'Term 1 Exam', 'Midterm'"),
      className: z.string().optional().describe("Class ID or name, e.g. '10A'"),
      subjectName: z.string().optional().describe("Subject name, e.g. 'Mathematics'"),
      subject: z.string().optional().describe("Alternative alias for subject name"),
    }),
    execute: async ({ studentName, admissionNo, examName, className, subjectName, subject }) => {
      try {
        await connectToDB();

        const activeSubject = subjectName || subject;

        // Resolve human-readable class name to classId if provided
        let resolvedClassId = null;
        if (className) {
          const classDoc = await Class.findOne({
            $or: [
              { _id: className.trim() },
              { name: new RegExp(`^${escapeRegex(className)}$`, "i") },
            ],
          })
            .select("_id")
            .lean();
          resolvedClassId = classDoc ? classDoc._id : className.trim();
        }

        // Case 1: Specific Student Marks
        if (studentName || admissionNo) {
          const studentQuery = { roles: "Student" };
          if (admissionNo) {
            studentQuery.$or = [
              { _id: admissionNo.trim() },
              { "studentSpecificField.admissionNumber": admissionNo.trim() },
            ];
          }
          if (studentName) {
            const nameRegex = buildNameSearchRegex(studentName) || new RegExp(escapeRegex(studentName), "i");
            studentQuery.name = nameRegex;
          }

          const student = await User.findOne(studentQuery)
            .select("_id name studentSpecificField")
            .lean();

          if (!student) {
            return {
              totalExamsFound: 0,
              exams: [],
              message: `No student found matching '${studentName || admissionNo}'.`,
            };
          }

          const admNo = student.studentSpecificField?.admissionNumber || student._id;

          const markDocs = await Mark.find({
            "students.studentId": student._id,
            ...(examName ? { examName: new RegExp(escapeRegex(examName), "i") } : {}),
          })
            .limit(5)
            .maxTimeMS(2500)
            .lean();

          if (!markDocs || markDocs.length === 0) {
            return {
              student: student.name,
              admissionNo: admNo,
              message: "No exam records found on file for this student.",
            };
          }

          const reports = markDocs.map((doc) => {
            const studentEntry = doc.students.find(
              (s) => String(s.studentId) === String(student._id)
            );
            return {
              exam: doc.examName,
              subjects: (doc.subjects || []).map((sub) => {
                const rawMark = studentEntry?.marks?.[sub.name];
                return {
                  subject: sub.name,
                  markObtained: rawMark !== undefined ? rawMark : "Absent/Not Entered",
                  maxMark: sub.maxMark,
                  passMark: sub.passMark,
                };
              }),
              remark: studentEntry?.manualRemark || "None",
            };
          });

          return {
            student: student.name,
            admissionNo: admNo,
            totalExamsFound: reports.length,
            exams: reports,
          };
        }

        // Case 2: Class Exam Marks Overview
        const query = {};
        if (examName) query.examName = new RegExp(escapeRegex(examName), "i");
        if (resolvedClassId) query.classIds = resolvedClassId;

        const markDoc = await Mark.findOne(query)
          .populate("students.studentId", "name studentSpecificField")
          .maxTimeMS(2500)
          .lean();

        if (!markDoc) {
          return { message: "No matching examination record found." };
        }

        const summary = (markDoc.students || []).slice(0, 15).map((entry) => ({
          student: entry.studentId?.name || "Unknown",
          admissionNo: entry.studentId?.studentSpecificField?.admissionNumber || entry.studentId?._id || "N/A",
          marks: entry.marks,
          remark: entry.manualRemark,
        }));

        return {
          exam: markDoc.examName,
          totalSubjects: markDoc.subjects?.length || 0,
          subjectsList: (markDoc.subjects || []).map((s) => s.name),
          sampleStudentMarks: summary,
        };
      } catch (error) {
        console.error("Academics tool execution error:", error);
        return {
          message: `Unable to query exam records: ${error.message}`,
        };
      }
    },
  });
