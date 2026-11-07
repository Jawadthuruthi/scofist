import { tool } from "ai";
import { z } from "zod";
import connectToDB from "@/lib/db";
import User from "@/models/User";
import Batch from "@/models/Batch";
import Class from "@/models/Class";
import { escapeRegex, buildNameSearchRegex } from "./utils.js";

export const directoryTool = () =>
  tool({
    description:
      "Search the institutional directory for students, teachers, staff, and leadership (including the school Principal and College Admins). Retrieve admission numbers, contact details, parent/guardian info, batches, classes, and roles.",
    parameters: z.object({
      query: z
        .string()
        .optional()
        .describe("General search term, name, admission number, or designation (e.g. 'Mohammed Jawad', 'Principal', '530')"),
      name: z.string().optional().describe("Student or teacher full or partial name (e.g. 'Mohammed Jawad', 'Shareef')"),
      role: z
        .string()
        .optional()
        .describe("Role or designation filter (e.g. 'Student', 'Teacher', 'College Admin', 'Principal', 'Librarian')"),
      isPrincipal: z
        .boolean()
        .optional()
        .describe("Set to true if specifically querying the school Principal / Headmaster"),
      admissionNo: z.string().optional().describe("Student admission number or ID, e.g. '530'"),
      className: z.string().optional().describe("Class name or ID, e.g. '10A'"),
      batchName: z.string().optional().describe("Batch name, e.g. '2024' or 'FORTUNE'"),
    }),
    execute: async ({ query, name, role, isPrincipal, admissionNo, className, batchName }) => {
      try {
        await connectToDB();

        const queryObj = {};

        // 1. Leadership / Principal Check
        const isPrincipalQuery =
          isPrincipal ||
          role === "Principal" ||
          (query && /principal|headmaster/i.test(query)) ||
          (name && /principal|headmaster/i.test(name));

        if (isPrincipalQuery) {
          const leaders = await User.find({
            $or: [
              { "teacherSpecificField.status": "Principal" },
              { roles: "College Admin" },
            ],
          })
            .select("name roles email contactNumber teacherSpecificField address")
            .limit(10)
            .maxTimeMS(2500)
            .lean();

          if (!leaders || leaders.length === 0) {
            return {
              count: 0,
              results: [],
              message: "No Principal or College Administrator records found.",
            };
          }

          // Sort principal first
          leaders.sort((a, b) => {
            if (a.teacherSpecificField?.status === "Principal") return -1;
            if (b.teacherSpecificField?.status === "Principal") return 1;
            return 0;
          });

          return {
            count: leaders.length,
            message: "Retrieved school leadership records.",
            results: leaders.map((u) => ({
              id: u._id,
              name: u.name,
              roles: Array.isArray(u.roles) ? u.roles.join(", ") : u.roles,
              designation:
                u.teacherSpecificField?.status === "Principal"
                  ? "Principal"
                  : u.roles?.includes("College Admin")
                  ? "College Admin"
                  : "Teacher",
              status: u.teacherSpecificField?.status || "Active",
              contactNumber: u.contactNumber || "N/A",
              email: u.email || "N/A",
              dateOfJoining: u.teacherSpecificField?.dateOfJoining
                ? new Date(u.teacherSpecificField.dateOfJoining).toISOString().split("T")[0]
                : "N/A",
              address: u.address
                ? [u.address.houseName, u.address.place, u.address.district, u.address.state]
                    .filter(Boolean)
                    .join(", ")
                : "N/A",
            })),
          };
        }

        // 2. Specific Role Filter
        if (role && !isPrincipalQuery) {
          const lowerRole = role.toLowerCase().trim();
          if (lowerRole.includes("teach") || lowerRole.includes("facult")) {
            queryObj.roles = "Teacher";
          } else if (lowerRole.includes("stud")) {
            queryObj.roles = "Student";
          } else if (lowerRole.includes("admin")) {
            queryObj.roles = "College Admin";
          } else if (lowerRole.includes("librar")) {
            queryObj.roles = "Librarian";
          } else {
            queryObj.roles = new RegExp(escapeRegex(role), "i");
          }
        }

        // 3. Admission Number or ID Filter
        const targetId = (admissionNo || (query && /^\d+$/.test(query.trim()) ? query.trim() : null));
        if (targetId) {
          queryObj.$or = [
            { _id: targetId },
            { "studentSpecificField.admissionNumber": targetId },
          ];
        }

        // Clean out filler words to see if search term is asking for a cohort/class/batch
        const rawSearch = (className || batchName || name || query || "").trim();
        const cleanedCohort = rawSearch
          .replace(/^(list\s+of\s+|show\s+|find\s+|get\s+|all\s+|details\s+of\s+)/i, "")
          .replace(/\s+(students|student|members|boys|batch|class)$/i, "")
          .trim();

        // 4. Batch Filter (or match from search term)
        const targetBatch = batchName || (cleanedCohort.length >= 2 ? cleanedCohort : null);
        let matchedBatch = false;
        if (targetBatch) {
          const batchDoc = await Batch.findOne({
            $or: [
              { _id: targetBatch },
              { name: new RegExp(`^${escapeRegex(targetBatch)}$`, "i") },
              { name: new RegExp(escapeRegex(targetBatch), "i") },
            ],
          })
            .select("_id name")
            .lean();
          if (batchDoc) {
            queryObj["studentSpecificField.batchId"] = batchDoc._id;
            matchedBatch = true;
          }
        }

        // 5. Class Filter (or match from search term)
        const targetClass = className || (cleanedCohort.length >= 2 ? cleanedCohort : null);
        let matchedClass = false;
        if (targetClass) {
          const classDoc = await Class.findOne({
            $or: [
              { _id: targetClass },
              { name: new RegExp(`^${escapeRegex(targetClass)}$`, "i") },
              { name: new RegExp(escapeRegex(targetClass), "i") },
            ],
          })
            .select("_id name")
            .lean();
          if (classDoc) {
            queryObj.$or = [
              { "studentSpecificField.classId": classDoc._id },
              { "studentSpecificField.admissionClassId": classDoc._id },
            ];
            matchedClass = true;
          }
        }

        // 6. Name / Text Search ONLY IF it didn't match a class or batch
        if (!matchedClass && !matchedBatch) {
          const searchTerm = name || (query && !targetId ? query : null);
          if (searchTerm) {
            const cleanedPerson = searchTerm
              .replace(/^(details\s+of\s+|info\s+of\s+|about\s+|who\s+is\s+|profile\s+of\s+)/i, "")
              .trim();
            const nameRegex = buildNameSearchRegex(cleanedPerson);
            if (nameRegex) {
              if (queryObj.$or) {
                queryObj.$or.push({ name: nameRegex });
              } else {
                queryObj.name = nameRegex;
              }
            }
          }
        }

        // 7. Fallback if completely empty query: list top active records
        const hasFilters = Object.keys(queryObj).length > 0;
        if (!hasFilters) {
          queryObj.roles = "Student";
        }

        // 8. Execute query with correct population paths (parallelized with total count)
        const [users, totalCount] = await Promise.all([
          User.find(queryObj)
            .select(
              "name roles email contactNumber alternativeNumber address studentSpecificField teacherSpecificField"
            )
            .populate("studentSpecificField.batchId", "name")
            .populate("studentSpecificField.classId", "name")
            .limit(25)
            .maxTimeMS(2500)
            .lean(),
          User.countDocuments(queryObj),
        ]);

        if (!users || users.length === 0) {
          return {
            count: 0,
            results: [],
            message: `No directory records found matching '${searchTerm || role || targetId || "criteria"}'.`,
          };
        }

        return {
          totalCount,
          count: users.length,
          results: users.map((u) => {
            const isStudent =
              Array.isArray(u.roles) ? u.roles.includes("Student") : u.roles === "Student";
            const isTeacher =
              Array.isArray(u.roles) ? u.roles.includes("Teacher") : u.roles === "Teacher";
            const isPrincipal = u.teacherSpecificField?.status === "Principal";

            const sf = u.studentSpecificField || {};
            const tf = u.teacherSpecificField || {};

            return {
              id: u._id,
              name: u.name,
              roles: Array.isArray(u.roles) ? u.roles.join(", ") : u.roles || "User",
              designation: isPrincipal
                ? "Principal"
                : isTeacher
                ? `Teacher (${tf.status || "Active"})`
                : isStudent
                ? `Student (${sf.status || "Active"})`
                : "Staff",
              admissionNo: sf.admissionNumber || (isStudent ? u._id : "N/A"),
              class: sf.classId?.name || sf.classId || "N/A",
              batch: sf.batchId?.name || sf.batchId || "N/A",
              status: sf.status || tf.status || "Active",
              contactNumber: u.contactNumber || "N/A",
              email: u.email || "N/A",
              bloodGroup: sf.bloodGroup || "N/A",
              guardianName: sf.guardianName || "N/A",
              guardianContact: sf.guardianContactNumber || "N/A",
              guardianAlternative: sf.guardianAlternativeNumber || "N/A",
              address: u.address
                ? [u.address.houseName, u.address.place, u.address.district, u.address.state, u.address.pin]
                    .filter(Boolean)
                    .join(", ")
                : "N/A",
              family: (sf.familyDetails || []).map((f) => ({
                relation: f.position,
                name: f.name,
                phone: f.mobileNumber || "N/A",
                education: f.education || "N/A",
              })),
            };
          }),
        };
      } catch (error) {
        console.error("Directory lookup execution error:", error);
        return {
          count: 0,
          results: [],
          message: `Unable to query directory at this time: ${error.message}`,
        };
      }
    },
  });
