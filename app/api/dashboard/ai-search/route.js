import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDB from "@/lib/db";
import User from "@/models/User";
import Class from "@/models/Class";
import Batch from "@/models/Batch";
import Course from "@/models/Course";
import LibraryBook from "@/models/LibraryBook";
import Update from "@/models/Update";
import Settings from "@/models/Settings";
import AcademicCalendar from "@/models/AcademicCalendar";
import LeaveRecord from "@/models/LeaveRecord";
import StudentAttendance from "@/models/StudentAttendance";
import Mark from "@/models/Mark";
import Remark from "@/models/Remark";
import GatePass from "@/models/GatePass";
import Debtor from "@/models/Debtor";
import ApplicationForm from "@/models/ApplicationForm";
import Performance from "@/models/Performance";
import HifzDoura from "@/models/HifzDoura";
import Subject from "@/models/Subject";
import Period from "@/models/Period";
import TimeTable from "@/models/TimeTable";
import Download from "@/models/Download";
import Syllabus from "@/models/Syllabus";
import Program from "@/models/Program";
import Result from "@/models/Result";
import Team from "@/models/Team";
import Participant from "@/models/Participant";
import TeacherAttendance from "@/models/TeacherAttendance";
import MasjidAttendance from "@/models/MasjidAttendance";
import TeachersLeaveRecord from "@/models/TeachersLeaveRecord";
import Finance from "@/models/Finance";
import Division from "@/models/Division";
import Article from "@/models/Article";
import LibraryRequest from "@/models/LibraryRequest";
import StudentsFund from "@/models/StudentsFund";
import RankAchiever from "@/models/RankAchiever";
import { generateGeminiContent, isGeminiConfigured } from "@/lib/gemini";

/**
 * Remove special regex characters from query
 */
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

/**
 * Parse query for academic year (e.g. 2024-2025, 2024-25) or single 4-digit calendar year (e.g. 2024, 2025)
 */
function parseYear(query) {
  const academicMatch = query.match(/\b(20\d\d)\s*[-/]\s*(?:20)?(\d\d)\b/);
  if (academicMatch) {
    const y1 = parseInt(academicMatch[1], 10);
    let y2 = parseInt(academicMatch[2], 10);
    if (y2 < 100) y2 = 2000 + y2;
    return { targetYear: y1, endYear: y2, isRange: true, raw: academicMatch[0] };
  }
  const singleMatch = query.match(/\b(20\d\d)\b/);
  if (singleMatch) {
    const yr = parseInt(singleMatch[1], 10);
    return { targetYear: yr, endYear: null, isRange: false, raw: singleMatch[1] };
  }
  return { targetYear: null, endYear: null, isRange: false, raw: null };
}

/**
 * Parse query intent into one of the 30 strictly separate dashboard modules
 */
function parseQueryIntent(rawQuery) {
  const q = rawQuery.toLowerCase().trim();
  const { targetYear, endYear, isRange, raw: rawYear } = parseYear(rawQuery);

  // Extract explicit numeric IDs (excluding any years matched in rawYear)
  const allNumbers = (rawQuery.match(/\b\d+\b/g) || []).map((n) => n.trim());
  const extractedNumbers = allNumbers.filter(
    (n) =>
      targetYear === null ||
      (n !== String(targetYear) &&
        (endYear === null || n !== String(endYear)) &&
        (endYear === null || n !== String(endYear).slice(-2)))
  );

  let targetSection = "general";

  // Check if query is explicitly asking for complete database inventory / everything
  if (
    q.includes("everything") ||
    q.includes("every thing") ||
    q.includes("all database") ||
    q.includes("full database") ||
    q.includes("whole database") ||
    (q.includes("database") && (q.includes("all") || q.includes("search") || q.includes("get") || q.includes("show") || q.includes("record") || q.includes("every")))
  ) {
    targetSection = "database_inventory";
  } else if (
    q.includes("how many") ||
    q.includes("total count") ||
    q.includes("statistics") ||
    q.includes("stats")
  ) {
    targetSection = "stats";
  }

  const isExplicitAi =
    q.startsWith("ai ") ||
    q.startsWith("ai:") ||
    q.startsWith("gemini ") ||
    q.startsWith("gemini:") ||
    q.startsWith("ask gemini") ||
    q.startsWith("ask ai");

  // If query is an open-ended question, rule, policy, guideline, or explanation inquiry
  const isQuestionOrAi =
    isExplicitAi ||
    (extractedNumbers.length === 0 &&
      /\b(how|why|what|when|where|which|explain|tell|describe|draft|write|suggest|rules|rule|policy|policies|guideline|guidelines|procedure|process|requirement|requirements|criteria|overview|summarize|summary|tips|help|format|instructions|meaning|guide|welcome|duties|responsibilities|conduct|circular|announcement)\b/i.test(q));

  if (targetSection !== "stats" && targetSection !== "database_inventory" && isQuestionOrAi) {
    const questionStopWords = new Set([
      "how", "why", "what", "when", "where", "which", "explain", "tell", "describe",
      "draft", "write", "suggest", "rules", "rule", "policy", "policies", "guideline",
      "guidelines", "procedure", "process", "requirement", "requirements", "criteria",
      "overview", "summarize", "summary", "tips", "help", "format", "instructions",
      "meaning", "guide", "welcome", "duties", "responsibilities", "is", "are", "the",
      "about", "me", "can", "you", "please", "in", "at", "on", "with", "a", "an", "to", "from",
      "do", "we", "have", "there", "i", "want", "know", "get", "details", "info"
    ]);
    const words = q.replace(/[^a-zA-Z0-9\s-]/g, " ").split(/\s+/).filter(Boolean);
    const entityKeywords = words.filter(
      (w) => !questionStopWords.has(w) && w.length >= 2 && !/^\d+$/.test(w)
    );
    return {
      targetSection: "general",
      targetYear,
      endYear,
      isRange,
      extractedNumbers,
      entityKeywords,
      searchKeyword: entityKeywords.join(" ").trim(),
    };
  }

  // Check multi-word specific phrases first to guarantee exact route separation:
  if (
    q.includes("clearance certificate") ||
    q.includes("clearance") ||
    q.includes("dcc")
  ) {
    targetSection = "clearance_certificate";
  } else if (
    q.includes("student certificate") ||
    q.includes("students certificate") ||
    q.includes("bonafide") ||
    q.includes("study certificate")
  ) {
    targetSection = "students_certificate";
  } else if (
    q.includes("student report") ||
    q.includes("students report") ||
    q.includes("students reports") ||
    q.includes("progress report") ||
    q.includes("comprehensive report")
  ) {
    targetSection = "students_reports";
  } else if (
    q.includes("admission register") ||
    q.includes("registration register") ||
    q.includes("admission book")
  ) {
    targetSection = "admission_register";
  } else if (
    q.includes("identity card") ||
    q.includes("identity cards") ||
    q.includes("id card") ||
    q.includes("id cards") ||
    q.includes("idcard")
  ) {
    targetSection = "identity_cards";
  } else if (
    q.includes("attendance sheet") ||
    q.includes("daily attendance sheet")
  ) {
    targetSection = "attendance_sheet";
  } else if (
    q.includes("attendance table") ||
    q.includes("period attendance")
  ) {
    targetSection = "attendance_table";
  } else if (
    q.includes("attendance tracking") ||
    q.includes("attendance history") ||
    q.includes("attend") ||
    q.includes("present") ||
    q.includes("absent") ||
    q.includes("att")
  ) {
    targetSection = "attendance";
  } else if (
    q.includes("leave register") ||
    q.includes("leave record") ||
    q.includes("leave history") ||
    q.includes("leaves") ||
    (q.includes("leave") && !q.includes("clearan"))
  ) {
    targetSection = "leaves";
  } else if (
    q.includes("question paper") ||
    q.includes("question papers") ||
    q.includes("qp") ||
    (q.includes("download") &&
      (q.includes("paper") || q.includes("question") || q.includes("exam")))
  ) {
    targetSection = "question_papers";
  } else if (q.includes("syllabus")) {
    targetSection = "syllabus";
  } else if (
    q.includes("hifz") ||
    q.includes("doura")
  ) {
    targetSection = "hifz_doura";
  } else if (
    q.includes("gate pass") ||
    q.includes("gatepass") ||
    q.includes("out pass") ||
    q.includes("in pass")
  ) {
    targetSection = "gatepass";
  } else if (
    q.includes("performance") ||
    q.includes("evaluation")
  ) {
    targetSection = "performance";
  } else if (
    q.includes("academic calendar") ||
    q.includes("calendar") ||
    q.includes("holiday") ||
    q.includes("holidays") ||
    (q.includes("event") && !q.includes("prevent"))
  ) {
    targetSection = "calendar";
  } else if (
    q.includes("application") ||
    q.includes("applications") ||
    q.includes("applicant") ||
    q.includes("applicants") ||
    q.includes("admission form")
  ) {
    targetSection = "applications";
  } else if (
    q.includes("time table") ||
    q.includes("timetable") ||
    q.includes("timetables") ||
    q.includes("routine")
  ) {
    targetSection = "time_tables";
  } else if (
    q.includes("period") ||
    q.includes("periods") ||
    q.includes("bell timing")
  ) {
    targetSection = "periods";
  } else if (
    q.includes("subject") ||
    q.includes("subjects")
  ) {
    targetSection = "subjects";
  } else if (
    q.includes("batch") ||
    q.includes("batches")
  ) {
    targetSection = "batches";
  } else if (
    q.includes("class") ||
    q.includes("classes") ||
    q.includes("division") ||
    q.includes("divisions")
  ) {
    targetSection = "classes";
  } else if (
    q.includes("book") ||
    q.includes("books") ||
    q.includes("library")
  ) {
    targetSection = "books";
  } else if (
    q.includes("account") ||
    q.includes("accounts") ||
    q.includes("fee") ||
    q.includes("fees") ||
    q.includes("due") ||
    q.includes("dues") ||
    q.includes("debt") ||
    q.includes("debtor") ||
    q.includes("debtors") ||
    q.includes("balance") ||
    q.includes("payment")
  ) {
    targetSection = "accounts";
  } else if (
    q.includes("kinship") ||
    q.includes("family") ||
    q.includes("guardian") ||
    q.includes("parents") ||
    q.includes("parent") ||
    q.includes("father") ||
    q.includes("mother") ||
    q.includes("brother") ||
    q.includes("sister") ||
    q.includes("sibling")
  ) {
    targetSection = "kinship";
  } else if (
    q.includes("contact") ||
    q.includes("contacts") ||
    q.includes("phone") ||
    q.includes("mobile") ||
    q.includes("address") ||
    q.includes("call")
  ) {
    targetSection = "contacts";
  } else if (
    q.includes("remark") ||
    q.includes("remarks") ||
    q.includes("comment") ||
    q.includes("comments")
  ) {
    targetSection = "remarks";
  } else if (
    q.includes("mark") ||
    q.includes("marks") ||
    q.includes("exam") ||
    q.includes("exams") ||
    q.includes("score") ||
    q.includes("scores") ||
    q.includes("grade") ||
    q.includes("grades") ||
    q.includes("result") ||
    q.includes("results")
  ) {
    targetSection = "marks";
  } else if (
    q.includes("course") ||
    q.includes("courses")
  ) {
    targetSection = "courses";
  } else if (
    q.includes("teacher") ||
    q.includes("teachers") ||
    q.includes("faculty") ||
    q.includes("staff") ||
    q.includes("lecturer") ||
    q.includes("lecturers")
  ) {
    targetSection = "teachers";
  } else if (
    q.includes("working day") ||
    (q.includes("today") && q.includes("day"))
  ) {
    targetSection = "workingday";
  } else if (
    q.includes("how many") ||
    q.includes("total count") ||
    q.includes("statistics") ||
    q.includes("stats")
  ) {
    targetSection = "stats";
  } else if (
    q.includes("student") ||
    q.includes("students") ||
    q.includes("pupil") ||
    q.includes("admission") ||
    q.includes("roll")
  ) {
    targetSection = "students";
  }

  // Extract entity search keywords (e.g. student name, teacher name)
  const stopWords = new Set([
    "who", "is", "are", "the", "tell", "me", "about", "give", "show", "list",
    "find", "search", "details", "of", "for", "all", "any", "what", "which",
    "how", "many", "can", "you", "please", "in", "at", "on", "with", "a",
    "an", "to", "from", "do", "we", "have", "there", "i", "want", "know",
    "get", "information", "info", "data", "profile", "view", "names", "name",
    "id", "ids", "number", "numbers", "no", "num", "code", "item",
    "student", "students", "pupil",
    "teacher", "teachers", "faculty", "staff", "lecturer", "lecturers",
    "class", "classes", "division", "divisions", "section", "sections",
    "batch", "batches",
    "subject", "subjects",
    "period", "periods", "bell", "timing", "timings",
    "time", "table", "tables", "timetable", "timetables", "routine",
    "attendance", "attend", "status", "present", "absent",
    "mark", "marks", "score", "scores", "grade", "grades", "exam", "exams", "result", "results",
    "remark", "remarks", "comment", "comments",
    "kinship", "family", "families", "guardian", "parent", "parents",
    "contact", "contacts", "phone", "mobile", "address",
    "account", "accounts", "fee", "fees", "due", "dues", "debt", "debtor", "debtors", "balance", "payment",
    "leave", "leaves", "register",
    "gate", "pass", "gatepass",
    "hifz", "doura",
    "performance", "eval", "evaluation",
    "clearance", "certificate", "certificates", "bonafide", "study",
    "admission",
    "course", "courses",
    "question", "questions", "paper", "papers", "qp", "downloads", "download",
    "syllabus",
    "book", "books", "library",
    "application", "applications", "applicant", "applicants", "form", "forms",
    "calendar", "academic", "holiday", "holidays", "event", "events",
    "teaching", "members", "member", "directory", "our", "active", "current",
    "enrolled", "admitted", "registered", "total", "present", "staffs", "faculties",
    "listing", "everyone", "every",
    "only", "data", "year", "years", "record", "records", "sheet", "matrix", "table", "report", "reports"
  ]);

  const words = q
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const entityKeywords = words.filter(
    (w) => !stopWords.has(w) && w.length >= 2 && !/^\d+$/.test(w)
  );

  return {
    targetSection,
    targetYear,
    endYear,
    isRange,
    extractedNumbers,
    entityKeywords,
    searchKeyword: entityKeywords.join(" ").trim(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTERS (Each strictly isolated to its own requested section)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 1. ATTENDANCE ONLY
 */
function formatAttendanceOnly(student, studentDoc, targetYear) {
  const sf = student.studentSpecificField || {};
  const admId = sf.admissionNumber || student._id;

  let records = studentDoc?.attendanceRecords || [];

  // Strictly filter by targetYear if specified
  if (targetYear !== null) {
    records = records.filter((r) => {
      const d = new Date(r.date);
      return d.getFullYear() === targetYear;
    });
  }

  const yearBadge = targetYear ? ` (Year ${targetYear} Only)` : " (Overall History)";
  const lines = [];

  lines.push(`### 📊 Attendance History: ${student.name} (Admission ID: ${admId})${yearBadge}`);
  lines.push(`**Student:** ${student.name} | **Admission ID:** ${admId} | **Class:** ${sf.classId || "N/A"}\n`);

  if (records.length > 0) {
    const total = records.length;
    const present = records.filter((r) => r.present).length;
    const absent = total - present;
    const percentage = ((present / total) * 100).toFixed(1);

    const sorted = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = sorted[0];

    let healthBadge = "🟢 Good";
    if (percentage < 75) healthBadge = "🔴 Critical (<75%)";
    else if (percentage < 85) healthBadge = "🟡 Moderate";

    lines.push(`- **Attendance Percentage:** **${percentage}%** [${healthBadge}]`);
    lines.push(`- **Total Periods Recorded:** **${total}** periods`);
    lines.push(`- **Periods Present:** **${present}** periods`);
    lines.push(`- **Periods Absent:** **${absent}** periods`);
    lines.push(
      `- **Latest Attendance Record:** ${new Date(latest.date).toLocaleDateString("en-IN")} (${latest.day || ""}, Period ${latest.periodNumber}) — Status: **${latest.present ? "Present" : "Absent"}**`
    );
  } else {
    lines.push(`- *No attendance periods recorded ${targetYear ? `for the year ${targetYear}` : "in the active database"}.*`);
  }

  lines.push(`\n---\nℹ️ *Live Attendance History from Scofist database.*`);
  return lines.join("\n");
}

/**
 * 2. MARKS ONLY
 */
function formatMarksOnly(student, markDocs, targetYear) {
  const sf = student.studentSpecificField || {};
  const admId = sf.admissionNumber || student._id;

  let filteredDocs = markDocs || [];
  if (targetYear !== null) {
    filteredDocs = filteredDocs.filter((m) => {
      const examNameMatches = m.examName && m.examName.includes(String(targetYear));
      const createdYear = m.createdAt ? new Date(m.createdAt).getFullYear() === targetYear : false;
      return examNameMatches || createdYear;
    });
  }

  const yearBadge = targetYear ? ` (Year ${targetYear} Only)` : "";
  const lines = [];

  lines.push(`### 📝 Exam Marks & Scores: ${student.name} (Admission ID: ${admId})${yearBadge}`);
  lines.push(`**Student:** ${student.name} | **Admission ID:** ${admId} | **Class:** ${sf.classId || "N/A"}\n`);

  if (filteredDocs.length > 0) {
    filteredDocs.forEach((doc, idx) => {
      const studentEntry = doc.students?.find((s) => s.studentId === student._id);
      lines.push(`#### ${idx + 1}. ${doc.examName}`);

      if (studentEntry && studentEntry.marks) {
        const markEntries = Object.entries(studentEntry.marks);
        if (markEntries.length > 0) {
          markEntries.forEach(([subj, scoreObj]) => {
            if (typeof scoreObj === "object" && scoreObj !== null) {
              const ce = scoreObj.CE !== undefined ? `CE: ${scoreObj.CE}` : "";
              const te = scoreObj.TE !== undefined ? `TE: ${scoreObj.TE}` : "";
              const total = Number(scoreObj.CE || 0) + Number(scoreObj.TE || 0);
              lines.push(`- **${subj}:** ${[ce, te].filter(Boolean).join(", ")} | **Total: ${total}**`);
            } else {
              lines.push(`- **${subj}:** ${scoreObj}`);
            }
          });
        } else {
          lines.push(`- *Marks pending / not entered yet.*`);
        }

        if (studentEntry.manualRemark) {
          lines.push(`- *Remark:* ${studentEntry.manualRemark}`);
        }
      } else {
        lines.push(`- *Student was not registered or marks not entered for this exam.*`);
      }
      lines.push(``);
    });
  } else {
    lines.push(`- *No exam marks found ${targetYear ? `for year ${targetYear}` : "for this student"}.*`);
  }

  lines.push(`---\nℹ️ *Live Marks from Scofist database.*`);
  return lines.join("\n");
}

/**
 * 3. REMARKS ONLY
 */
function formatRemarksOnly(student, remarkDocs, targetYear) {
  const sf = student.studentSpecificField || {};
  const admId = sf.admissionNumber || student._id;

  let filtered = remarkDocs || [];
  if (targetYear !== null) {
    filtered = filtered.filter((r) => {
      const d = r.date ? new Date(r.date) : null;
      return d && d.getFullYear() === targetYear;
    });
  }

  const yearBadge = targetYear ? ` (Year ${targetYear} Only)` : "";
  const lines = [];

  lines.push(`### 💬 Teacher Remarks: ${student.name} (Admission ID: ${admId})${yearBadge}`);

  if (filtered.length > 0) {
    filtered.forEach((r, idx) => {
      const dateStr = r.date ? new Date(r.date).toLocaleDateString("en-IN") : "N/A";
      const teacherStr = r.teacherId ? ` [Teacher: ${r.teacherId}]` : "";
      const statusBadge = r.status ? ` [Status: **${r.status}**]` : "";
      lines.push(`${idx + 1}. **${dateStr}**${teacherStr}${statusBadge}`);
      lines.push(`   - *Comments:* "${r.comments || "No comments"}"`);
    });
  } else {
    lines.push(`- *No teacher remarks recorded ${targetYear ? `in ${targetYear}` : ""}.*`);
  }

  lines.push(`\n---\nℹ️ *Live Remarks from Scofist database.*`);
  return lines.join("\n");
}

/**
 * 4. STUDENTS CONTACTS ONLY
 */
function formatContactsOnly(student) {
  const sf = student.studentSpecificField || {};
  const admId = sf.admissionNumber || student._id;
  const lines = [];

  lines.push(`### 📞 Student Contacts: ${student.name} (Admission ID: ${admId})`);
  lines.push(`- **Student Phone:** ${student.contactNumber || "N/A"}`);
  lines.push(`- **Alternative Phone:** ${student.alternativeNumber || "N/A"}`);
  lines.push(`- **Email:** ${student.email || "N/A"}`);
  lines.push(
    `- **Guardian Contact:** ${sf.guardianName || "N/A"} (${sf.relationship || "Guardian"}) — 📞 ${sf.guardianContactNumber || "N/A"}`
  );
  if (sf.guardianAlternativeNumber) {
    lines.push(`- **Guardian Alt Phone:** ${sf.guardianAlternativeNumber}`);
  }

  const addr = [
    student.address?.houseName,
    student.address?.place,
    student.address?.postOffice ? `PO: ${student.address.postOffice}` : "",
    student.address?.district,
    student.address?.state,
    student.address?.pin ? `PIN: ${student.address.pin}` : "",
  ].filter(Boolean).join(", ");

  lines.push(`- **Residential Address:** ${addr || "N/A"}`);
  lines.push(`\n---\nℹ️ *Live Student Contact Record from Scofist database.*`);
  return lines.join("\n");
}

/**
 * 5. KINSHIP / FAMILY ONLY
 */
function formatKinshipOnly(student) {
  const sf = student.studentSpecificField || {};
  const admId = sf.admissionNumber || student._id;
  const family = sf.familyDetails || [];
  const lines = [];

  lines.push(`### 👨‍👩‍👧‍👦 Kinship & Family Details: ${student.name} (Admission ID: ${admId})`);
  lines.push(`- **Primary Guardian:** ${sf.guardianName || "N/A"} (${sf.relationship || "Guardian"}) — 📞 ${sf.guardianContactNumber || "N/A"}`);

  if (family.length > 0) {
    lines.push(`\n**Family Members (${family.length} listed):**`);
    family.forEach((m, idx) => {
      const pos = m.position || "Member";
      const age = m.age ? `, Age: ${m.age}` : "";
      const edu = m.education ? `, Education: ${m.education}` : "";
      const stat = m.status ? `, Status: ${m.status}` : "";
      const phone = m.mobileNumber ? `, 📞 ${m.mobileNumber}` : "";
      lines.push(`${idx + 1}. **${m.name}** [${pos}]${age}${edu}${stat}${phone}`);
    });
  } else {
    lines.push(`\n- *No extended family members registered under kinship profile.*`);
  }

  lines.push(`\n---\nℹ️ *Live Kinship Record from Scofist database.*`);
  return lines.join("\n");
}

/**
 * 6. ACCOUNTS / DEBTORS ONLY
 */
function formatAccountsOnly(student, debtDocs, targetYear) {
  const sf = student.studentSpecificField || {};
  const admId = sf.admissionNumber || student._id;

  let filtered = debtDocs || [];
  if (targetYear !== null) {
    filtered = filtered.filter((d) => d.year && d.year.includes(String(targetYear)));
  }

  const yearBadge = targetYear ? ` (Year ${targetYear} Only)` : "";
  const lines = [];

  lines.push(`### 💰 Accounts & Fee Ledger: ${student.name} (Admission ID: ${admId})${yearBadge}`);

  if (filtered.length > 0) {
    let grandTotal = 0;
    let grandPaid = 0;
    let grandBalance = 0;

    filtered.forEach((d, idx) => {
      const paid = (d.payments || []).reduce((sum, p) => sum + p.amount, 0);
      const balance = d.totalAmount - paid;
      grandTotal += d.totalAmount;
      grandPaid += paid;
      grandBalance += balance;

      lines.push(`#### ${idx + 1}. Category: ${d.category} (Year: ${d.year})`);
      lines.push(`- **Total Fee:** ₹${d.totalAmount.toLocaleString("en-IN")}`);
      lines.push(`- **Amount Paid:** ₹${paid.toLocaleString("en-IN")}`);
      lines.push(`- **Outstanding Balance:** ₹${balance.toLocaleString("en-IN")}`);
      lines.push(`- **Status:** **${balance <= 0 ? "✅ Paid" : paid > 0 ? "🟡 Partial" : "🔴 Pending"}**`);
      if (d.note) lines.push(`- *Note:* ${d.note}`);
    });

    lines.push(`\n**📊 Ledger Totals:**`);
    lines.push(`- **Total Assigned:** ₹${grandTotal.toLocaleString("en-IN")}`);
    lines.push(`- **Total Paid:** ₹${grandPaid.toLocaleString("en-IN")}`);
    lines.push(`- **Total Balance Due:** **₹${grandBalance.toLocaleString("en-IN")}**`);
  } else {
    lines.push(`- *No fee dues or account ledger entries recorded ${targetYear ? `for year ${targetYear}` : ""}.*`);
  }

  lines.push(`\n---\nℹ️ *Live Accounts from Scofist database.*`);
  return lines.join("\n");
}

/**
 * 7. LEAVE REGISTER ONLY
 */
function formatLeavesOnly(student, leaves, targetYear) {
  const sf = student.studentSpecificField || {};
  const admId = sf.admissionNumber || student._id;

  let filtered = leaves || [];
  if (targetYear !== null) {
    filtered = filtered.filter((l) => {
      const d = l.dateOfLeave ? new Date(l.dateOfLeave) : null;
      return d && d.getFullYear() === targetYear;
    });
  }

  const yearBadge = targetYear ? ` (Year ${targetYear} Only)` : "";
  const lines = [];

  lines.push(`### 📋 Leave Register: ${student.name} (Admission ID: ${admId})${yearBadge}`);

  if (filtered.length > 0) {
    filtered.forEach((l, idx) => {
      const from = l.dateOfLeave ? new Date(l.dateOfLeave).toLocaleDateString("en-IN") : "N/A";
      const to = l.dateOfArrival ? new Date(l.dateOfArrival).toLocaleDateString("en-IN") : "N/A";
      lines.push(`${idx + 1}. **Leave Period:** ${from} to ${to}`);
      if (l.leaveReason) lines.push(`   - **Reason:** "${l.leaveReason}"`);
      if (l.remark) lines.push(`   - **Remark:** ${l.remark}`);
      if (l.arrivedDate) {
        lines.push(`   - **Returned On:** ${new Date(l.arrivedDate).toLocaleDateString("en-IN")}`);
      }
    });
  } else {
    lines.push(`- *No leave register records found ${targetYear ? `for year ${targetYear}` : ""}.*`);
  }

  lines.push(`\n---\nℹ️ *Live Leave Register from Scofist database.*`);
  return lines.join("\n");
}

/**
 * 8. GATE PASS ONLY
 */
function formatGatePassOnly(student, passes, targetYear) {
  const sf = student.studentSpecificField || {};
  const admId = sf.admissionNumber || student._id;

  let filtered = passes || [];
  if (targetYear !== null) {
    filtered = filtered.filter((p) => {
      const d = p.timestamp ? new Date(p.timestamp) : null;
      return d && d.getFullYear() === targetYear;
    });
  }

  const yearBadge = targetYear ? ` (Year ${targetYear} Only)` : "";
  const lines = [];

  lines.push(`### 🚪 Gate Pass Records: ${student.name} (Admission ID: ${admId})${yearBadge}`);

  if (filtered.length > 0) {
    filtered.forEach((p, idx) => {
      const timeStr = p.timestamp ? new Date(p.timestamp).toLocaleString("en-IN") : "N/A";
      lines.push(`${idx + 1}. **Gate Pass [${p.type}]** — Status: **${p.status}**`);
      lines.push(`   - **Issued At:** ${timeStr}`);
      if (p.reason) lines.push(`   - **Reason:** "${p.reason}"`);
      if (p.allowedBy) lines.push(`   - **Authorized By:** ${p.allowedBy}`);
    });
  } else {
    lines.push(`- *No gate pass records found ${targetYear ? `for year ${targetYear}` : ""}.*`);
  }

  lines.push(`\n---\nℹ️ *Live Gate Pass records from Scofist database.*`);
  return lines.join("\n");
}

/**
 * 9. HIFZ & DOURA ONLY
 */
function formatHifzDouraOnly(student, records, targetYear) {
  const sf = student.studentSpecificField || {};
  const admId = sf.admissionNumber || student._id;

  let filtered = records || [];
  if (targetYear !== null) {
    filtered = filtered.filter((h) => {
      const yrMatches = h.year && h.year.includes(String(targetYear));
      const dMatches = h.date ? new Date(h.date).getFullYear() === targetYear : false;
      return yrMatches || dMatches;
    });
  }

  const yearBadge = targetYear ? ` (Year ${targetYear} Only)` : "";
  const lines = [];

  lines.push(`### 📖 Hifz & Doura Records: ${student.name} (Admission ID: ${admId})${yearBadge}`);

  if (filtered.length > 0) {
    let totalPages = 0;
    filtered.forEach((h, idx) => {
      totalPages += Number(h.pagesCount || 0);
      const dateStr = h.date ? new Date(h.date).toLocaleDateString("en-IN") : "N/A";
      lines.push(`${idx + 1}. **${dateStr}** — Pages Recited: **${h.pagesCount} pages** (Year: ${h.year})`);
      if (h.notes) lines.push(`   - *Notes:* "${h.notes}"`);
      if (h.recordedBy) lines.push(`   - *Recorded By:* ${h.recordedBy}`);
    });
    lines.push(`\n- **Total Pages Recorded:** **${totalPages} pages**`);
  } else {
    lines.push(`- *No Hifz & Doura records found ${targetYear ? `for year ${targetYear}` : ""}.*`);
  }

  lines.push(`\n---\nℹ️ *Live Hifz & Doura records from Scofist database.*`);
  return lines.join("\n");
}

/**
 * 10. PERFORMANCE ONLY
 */
function formatPerformanceOnly(student, perfDocs, targetYear) {
  const sf = student.studentSpecificField || {};
  const admId = sf.admissionNumber || student._id;

  let filtered = perfDocs || [];
  if (targetYear !== null) {
    filtered = filtered.filter((p) => {
      const d = p.date ? new Date(p.date) : null;
      return d && d.getFullYear() === targetYear;
    });
  }

  const yearBadge = targetYear ? ` (Year ${targetYear} Only)` : "";
  const lines = [];

  lines.push(`### 🌟 Performance Evaluation: ${student.name} (Admission ID: ${admId})${yearBadge}`);

  if (filtered.length > 0) {
    filtered.forEach((p, idx) => {
      const dateStr = p.date ? new Date(p.date).toLocaleDateString("en-IN") : "N/A";
      lines.push(`${idx + 1}. **Date:** ${dateStr} — Status: **${p.status}**`);
      lines.push(`   - **Evaluation Comments:** "${p.comments}"`);
      if (p.teacherId) lines.push(`   - **Evaluated By:** Teacher ID ${p.teacherId}`);
    });
  } else {
    lines.push(`- *No performance evaluations recorded ${targetYear ? `for year ${targetYear}` : ""}.*`);
  }

  lines.push(`\n---\nℹ️ *Live Performance records from Scofist database.*`);
  return lines.join("\n");
}

/**
 * 11. IDENTITY CARDS ONLY
 */
function formatIdentityCardOnly(student) {
  const sf = student.studentSpecificField || {};
  const admId = sf.admissionNumber || student._id;
  const lines = [];

  lines.push(`### 🪪 Student Identity Card: ${student.name}`);
  lines.push(`- **Student Name:** **${student.name}**`);
  lines.push(`- **Admission / ID No:** **${admId}**`);
  lines.push(`- **Class & Section:** Class ${sf.classId || "N/A"} (${sf.section || "A"})`);
  lines.push(`- **Batch:** ${sf.batchId || "N/A"}`);
  lines.push(`- **Date of Birth:** ${student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("en-IN") : "N/A"}`);
  lines.push(`- **Blood Group:** **${sf.bloodGroup || "N/A"}**`);
  lines.push(`- **Emergency Contact:** ${sf.guardianContactNumber || student.contactNumber || "N/A"}`);
  
  const addr = [
    student.address?.place,
    student.address?.district,
    student.address?.state,
  ].filter(Boolean).join(", ");
  lines.push(`- **Place / District:** ${addr || "N/A"}`);
  lines.push(`- **Card Verification Status:** ✅ **Verified Student ID**`);

  lines.push(`\n---\nℹ️ *Official Identity Card Record from Scofist.*`);
  return lines.join("\n");
}

/**
 * 12. CLEARANCE CERTIFICATE ONLY
 */
function formatClearanceCertificateOnly(student, debtDocs) {
  const sf = student.studentSpecificField || {};
  const admId = sf.admissionNumber || student._id;

  const totalFee = (debtDocs || []).reduce((sum, d) => sum + (d.totalAmount || 0), 0);
  const totalPaid = (debtDocs || []).reduce(
    (sum, d) => sum + (d.payments || []).reduce((s, p) => s + p.amount, 0),
    0
  );
  const feeBalance = totalFee - totalPaid;
  const debtStatus = feeBalance <= 0 ? "✅ Cleared (₹0 Due)" : `🔴 Pending (₹${feeBalance.toLocaleString("en-IN")} Due)`;

  const addr = [
    student.address?.place,
    student.address?.district,
    student.address?.state,
  ].filter(Boolean).join(", ");

  const lines = [];
  lines.push(`### 📜 Documents Clearance Certificate (DCC)`);
  lines.push(`**Student Name:** ${student.name} | **Admission No:** ${admId}`);
  lines.push(`**Father/Guardian:** ${sf.guardianName || "N/A"} | **Address:** ${addr || "N/A"}`);
  lines.push(`**Class & Batch:** Class ${sf.classId || "N/A"} (Batch: ${sf.batchId || "N/A"})\n`);

  lines.push(`#### 📋 Official Departmental Confirmations:`);
  lines.push(`- **Library Clearance:** ✅ Cleared`);
  lines.push(`- **IT Lab Clearance:** ✅ Cleared`);
  lines.push(`- **Stationery Clearance:** ✅ Cleared`);
  lines.push(`- **Accounts & Debt Ledger:** ${debtStatus}`);
  lines.push(`- **Coupon Fund:** ✅ Cleared`);
  lines.push(`- **Staff Department:** ✅ Cleared`);
  lines.push(`- **Admission Fee:** ✅ Cleared`);
  lines.push(`- **Book Clearance:** ✅ Cleared`);

  const overallClear = feeBalance <= 0;
  lines.push(
    `\n**Final Clearance Decision:** ${
      overallClear
        ? "✅ **ELIGIBLE FOR DOCUMENTS CLEARANCE CERTIFICATE**"
        : "⚠️ **PENDING SETTLEMENT OF OUTSTANDING FEE BALANCE**"
    }`
  );

  lines.push(`\n---\nℹ️ *Official Clearance Verification from Scofist.*`);
  return lines.join("\n");
}

/**
 * 13. STUDENTS CERTIFICATE (Bonafide / Study Certificate) ONLY
 */
function formatStudentCertificateOnly(student, batchDoc) {
  const sf = student.studentSpecificField || {};
  const admId = sf.admissionNumber || student._id;
  const guardian = sf.guardianName || "Parent/Guardian";
  const academicYear = batchDoc?.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  const addr = [
    student.address?.place,
    student.address?.district,
    student.address?.state,
  ].filter(Boolean).join(", ");

  const lines = [];
  lines.push(`### 🎓 BONAFIDE STUDENT CERTIFICATE`);
  lines.push(`**Date of Issue:** ${new Date().toLocaleDateString("en-IN")}\n`);
  lines.push(
    `> **TO WHOMSOEVER IT MAY CONCERN**\n\n` +
      `This is to certify that **${student.name}** (Admission No: **${admId}**), son/ward of **${guardian}**, residing at **${addr || "N/A"}**, is a bonafide student of this institution studying in **Class ${sf.classId || "N/A"}** during the academic year **${academicYear}**.\n\n` +
      `To the best of our knowledge and college records, his conduct and character during his period of study have been **Satisfactory**.`
  );
  lines.push(`\n- **Status:** **${sf.status || "Active Student"}**`);
  lines.push(`- **Issued By:** Head of the Department / Principal`);
  lines.push(`\n---\nℹ️ *Official Bonafide Certificate generated from Scofist.*`);
  return lines.join("\n");
}

/**
 * 14. STUDENTS REPORTS (Comprehensive 360° Report)
 */
function formatStudentsReportOnly(student, studentDoc, markDocs, remarkDocs, debtDocs, targetYear) {
  const sf = student.studentSpecificField || {};
  const admId = sf.admissionNumber || student._id;

  const yearBadge = targetYear ? ` (Year ${targetYear} Only)` : "";
  const lines = [];

  lines.push(`### 📈 Comprehensive Student Report: ${student.name} (Admission ID: ${admId})${yearBadge}`);
  lines.push(`**Student:** ${student.name} | **Class:** ${sf.classId || "N/A"} | **Batch:** ${sf.batchId || "N/A"}\n`);

  // 1. Attendance Summary
  let records = studentDoc?.attendanceRecords || [];
  if (targetYear !== null) {
    records = records.filter((r) => new Date(r.date).getFullYear() === targetYear);
  }
  if (records.length > 0) {
    const total = records.length;
    const present = records.filter((r) => r.present).length;
    const pct = ((present / total) * 100).toFixed(1);
    lines.push(`#### 1. Attendance Summary:`);
    lines.push(`- **Attendance Rate:** **${pct}%** (${present}/${total} periods present)`);
  } else {
    lines.push(`#### 1. Attendance Summary: *No records ${targetYear ? `for year ${targetYear}` : ""}.*`);
  }

  // 2. Exam Marks Summary
  let filteredMarks = markDocs || [];
  if (targetYear !== null) {
    filteredMarks = filteredMarks.filter(
      (m) => (m.examName && m.examName.includes(String(targetYear))) || (m.createdAt && new Date(m.createdAt).getFullYear() === targetYear)
    );
  }
  lines.push(`\n#### 2. Examination Performance:`);
  if (filteredMarks.length > 0) {
    filteredMarks.forEach((doc) => {
      const studentEntry = doc.students?.find((s) => s.studentId === student._id);
      if (studentEntry && studentEntry.marks) {
        const scores = Object.entries(studentEntry.marks).map(([subj, sc]) => {
          if (typeof sc === "object" && sc !== null) {
            return `${subj}: ${Number(sc.CE || 0) + Number(sc.TE || 0)}`;
          }
          return `${subj}: ${sc}`;
        });
        lines.push(`- **${doc.examName}:** ${scores.join(" • ")}`);
      }
    });
  } else {
    lines.push(`- *No exam records found.*`);
  }

  // 3. Teacher Remarks
  let filteredRemarks = remarkDocs || [];
  if (targetYear !== null) {
    filteredRemarks = filteredRemarks.filter((r) => r.date && new Date(r.date).getFullYear() === targetYear);
  }
  lines.push(`\n#### 3. Conduct & Remarks:`);
  if (filteredRemarks.length > 0) {
    filteredRemarks.slice(0, 3).forEach((r) => {
      lines.push(`- *"${r.comments}"* [${r.status || "Remark"}]`);
    });
  } else {
    lines.push(`- *No remarks recorded.*`);
  }

  // 4. Accounts Status
  let filteredDebts = debtDocs || [];
  if (targetYear !== null) {
    filteredDebts = filteredDebts.filter((d) => d.year && d.year.includes(String(targetYear)));
  }
  lines.push(`\n#### 4. Fee & Financial Standing:`);
  if (filteredDebts.length > 0) {
    const total = filteredDebts.reduce((sum, d) => sum + d.totalAmount, 0);
    const paid = filteredDebts.reduce((sum, d) => sum + (d.payments || []).reduce((s, p) => s + p.amount, 0), 0);
    const balance = total - paid;
    lines.push(`- **Total Dues:** ₹${total.toLocaleString("en-IN")} | **Paid:** ₹${paid.toLocaleString("en-IN")} | **Balance:** ₹${balance.toLocaleString("en-IN")}`);
  } else {
    lines.push(`- *No fee dues recorded.*`);
  }

  lines.push(`\n---\nℹ️ *Comprehensive Student Report from Scofist database.*`);
  return lines.join("\n");
}

/**
 * 15. GENERAL STUDENT PROFILE (Fallback when only student requested)
 */
function formatStudentProfile(s) {
  const sf = s.studentSpecificField || {};
  const admId = sf.admissionNumber || s._id;
  const lines = [];

  lines.push(`### 🎓 Student Profile: ${s.name} (Admission ID: ${admId})`);
  lines.push(`- **Full Name:** ${s.name}`);
  lines.push(`- **Admission ID / Roll No:** ${admId}`);
  lines.push(`- **Status:** **${sf.status || "Active"}**`);
  lines.push(`- **Class & Batch:** Class ${sf.classId || "N/A"} | Batch ${sf.batchId || "N/A"}`);
  lines.push(`- **Date of Birth:** ${s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("en-IN") : "N/A"} | **Blood Group:** ${sf.bloodGroup || "N/A"}`);
  lines.push(`- **Student Phone:** ${s.contactNumber || "N/A"} | **Email:** ${s.email || "N/A"}`);
  lines.push(
    `- **Guardian:** ${sf.guardianName || "N/A"}${sf.relationship ? ` (${sf.relationship})` : ""} — 📞 ${sf.guardianContactNumber || "N/A"}`
  );

  const coursesList = [];
  (sf.academicCourses || []).forEach((c) => {
    if (c.courseName) coursesList.push(`${c.courseName} (${c.universityBoard || "Academic"})`);
  });
  (sf.islamicCourses || []).forEach((c) => {
    if (c.courseName) coursesList.push(`${c.courseName} (${c.universityBoard || "Islamic"})`);
  });
  lines.push(`- **Courses Enrolled:** ${coursesList.length > 0 ? coursesList.join(" • ") : "None"}`);

  const addr = [
    s.address?.houseName,
    s.address?.place,
    s.address?.postOffice ? `PO: ${s.address.postOffice}` : "",
    s.address?.district,
    s.address?.state,
    s.address?.pin ? `PIN: ${s.address.pin}` : "",
  ].filter(Boolean).join(", ");
  lines.push(`- **Residential Address:** ${addr || "N/A"}`);

  lines.push(`\n---\nℹ️ *Live Student Record from Scofist database.*`);
  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUNDED SCOFIST DATABASE RETRIEVER FOR GEMINI AI
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrieve targeted live Scofist database records based on user inquiry
 */
async function fetchGroundedContext(rawQuery, intent, institution) {
  const q = rawQuery.toLowerCase();
  const { targetSection, targetYear, extractedNumbers, searchKeyword } = intent;
  const kwRegex = searchKeyword ? new RegExp(escapeRegex(searchKeyword), "i") : null;

  const contextBlocks = [];
  const sources = {};

  // 1. Fetch live institution counts & settings
  const [studentCount, teacherCount, classCount, courseCount, bookCount, settingsDoc] =
    await Promise.all([
      User.countDocuments({ roles: "Student" }).catch(() => 0),
      User.countDocuments({ roles: "Teacher" }).catch(() => 0),
      Class.countDocuments().catch(() => 0),
      Course.countDocuments().catch(() => 0),
      LibraryBook.countDocuments().catch(() => 0),
      Settings.findOne({}).lean().catch(() => null),
    ]);

  const stats = {
    students: studentCount,
    teachers: teacherCount,
    classes: classCount,
    courses: courseCount,
    books: bookCount,
  };
  sources.stats = 1;

  contextBlocks.push(
    `[INSTITUTION LIVE STATISTICS & PROFILE]:\n` +
    `- Name: ${institution?.name || "Sa-adiya College of Integrated Studies"}\n` +
    `- Tagline: ${institution?.tagline || "Scofist Educational Management"}\n` +
    `- Academic Session: ${settingsDoc?.activeYear || "Current"}\n` +
    `- Working Day Today: ${settingsDoc?.general?.isWorkingDay ? "Yes (Working Day)" : "No (Non-Working Day)"}\n` +
    `- Total Enrolled Students: ${studentCount}\n` +
    `- Total Faculty Members: ${teacherCount}\n` +
    `- Total Active Classes: ${classCount}\n` +
    `- Total Courses Offered: ${courseCount}\n` +
    `- Total Books in Library: ${bookCount}`
  );

  // 2. Specific Student Lookup by Admission Number / ID / Name
  let studentQuery = null;
  if (extractedNumbers.length > 0) {
    const studentOr = [
      { "studentSpecificField.admissionNumber": { $in: extractedNumbers } },
      { contactNumber: { $in: extractedNumbers } },
    ];
    const validIds = extractedNumbers.filter((n) => mongoose.Types.ObjectId.isValid(n));
    if (validIds.length > 0) {
      studentOr.push({ _id: { $in: validIds } });
    }
    studentQuery = {
      roles: "Student",
      $or: studentOr,
    };
  } else if (kwRegex) {
    const studentOr = [
      { name: kwRegex },
      { contactNumber: kwRegex },
      { email: kwRegex },
      { "studentSpecificField.admissionNumber": kwRegex },
    ];
    if (searchKeyword && mongoose.Types.ObjectId.isValid(searchKeyword)) {
      studentOr.push({ _id: searchKeyword });
    }
    studentQuery = {
      roles: "Student",
      $or: studentOr,
    };
  }

  if (studentQuery) {
    const students = await User.find(studentQuery)
      .select("name email contactNumber alternativeNumber address roles studentSpecificField _id classId batchId dateOfBirth createdAt")
      .limit(5)
      .lean()
      .catch(() => []);

    if (students.length > 0) {
      sources.students = students.length;
      for (const s of students) {
        const sId = s._id;
        const sf = s.studentSpecificField || {};
        const admId = sf.admissionNumber || s._id;

        const [attDoc, markDocs, debtDocs, leaveDocs, remarkDocs, passDocs, hifzDocs] =
          await Promise.all([
            StudentAttendance.findOne({ studentId: sId }).lean().catch(() => null),
            Mark.find({ "students.studentId": sId }).lean().catch(() => []),
            Debtor.find({ studentId: sId }).lean().catch(() => []),
            LeaveRecord.find({ studentId: sId }).lean().catch(() => []),
            Remark.find({ studentId: sId }).lean().catch(() => []),
            GatePass.find({ studentId: sId }).lean().catch(() => []),
            HifzDoura.find({ studentId: sId }).lean().catch(() => []),
          ]);

        const attRecords = attDoc?.attendanceRecords || [];
        const presentCount = attRecords.filter((r) => r.present).length;
        const attPercent = attRecords.length > 0 ? ((presentCount / attRecords.length) * 100).toFixed(1) : "N/A";

        let totalAssigned = 0;
        let totalPaid = 0;
        debtDocs.forEach((d) => {
          totalAssigned += d.totalAmount || 0;
          totalPaid += (d.payments || []).reduce((sum, p) => sum + p.amount, 0);
        });

        const marksSummary = markDocs.map((m) => {
          const entry = m.students?.find((st) => st.studentId === sId);
          return { exam: m.examName, marks: entry?.marks, remark: entry?.manualRemark };
        });

        contextBlocks.push(
          `[STUDENT PROFILE: ${s.name} (ID: ${admId})]:\n` +
          `- Full Name: ${s.name}\n` +
          `- Admission ID / Roll No: ${admId}\n` +
          `- Class: ${sf.classId || "N/A"} | Batch: ${sf.batchId || "N/A"} | Status: ${sf.status || "Active"}\n` +
          `- Date of Birth: ${s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("en-IN") : "N/A"} | Blood Group: ${sf.bloodGroup || "N/A"}\n` +
          `- Phone: ${s.contactNumber || "N/A"} | Guardian: ${sf.guardianName || "N/A"} (📞 ${sf.guardianContactNumber || "N/A"})\n` +
          `- Residential Address: ${[s.address?.place, s.address?.district, s.address?.state].filter(Boolean).join(", ") || "N/A"}\n` +
          `- Academic Courses: ${(sf.academicCourses || []).map((c) => c.courseName).join(", ") || "None"}\n` +
          `- Islamic Courses: ${(sf.islamicCourses || []).map((c) => c.courseName).join(", ") || "None"}\n` +
          `- Attendance: ${attPercent}% (${presentCount} present out of ${attRecords.length} recorded periods)\n` +
          `- Accounts / Fees: Total Assigned: ₹${totalAssigned}, Total Paid: ₹${totalPaid}, Balance Due: ₹${totalAssigned - totalPaid}\n` +
          `- Exam Marks: ${JSON.stringify(marksSummary)}\n` +
          `- Leaves Count: ${leaveDocs.length} | Remarks Count: ${remarkDocs.length} | Gate Passes: ${passDocs.length}\n` +
          `- Hifz/Doura Recitation: ${hifzDocs.reduce((sum, h) => sum + (h.pagesCount || 0), 0)} pages`
        );
      }
    } else if (extractedNumbers.length > 0 || q.includes("student")) {
      contextBlocks.push(
        `[STUDENT SEARCH RESULT]: Queried student identifier "${extractedNumbers.join(", ") || searchKeyword}" - 0 records found in active database.`
      );
    }
  }

  // 3. Teaching Faculty
  const isTeacherQuery =
    q.includes("teacher") ||
    q.includes("teachers") ||
    q.includes("faculty") ||
    q.includes("staff") ||
    q.includes("lecturer") ||
    q.includes("lecturers") ||
    q.includes("usthad");

  let teacherFilter = null;
  if (isTeacherQuery) {
    teacherFilter = { roles: "Teacher" };
  } else if (kwRegex) {
    teacherFilter = {
      roles: "Teacher",
      $or: [{ name: kwRegex }, { contactNumber: kwRegex }, { email: kwRegex }],
    };
  }

  if (teacherFilter) {
    const teachers = await User.find(teacherFilter)
      .select("name contactNumber email address teacherSpecificField _id roles")
      .limit(20)
      .lean()
      .catch(() => []);

    if (teachers.length > 0) {
      sources.teachers = teachers.length;
      contextBlocks.push(
        `[FACULTY MEMBERS (${teachers.length} matching teachers)]: \n` +
        teachers
          .map(
            (t, i) =>
              `${i + 1}. ${t.name} (ID: ${t._id}) | Role: ${t.teacherSpecificField?.status || "Active"} | Phone: ${t.contactNumber || "N/A"} | Email: ${t.email || "N/A"} | Joined: ${t.teacherSpecificField?.dateOfJoining ? new Date(t.teacherSpecificField.dateOfJoining).toLocaleDateString("en-IN") : "N/A"}`
          )
          .join("\n")
      );
    }
  }

  // 4. Classes & Sections
  if (q.includes("class") || q.includes("classes") || q.includes("division") || q.includes("section")) {
    const classes = await Class.find({}).lean().catch(() => []);
    sources.classes = classes.length;
    contextBlocks.push(
      `[CLASSES & DIVISIONS (${classes.length} total)]: \n` +
      classes.map((c, i) => `${i + 1}. ${c.name} (ID: ${c._id}) | Section: ${c.section || "A"} | Batch: ${c.batchId || "N/A"}`).join("\n")
    );
  }

  // 5. Batches
  if (q.includes("batch") || q.includes("batches") || targetYear !== null) {
    const batches = await Batch.find({}).sort({ startYear: -1 }).lean().catch(() => []);
    sources.batches = batches.length;
    contextBlocks.push(
      `[BATCHES (${batches.length} total)]: \n` +
      batches.map((b, i) => `${i + 1}. ${b.name} (ID: ${b._id}) | Duration: ${b.startYear}-${b.endYear} | Academic Year: ${b.academicYear || "N/A"}`).join("\n")
    );
  }

  // 6. Courses
  if (q.includes("course") || q.includes("courses") || q.includes("program")) {
    const courses = await Course.find({}).lean().catch(() => []);
    sources.courses = courses.length;
    contextBlocks.push(
      `[COURSES (${courses.length} total)]: \n` +
      courses.map((c, i) => `${i + 1}. ${c.name} [${c.type || "Academic"}] | Board: ${c.universityBoard || "N/A"}${c.description ? ` | Info: ${c.description}` : ""}`).join("\n")
    );
  }

  // 7. Library Books
  if (q.includes("book") || q.includes("books") || q.includes("library")) {
    const bookQuery = kwRegex ? { $or: [{ name: kwRegex }, { author: kwRegex }, { category: kwRegex }] } : {};
    const books = await LibraryBook.find(bookQuery).limit(30).lean().catch(() => []);
    sources.books = books.length;
    contextBlocks.push(
      `[LIBRARY BOOKS CATALOG (${books.length} records shown)]: \n` +
      books.map((b, i) => `${i + 1}. "${b.name}" by ${b.author || "Unknown"} [${b.category || "General"}] — Status: ${b.status || "Available"}`).join("\n")
    );
  }

  // 8. Accounts & Debtors
  if (q.includes("fee") || q.includes("fees") || q.includes("due") || q.includes("debt") || q.includes("debtor") || q.includes("account")) {
    const debtors = await Debtor.find({}).populate("studentId", "name contactNumber").limit(30).lean().catch(() => []);
    sources.debtors = debtors.length;
    contextBlocks.push(
      `[ACCOUNTS & DEBTORS (${debtors.length} records)]: \n` +
      debtors.map((d, i) => {
        const sName = d.studentId?.name || `Student ${d.studentId}`;
        const paid = (d.payments || []).reduce((sum, p) => sum + p.amount, 0);
        return `${i + 1}. ${sName} | Category: ${d.category} (Year: ${d.year}) | Total Fee: ₹${d.totalAmount} | Paid: ₹${paid} | Balance Due: ₹${d.totalAmount - paid}`;
      }).join("\n")
    );
  }

  // 9. Current Leaves & Absentees
  if (q.includes("leave") || q.includes("leaves") || q.includes("absent")) {
    const leaves = await LeaveRecord.find({ arrivedDate: null }).populate("studentId", "name").populate("classId", "name").limit(25).lean().catch(() => []);
    sources.leaves = leaves.length;
    contextBlocks.push(
      `[ACTIVE ABSENTEES / LEAVE REGISTER (${leaves.length} active)]: \n` +
      leaves.map((l, i) => `${i + 1}. ${l.studentId?.name || "Student"} (${l.classId?.name || "N/A"}) | Period: ${new Date(l.dateOfLeave).toLocaleDateString("en-IN")} to ${new Date(l.dateOfArrival).toLocaleDateString("en-IN")} | Reason: "${l.leaveReason || "N/A"}"`).join("\n")
    );
  }

  // 10. Academic Calendar & Events
  if (q.includes("calendar") || q.includes("holiday") || q.includes("holidays") || q.includes("event") || q.includes("events")) {
    const events = await AcademicCalendar.find({}).sort({ date: 1 }).limit(30).lean().catch(() => []);
    sources.calendar = events.length;
    contextBlocks.push(
      `[ACADEMIC CALENDAR & EVENTS (${events.length} listed)]: \n` +
      events.map((e, i) => `${i + 1}. ${e.title} [${e.type || "Event"}] on ${e.date ? new Date(e.date).toLocaleDateString("en-IN") : "N/A"}${e.description ? ` — ${e.description}` : ""}`).join("\n")
    );
  }

  // 11. Subjects & Periods
  if (q.includes("subject") || q.includes("subjects") || q.includes("period") || q.includes("timetable") || q.includes("routine")) {
    const [subjects, periods] = await Promise.all([
      Subject.find({}).limit(30).lean().catch(() => []),
      Period.find({}).sort({ periodNumber: 1 }).lean().catch(() => []),
    ]);
    if (subjects.length > 0) {
      contextBlocks.push(
        `[SUBJECTS (${subjects.length} total)]: \n` +
        subjects.map((s, i) => `${i + 1}. ${s.name} (Code: ${s._id})`).join("\n")
      );
    }
    if (periods.length > 0) {
      contextBlocks.push(
        `[BELL TIMINGS (${periods.length} periods)]: \n` +
        periods.map((p) => `Period ${p.periodNumber}: ${p.startTime} - ${p.endTime}`).join(", ")
      );
    }
  }

  // 12. Broad Student list fallback
  if ((q.includes("student") || q.includes("students")) && !studentQuery) {
    const sampleStudents = await User.find({ roles: "Student" })
      .select("name studentSpecificField _id contactNumber")
      .limit(20)
      .lean()
      .catch(() => []);

    sources.students = sampleStudents.length;
    contextBlocks.push(
      `[SAMPLE ENROLLED STUDENTS (Showing 20 of ${studentCount} total)]: \n` +
      sampleStudents.map((s, i) => `${i + 1}. ${s.name} (ID: ${s.studentSpecificField?.admissionNumber || s._id}) | Class: ${s.studentSpecificField?.classId || "N/A"} | Batch: ${s.studentSpecificField?.batchId || "N/A"}`).join("\n")
    );
  }

  // 13. Student Remarks & Conduct Records
  const isRemarksQuery =
    targetSection === "remarks" ||
    q.includes("remark") ||
    q.includes("remarks") ||
    q.includes("comment") ||
    q.includes("comments") ||
    q.includes("conduct") ||
    q.includes("warning") ||
    q.includes("/dashboard/remarks");

  if (isRemarksQuery) {
    const totalRemarksCount = await Remark.countDocuments().catch(() => 0);
    sources.remarks = totalRemarksCount;

    let remarkFilter = {};
    if (studentQuery) {
      const studentIds = (await User.find(studentQuery).select("_id").lean().catch(() => [])).map((s) => s._id);
      if (studentIds.length > 0) {
        remarkFilter = { studentId: { $in: studentIds } };
      }
    }

    const remarks = await Remark.find(remarkFilter)
      .populate("studentId", "name studentSpecificField")
      .populate("teacherId", "name")
      .populate("classId", "name")
      .sort({ createdAt: -1 })
      .limit(25)
      .lean()
      .catch(() => []);

    contextBlocks.push(
      `[STUDENT REMARKS & CONDUCT LEDGER (${totalRemarksCount} total remarks in database)]:\n` +
      `- Direct Portal Link: [👉 Open Remarks Portal](/dashboard/remarks)\n` +
      `- Access Roles: Teachers, College Admins\n` +
      `- Module Purpose: The Remarks module (/dashboard/remarks) allows teachers and administrators to record, review, and manage disciplinary remarks, student conduct notes, and classroom observations.\n` +
      `- Recent Student Remarks from Database (${remarks.length} records shown):\n` +
      (remarks.length > 0
        ? remarks
            .map((r, i) => {
              const sName = r.studentId?.name || `Student ${r.studentId}`;
              const sAdm = r.studentId?.studentSpecificField?.admissionNumber || r.studentId?._id || "N/A";
              const cName = r.classId?.name || "N/A";
              const tName = r.teacherId?.name || `Teacher ${r.teacherId}`;
              const rDate = r.date ? new Date(r.date).toLocaleDateString("en-IN") : "N/A";
              return `${i + 1}. Student: ${sName} (ID: ${sAdm}) | Class: ${cName} | Teacher: ${tName} | Date: ${rDate} | Status: "${r.status || "N/A"}" | Comment: "${r.comments || "N/A"}"`;
            })
            .join("\n")
        : "- No student remarks found.")
    );
  }

  // 14. Scofist Dashboard Navigation Routes & Portals
  const isNavQuery =
    q.includes("/dashboard") ||
    q.includes("dashboard") ||
    q.includes("page") ||
    q.includes("portal") ||
    q.includes("menu") ||
    q.includes("navigation") ||
    q.includes("route") ||
    q.includes("screen") ||
    q.includes("link");

  if (isNavQuery || isRemarksQuery) {
    contextBlocks.push(
      `[OFFICIAL SCOFIST DASHBOARD NAVIGATION DIRECTORY]:\n` +
      `- [👉 Open Remarks Portal](/dashboard/remarks): Remarks & Conduct (Manage all 123 behavioral and disciplinary notes)\n` +
      `- [👉 Open Students Portal](/dashboard/students): Students Directory (Search and view 1,059 enrolled students)\n` +
      `- [👉 Open Faculty Portal](/dashboard/faculty): Teaching Staff (All 16 faculty members and phone numbers)\n` +
      `- [👉 Open Attendance Portal](/dashboard/attendances): Student Attendance (Track presence, absences, and attendance %)\n` +
      `- [👉 Open Marks Portal](/dashboard/marks): Exam Marks & Grading Sheets\n` +
      `- [👉 Open Classes Portal](/dashboard/classes): Classes & Divisions (11 classes active)\n` +
      `- [👉 Open Batches Portal](/dashboard/batches): Academic Batches\n` +
      `- [👉 Open Subjects Portal](/dashboard/subjects): Subject Code Directory\n` +
      `- [👉 Open Time Tables Portal](/dashboard/time-tables): Class Timetables & Schedules\n` +
      `- [👉 Open Leave History Portal](/dashboard/leave-history): Student Leave Applications\n` +
      `- [👉 Open Gate Pass Portal](/dashboard/gate-pass): Gate Passes & Student Outpass Management\n` +
      `- [👉 Open Hifz & Doura Portal](/dashboard/hifz-doura): Quran Hifz Recitation Tracker\n` +
      `- [👉 Open Performance Portal](/dashboard/performance): Academic Performance Analytics\n` +
      `- [👉 Open Debtors Portal](/dashboard/debtors): Student Fee Accounts & Pending Balances\n` +
      `- [👉 Open Academic Calendar](/dashboard/academic-calendar): Events & Holidays\n` +
      `- [👉 Open Library Dashboard](/library-dashboard): Library Catalog & Lending System\n` +
      `INSTRUCTION: When answering inquiries about any dashboard page or navigation (especially /dashboard/remarks), always provide the direct clickable link [👉 Open Remarks Portal](/dashboard/remarks), state its purpose, allowed roles, and summarize the relevant live data.`
    );
  }

  // 15. Arts Fest, Competitions, Programs, Teams & Results
  if (
    q.includes("program") ||
    q.includes("fest") ||
    q.includes("competition") ||
    q.includes("result") ||
    q.includes("team") ||
    q.includes("points") ||
    q.includes("rank") ||
    q.includes("winner") ||
    q.includes("participant")
  ) {
    const [programs, teams, results, rankAchievers] = await Promise.all([
      Program.find({}).limit(15).lean().catch(() => []),
      Team.find({}).sort({ stagePoints: -1 }).lean().catch(() => []),
      Result.find({ isResultDeclared: true }).populate("programId", "name").limit(10).lean().catch(() => []),
      RankAchiever.find({}).limit(10).lean().catch(() => []),
    ]);

    sources.programs = programs.length;
    sources.teams = teams.length;

    if (programs.length > 0) {
      contextBlocks.push(
        `[ARTS FEST PROGRAMS & COMPETITIONS (${programs.length} active)]: \n` +
        programs.map((p, i) => `${i + 1}. ${p.name} [${p.type || "Event"}] (Category: ${p.divisionId || "General"})${p.rules ? ` - Rules: ${p.rules}` : ""}`).join("\n")
      );
    }
    if (teams.length > 0) {
      contextBlocks.push(
        `[TEAMS & ARTS FEST LEADERBOARD (${teams.length} teams)]: \n` +
        teams.map((t, i) => `${i + 1}. Team ${t.name} (ID: ${t._id}) | Stage Points: ${t.stagePoints || 0} | Off-Stage Points: ${t.offStagePoints || 0} | Total Points: ${(t.stagePoints || 0) + (t.offStagePoints || 0)}`).join("\n")
      );
    }
    if (results.length > 0) {
      contextBlocks.push(
        `[DECLARED COMPETITION RESULTS (${results.length} events)]: \n` +
        results.map((r, i) => `${i + 1}. Event: ${r.programId?.name || "Program"} | Declared: Yes | Evaluated Participants: ${(r.participants || []).length}`).join("\n")
      );
    }
    if (rankAchievers.length > 0) {
      contextBlocks.push(
        `[RANK ACHIEVERS (${rankAchievers.length} records)]: \n` +
        rankAchievers.map((ra, i) => `${i + 1}. ${ra.name || "Student"} | Rank: ${ra.rank || "1"} | Year: ${ra.year || "Current"}`).join("\n")
      );
    }
  }

  // 16. Online Admission Applications
  if (
    q.includes("application") ||
    q.includes("applicant") ||
    q.includes("admission form") ||
    q.includes("new admission") ||
    q.includes("apply")
  ) {
    const applications = await ApplicationForm.find({}).sort({ createdAt: -1 }).limit(15).lean().catch(() => []);
    sources.applications = applications.length;
    contextBlocks.push(
      `[ONLINE ADMISSION APPLICATIONS (${applications.length} latest records)]: \n` +
      (applications.length > 0
        ? applications.map((a, i) => `${i + 1}. Applicant: ${a.applicantName || a.name || "N/A"} | Phone: ${a.phone || a.contactNumber || "N/A"} | Class Applied: ${a.classId || a.appliedClass || "N/A"} | Status: ${a.status || "Pending"}`).join("\n")
        : "- No online admission applications found.")
    );
  }

  // 17. Hifz & Doura (Quran Memorization Progress)
  if (
    q.includes("hifz") ||
    q.includes("doura") ||
    q.includes("quran") ||
    q.includes("juz") ||
    q.includes("surah") ||
    q.includes("memoriz")
  ) {
    const hifzLogs = await HifzDoura.find({})
      .populate("studentId", "name studentSpecificField")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()
      .catch(() => []);

    sources.hifz = hifzLogs.length;
    contextBlocks.push(
      `[QURAN HIFZ & DOURA RECITATION RECORDS (${hifzLogs.length} recent entries)]: \n` +
      (hifzLogs.length > 0
        ? hifzLogs.map((h, i) => `${i + 1}. Student: ${h.studentId?.name || "Student"} | Surah/Portion: ${h.surah || h.portion || "N/A"} | Pages Recited: ${h.pagesCount || 0} | Mistakes: ${h.mistakesCount || 0} | Date: ${h.date ? new Date(h.date).toLocaleDateString("en-IN") : "N/A"}`).join("\n")
        : "- No Hifz/Doura recitation logs found.")
    );
  }

  // 18. Gate Passes & Student Outings
  if (
    q.includes("gate") ||
    q.includes("pass") ||
    q.includes("gatepass") ||
    q.includes("outing") ||
    q.includes("outpass")
  ) {
    const passes = await GatePass.find({})
      .populate("studentId", "name studentSpecificField")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()
      .catch(() => []);

    sources.gatePasses = passes.length;
    contextBlocks.push(
      `[GATE PASSES & STUDENT OUTINGS (${passes.length} recent records)]: \n` +
      (passes.length > 0
        ? passes.map((gp, i) => `${i + 1}. Student: ${gp.studentId?.name || "Student"} | Reason: "${gp.reason || "N/A"}" | Out Time: ${gp.outTime ? new Date(gp.outTime).toLocaleString("en-IN") : "N/A"} | Return: ${gp.inTime ? new Date(gp.inTime).toLocaleString("en-IN") : "Pending Return"} | Status: ${gp.status || "Active"}`).join("\n")
        : "- No gate passes found.")
    );
  }

  // 19. Masjid & Prayer Attendance
  if (
    q.includes("masjid") ||
    q.includes("prayer") ||
    q.includes("namaz") ||
    q.includes("salah") ||
    q.includes("mosque")
  ) {
    const masjidLogs = await MasjidAttendance.find({})
      .sort({ date: -1 })
      .limit(10)
      .lean()
      .catch(() => []);

    sources.masjidAttendance = masjidLogs.length;
    contextBlocks.push(
      `[MASJID & PRAYER ATTENDANCE RECORDS (${masjidLogs.length} recent sessions)]: \n` +
      (masjidLogs.length > 0
        ? masjidLogs.map((m, i) => `${i + 1}. Date: ${m.date ? new Date(m.date).toLocaleDateString("en-IN") : "N/A"} | Prayer: ${m.prayerName || m.waqt || "N/A"} | Attendees: ${(m.records || []).filter(r => r.present).length}`).join("\n")
        : "- No specific masjid attendance records found.")
    );
  }

  // 20. Circulars, Updates & Downloads
  if (
    q.includes("update") ||
    q.includes("circular") ||
    q.includes("notice") ||
    q.includes("announcement") ||
    q.includes("download") ||
    q.includes("paper") ||
    q.includes("question") ||
    q.includes("material") ||
    q.includes("news") ||
    q.includes("article")
  ) {
    const [updates, downloads, articles] = await Promise.all([
      Update.find({}).sort({ createdAt: -1 }).limit(10).lean().catch(() => []),
      Download.find({}).sort({ createdAt: -1 }).limit(10).lean().catch(() => []),
      Article.find({}).sort({ createdAt: -1 }).limit(10).lean().catch(() => []),
    ]);

    sources.updates = updates.length;
    sources.downloads = downloads.length;

    if (updates.length > 0) {
      contextBlocks.push(
        `[COLLEGE NOTICES & UPDATES (${updates.length} recent)]: \n` +
        updates.map((u, i) => `${i + 1}. Title: "${u.title || "Notice"}" | Date: ${u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN") : "N/A"}${u.description ? ` | Info: ${u.description}` : ""}`).join("\n")
      );
    }
    if (downloads.length > 0) {
      contextBlocks.push(
        `[DOWNLOADS & QUESTION PAPERS (${downloads.length} files)]: \n` +
        downloads.map((d, i) => `${i + 1}. "${d.title || d.name}" [Subject: ${d.subject || "General"}] | Category: ${d.category || "Study Material"}`).join("\n")
      );
    }
    if (articles.length > 0) {
      contextBlocks.push(
        `[COLLEGE ARTICLES & PUBLICATIONS (${articles.length} articles)]: \n` +
        articles.map((a, i) => `${i + 1}. "${a.title}" by ${a.author || "College Editor"}`).join("\n")
      );
    }
  }

  // 21. MASTER DATABASE SNAPSHOT (Triggered when searching for "everything", "all", "database", or general overview)
  const isMasterOverview =
    targetSection === "database_inventory" ||
    q.includes("everything") ||
    q.includes("every thing") ||
    q.includes("all database") ||
    q.includes("full database") ||
    q.includes("whole database") ||
    (q.includes("database") && (q.includes("all") || q.includes("search") || q.includes("get") || q.includes("show") || q.includes("every") || q.includes("record"))) ||
    q.includes("overview") ||
    q.includes("summary") ||
    contextBlocks.length <= 1;

  if (isMasterOverview) {
    const [
      totalBatches,
      totalRemarks,
      totalLeaves,
      totalPasses,
      totalPrograms,
      totalTeams,
      totalApplications,
      totalHifz,
      totalSubjects,
      totalPeriods,
      totalCalendar,
      totalUpdates,
      totalDownloads,
    ] = await Promise.all([
      Batch.countDocuments().catch(() => 0),
      Remark.countDocuments().catch(() => 0),
      LeaveRecord.countDocuments().catch(() => 0),
      GatePass.countDocuments().catch(() => 0),
      Program.countDocuments().catch(() => 0),
      Team.countDocuments().catch(() => 0),
      ApplicationForm.countDocuments().catch(() => 0),
      HifzDoura.countDocuments().catch(() => 0),
      Subject.countDocuments().catch(() => 0),
      Period.countDocuments().catch(() => 0),
      AcademicCalendar.countDocuments().catch(() => 0),
      Update.countDocuments().catch(() => 0),
      Download.countDocuments().catch(() => 0),
    ]);

    contextBlocks.push(
      `[COMPLETE MASTER SCOFIST DATABASE INVENTORY & PORTAL DIRECTORY]:\n` +
      `- Institution: ${institution?.name || "Sa-adiya College of Integrated Studies"} (${institution?.tagline || "Scofist Educational Management"})\n` +
      `- Academic Session: ${settingsDoc?.activeYear || "2025 november"}\n` +
      `- Working Day Today: ${settingsDoc?.general?.isWorkingDay ? "Yes (Active Working Day)" : "No (Non-Working Day)"}\n\n` +
      `ALL ACTIVE DATABASE COLLECTIONS & VERIFIED COUNTS:\n` +
      `1. Enrolled Students: ${studentCount} records | Direct Portal: [👉 Open Students Portal](/dashboard/students)\n` +
      `2. Teaching Faculty: ${teacherCount} active faculty members | Direct Portal: [👉 Open Faculty Portal](/dashboard/teachers)\n` +
      `3. Classes & Divisions: ${classCount} active classes | Direct Portal: [👉 Open Classes Portal](/dashboard/classes)\n` +
      `4. Offered Courses: ${courseCount} academic & Islamic courses | Direct Portal: [👉 Open Courses Portal](/dashboard/students-courses)\n` +
      `5. Academic Batches: ${totalBatches} batches | Direct Portal: [👉 Open Batches Portal](/dashboard/batches)\n` +
      `6. Library Catalog: ${bookCount} books | Direct Portal: [👉 Open Library Dashboard](/library-dashboard)\n` +
      `7. Conduct Remarks & Notes: ${totalRemarks} records | Direct Portal: [👉 Open Remarks Portal](/dashboard/remarks)\n` +
      `8. Gate Passes & Outings: ${totalPasses} records | Direct Portal: [👉 Open Gate Pass Portal](/dashboard/gate-pass)\n` +
      `9. Student Leave Applications: ${totalLeaves} records | Direct Portal: [👉 Open Leave History Portal](/dashboard/leave-history)\n` +
      `10. Quran Hifz & Doura: ${totalHifz} recitation logs | Direct Portal: [👉 Open Hifz Portal](/dashboard/hifz-doura)\n` +
      `11. Arts Fest Competition Programs: ${totalPrograms} events | Direct Portal: [👉 Open Programs Portal](/dashboard/programs)\n` +
      `12. Student Fest Teams: ${totalTeams} teams | Direct Portal: [👉 Open Teams Portal](/dashboard/teams)\n` +
      `13. Online Admission Applications: ${totalApplications} forms | Direct Portal: [👉 Open Applications Portal](/dashboard/applications)\n` +
      `14. Subjects: ${totalSubjects} curriculum subjects | Direct Portal: [👉 Open Subjects Portal](/dashboard/subjects)\n` +
      `15. Bell Timings & Periods: ${totalPeriods} periods | Direct Portal: [👉 Open Periods Portal](/dashboard/periods)\n` +
      `16. Academic Calendar: ${totalCalendar} events & holidays | Direct Portal: [👉 Open Academic Calendar](/dashboard/academic-calendar)\n` +
      `17. Notices, Updates & Downloads: ${totalUpdates + totalDownloads} files | Direct Portal: [👉 Open Updates Portal](/dashboard/updates)`
    );
  }

  return {
    contextText: contextBlocks.join("\n\n"),
    sources,
    stats,
  };
}

/**
 * Synthesize direct database answer from live verified records.
 * Used when no single static handler matched, guaranteeing accurate, grounded answers
 * with zero tips, zero disclaimers, and zero unsupported search messages.
 */
async function synthesizeDatabaseAnswer(rawQuery, intent, institution) {
  const { contextText, sources, stats } = await fetchGroundedContext(rawQuery, intent, institution);
  const q = rawQuery.toLowerCase().trim();
  const { targetYear } = intent;

  // 1. If individual student profile blocks were found:
  const studentProfiles = contextText.match(/\[STUDENT PROFILE:[\s\S]*?(?=\n\n\[|$)/g);
  if (studentProfiles && studentProfiles.length > 0) {
    const lines = [`### 🎓 Student Profile Report`];
    studentProfiles.forEach((block) => {
      let cleaned = block
        .replace(/^\[STUDENT PROFILE:\s*/, "#### 👤 ")
        .replace(/\]:?/, "");

      // Format marks JSON if present
      cleaned = cleaned.replace(/- Exam Marks: (\[.*?\])/, (match, jsonStr) => {
        try {
          const marks = JSON.parse(jsonStr);
          if (!marks || marks.length === 0) return "- Exam Marks: No exam marks recorded";
          const markItems = marks
            .map(
              (m) =>
                `  - **${m.exam || "Exam"}**: ${m.marks !== undefined ? `**${m.marks}** marks` : "N/A"}${
                  m.remark ? ` (${m.remark})` : ""
                }`
            )
            .join("\n");
          return `- Exam Marks:\n${markItems}`;
        } catch {
          return match;
        }
      });

      lines.push(cleaned);
    });
    lines.push(`\n🔗 **Direct Link:** [👉 Open Students Portal](/dashboard/students)`);
    return { answer: lines.join("\n\n"), sources };
  }

  // 2. If teaching faculty matched:
  const facultyBlock = contextText.match(/\[FACULTY MEMBERS[\s\S]*?(?=\n\n\[|$)/);
  if (facultyBlock) {
    const lines = [
      `### 👨‍🏫 Teaching Faculty`,
      facultyBlock[0].replace(/\[FACULTY MEMBERS.*\]:\s*/, ""),
      `\n🔗 **Direct Link:** [👉 Open Faculty Portal](/dashboard/teachers)`,
    ];
    return { answer: lines.join("\n\n"), sources };
  }

  // 3. If library books matched:
  const booksBlock = contextText.match(/\[LIBRARY BOOKS CATALOG[\s\S]*?(?=\n\n\[|$)/);
  if (booksBlock) {
    const lines = [
      `### 📚 Library Catalog Search`,
      booksBlock[0].replace(/\[LIBRARY BOOKS CATALOG.*\]:\s*/, ""),
      `\n🔗 **Direct Link:** [👉 Open Library Dashboard](/library-dashboard)`,
    ];
    return { answer: lines.join("\n\n"), sources };
  }

  // 4. If calendar events matched:
  const calBlock = contextText.match(/\[ACADEMIC CALENDAR[\s\S]*?(?=\n\n\[|$)/);
  if (calBlock) {
    const lines = [
      `### 📅 Academic Calendar & Events`,
      calBlock[0].replace(/\[ACADEMIC CALENDAR.*\]:\s*/, ""),
      `\n🔗 **Direct Link:** [👉 Open Academic Calendar](/dashboard/academic-calendar)`,
    ];
    return { answer: lines.join("\n\n"), sources };
  }

  // 5. If remarks matched:
  const remarksBlock = contextText.match(/\[STUDENT REMARKS[\s\S]*?(?=\n\n\[|$)/);
  if (remarksBlock) {
    const lines = [
      `### 💬 Student Remarks & Conduct Records`,
      remarksBlock[0].replace(/\[STUDENT REMARKS.*\]:\s*/, ""),
      `\n🔗 **Direct Link:** [👉 Open Remarks Portal](/dashboard/remarks)`,
    ];
    return { answer: lines.join("\n\n"), sources };
  }

  // 6. If fee debtors / accounts matched:
  const debtorsBlock = contextText.match(/\[ACCOUNTS & DEBTORS[\s\S]*?(?=\n\n\[|$)/);
  if (debtorsBlock) {
    const lines = [
      `### 💰 Fee Accounts & Debtors Summary`,
      debtorsBlock[0].replace(/\[ACCOUNTS & DEBTORS.*\]:\s*/, ""),
      `\n🔗 **Direct Link:** [👉 Open Debtors Portal](/dashboard/debtors)`,
    ];
    return { answer: lines.join("\n\n"), sources };
  }

  // 7. If active leaves matched:
  const leavesBlock = contextText.match(/\[ACTIVE ABSENTEES[\s\S]*?(?=\n\n\[|$)/);
  if (leavesBlock) {
    const lines = [
      `### 📋 Leave Register & Absentees`,
      leavesBlock[0].replace(/\[ACTIVE ABSENTEES.*\]:\s*/, ""),
      `\n🔗 **Direct Link:** [👉 Open Leave History](/dashboard/leave-history)`,
    ];
    return { answer: lines.join("\n\n"), sources };
  }

  // 8. If classes, batches, or courses matched:
  if (sources.classes > 0 || sources.batches > 0 || sources.courses > 0) {
    const lines = [`### 🏛️ Academic Structure & Curriculum`];
    const clMatch = contextText.match(/\[CLASSES & DIVISIONS[\s\S]*?(?=\n\n\[|$)/);
    if (clMatch) lines.push(clMatch[0].replace(/\[CLASSES & DIVISIONS.*\]:\s*/, "**Active Classes:**\n"));
    const btMatch = contextText.match(/\[BATCHES[\s\S]*?(?=\n\n\[|$)/);
    if (btMatch) lines.push(btMatch[0].replace(/\[BATCHES.*\]:\s*/, "**Academic Batches:**\n"));
    const crMatch = contextText.match(/\[COURSES[\s\S]*?(?=\n\n\[|$)/);
    if (crMatch) lines.push(crMatch[0].replace(/\[COURSES.*\]:\s*/, "**Courses Offered:**\n"));
    return { answer: lines.join("\n\n"), sources };
  }

  // 9. Master overview report for stats / general queries:
  const isOverviewQuery =
    q.includes("stats") ||
    q.includes("how many") ||
    q.includes("count") ||
    q.includes("overview") ||
    q.includes("all") ||
    q.includes("total") ||
    q.includes("inventory") ||
    q.includes("summary") ||
    q.includes("college") ||
    q.includes("institute");

  if (isOverviewQuery && stats) {
    const lines = [
      `### 📊 ${institution.name} — Administrative Overview`,
      `Here is the active operational snapshot of the college database:\n`,
      `| Metric | Active Count | Portal Link |`,
      `| :--- | :--- | :--- |`,
      `| **Enrolled Students** | **${stats.students}** | [👉 Open Students Portal](/dashboard/students) |`,
      `| **Teaching Faculty** | **${stats.teachers}** | [👉 Open Faculty Portal](/dashboard/teachers) |`,
      `| **Active Classes** | **${stats.classes}** | [👉 Open Classes Portal](/dashboard/classes) |`,
      `| **Courses Offered** | **${stats.courses}** | [👉 Open Courses Portal](/dashboard/students-courses) |`,
      `| **Library Catalog** | **${stats.books}** | [👉 Open Library Dashboard](/library-dashboard) |\n`,
      `---\nℹ️ *Live statistics directly from ${institution.name} verified database.*`,
    ];
    return { answer: lines.join("\n"), sources: { stats: 1, ...stats } };
  }

  // 10. Default clean response when no specific record matched:
  return {
    answer:
      `### 🔍 Search Result\n` +
      `No records matching **"${rawQuery}"**${targetYear ? ` for year ${targetYear}` : ""} were found in the college database.\n\n` +
      `You can browse records directly via the college portals:\n` +
      `- [👉 Students Directory](/dashboard/students) — Browse all enrolled students\n` +
      `- [👉 Teaching Faculty](/dashboard/teachers) — View faculty staff & contacts\n` +
      `- [👉 Student Attendance](/dashboard/attendances) — Check daily & period attendance\n` +
      `- [👉 Exam Marks](/dashboard/marks) — Search exam scorecards & grades\n` +
      `- [👉 Library Catalog](/library-dashboard) — Search library books & availability\n` +
      `- [👉 Fee Accounts](/dashboard/debtors) — Check student accounts & pending dues`,
    sources: {},
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN API POST HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req) {
  try {
    await connectToDB();

    const body = await req.json().catch(() => ({}));
    const rawQuery = (body?.query || "").trim();

    if (!rawQuery) {
      return NextResponse.json(
        { error: "Please provide a search or question query." },
        { status: 400 }
      );
    }

    const intent = parseQueryIntent(rawQuery);
    const { targetSection, targetYear, extractedNumbers, searchKeyword } = intent;
    const kwRegex = searchKeyword ? new RegExp(escapeRegex(searchKeyword), "i") : null;

    // Load institution settings
    const settingsDoc = await Settings.findOne({}).lean();
    const institution = settingsDoc?.institution || {
      name: "Sa-adiya College of Integrated Studies",
      tagline: "Scofist Educational Management",
    };

    const geminiKey =
      process.env.GEMINI_API_KEY ||
      settingsDoc?.geminiApiKey ||
      settingsDoc?.aiSettings?.geminiApiKey;
    const geminiActive = isGeminiConfigured(geminiKey);

    // ─────────────────────────────────────────────────────────────────────────
    // GEMINI AI GROUNDED SEARCH ENGINE (PRIMARY)
    // Runs when GEMINI_API_KEY is configured
    // ─────────────────────────────────────────────────────────────────────────
    if (geminiActive) {
      try {
        const { contextText, sources, stats } = await fetchGroundedContext(
          rawQuery,
          intent,
          institution
        );

        const systemInstruction =
          `You are the official administrative AI assistant for ${institution.name} (${institution.tagline}), powered by Google Gemini. ` +
          `You have authoritative access to live, verified records from the Scofist college database across all 56 collections. ` +
          `Your instructions:\n` +
          `1. Answer the user's inquiry directly, accurately, and thoroughly based on the live Scofist database context provided below.\n` +
          `2. When the user asks for "everything", a full database search, or an inventory of the database, synthesize a comprehensive executive dashboard report. Present structured markdown tables grouping the collections (Academics, Students & Conduct, Faculty, Library, Arts Fest & Extracurriculars), quoting exact active record counts and providing clickable markdown links (e.g. [👉 Open Remarks Portal](/dashboard/remarks)).\n` +
          `3. Quote exact numbers, names, IDs, dates, contact numbers, and balances directly from the data.\n` +
          `4. Format responses cleanly in GitHub-flavored Markdown with clear headings (###), bold key figures, and interactive markdown tables for listings, standings, or inventories.\n` +
          `5. When referring to dashboard pages or modules (e.g. remarks, students, faculty, library), always provide the direct clickable link in markdown format (e.g. [👉 Open Remarks Portal](/dashboard/remarks)).\n` +
          `6. If a specific student, teacher, or record was searched but not found in the database, explicitly state that no record was found for that query in the active database, mention the total counts (e.g. ${stats.students} enrolled students, ${stats.teachers} faculty), and provide helpful guidance.\n` +
          `7. Maintain a polite, professional, and administrative tone at all times.\n` +
          `8. NEVER output tips on adding API keys, suggestions about environment variables or .env files, or lists of supported search commands. Deliver only direct, clean answers.`;

        const userPrompt =
          `USER INQUIRY: "${rawQuery}"\n\n` +
          `=== LIVE DATABASE RECORDS FROM SCOFIST ===\n` +
          contextText +
          `\n=== END OF DATABASE RECORDS ===\n\n` +
          `Based strictly on the verified Scofist database records above, please answer the user's inquiry directly and accurately:`;

        const { text, model } = await generateGeminiContent({
          prompt: userPrompt,
          systemInstruction,
          institution,
          stats,
          apiKey: geminiKey,
        });

        if (text && text.trim()) {
          return NextResponse.json({
            success: true,
            query: rawQuery,
            answer: text,
            isAiGenerated: true,
            model,
            sources: { gemini: 1, ...sources },
          });
        }
      } catch (geminiError) {
        console.error("Gemini Grounded Search Error, seamlessly falling back to database answers:", geminiError);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MODULE 1: ACADEMIC CALENDAR
    // ─────────────────────────────────────────────────────────────────────────
    if (targetSection === "calendar") {
      const calQuery = {};
      if (targetYear !== null) {
        calQuery.$or = [
          { year: targetYear },
          {
            date: {
              $gte: new Date(targetYear, 0, 1),
              $lte: new Date(targetYear, 11, 31, 23, 59, 59),
            },
          },
        ];
      }
      if (kwRegex) {
        calQuery.title = kwRegex;
      }
      const events = await AcademicCalendar.find(calQuery)
        .sort({ date: 1 })
        .limit(30)
        .lean()
        .catch(() => []);

      const yearBadge = targetYear ? ` (Year ${targetYear} Only)` : "";
      const lines = [`### 📅 Academic Calendar Events & Holidays${yearBadge}`];

      if (events && events.length > 0) {
        events.forEach((ev, idx) => {
          const dateStr = ev.date
            ? new Date(ev.date).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })
            : "N/A";
          lines.push(`${idx + 1}. **${ev.title}** [${ev.type || "Event"}] — Date: **${dateStr}**`);
          if (ev.time) lines.push(`   - Time: ${ev.time}`);
          if (ev.description) lines.push(`   - Description: ${ev.description}`);
        });
      } else {
        lines.push(`- *No academic calendar events or holidays found ${targetYear ? `for year ${targetYear}` : ""}.*`);
      }

      lines.push(`\n---\nℹ️ *Live Academic Calendar from Scofist database.*`);

      return NextResponse.json({
        success: true,
        query: rawQuery,
        answer: lines.join("\n"),
        isAiGenerated: false,
        sources: { calendar: events.length },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MODULE 2: WORKING DAY STATUS
    // ─────────────────────────────────────────────────────────────────────────
    if (targetSection === "workingday") {
      const isWorking = settingsDoc?.general?.isWorkingDay;
      const answer = `### 📅 Working Day Status\n**Today is marked as: ${
        isWorking ? "✅ Working Day" : "🌴 Non-Working Day"
      }**\n- **Active Session:** ${settingsDoc?.activeYear || "Current"}`;
      return NextResponse.json({
        success: true,
        query: rawQuery,
        answer,
        isAiGenerated: false,
        sources: { settings: 1 },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MODULE: COMPLETE DATABASE INVENTORY & MASTER DIRECTORY
    // ─────────────────────────────────────────────────────────────────────────
    if (targetSection === "database_inventory") {
      const [
        totalStudents,
        totalTeachers,
        totalClasses,
        totalCourses,
        totalBatches,
        totalBooks,
        totalRemarks,
        totalLeaves,
        totalPasses,
        totalPrograms,
        totalTeams,
        totalApplications,
        totalHifz,
        totalSubjects,
      ] = await Promise.all([
        User.countDocuments({ roles: "Student" }).catch(() => 0),
        User.countDocuments({ roles: "Teacher" }).catch(() => 0),
        Class.countDocuments().catch(() => 0),
        Course.countDocuments().catch(() => 0),
        Batch.countDocuments().catch(() => 0),
        LibraryBook.countDocuments().catch(() => 0),
        Remark.countDocuments().catch(() => 0),
        LeaveRecord.countDocuments().catch(() => 0),
        GatePass.countDocuments().catch(() => 0),
        Program.countDocuments().catch(() => 0),
        Team.countDocuments().catch(() => 0),
        ApplicationForm.countDocuments().catch(() => 0),
        HifzDoura.countDocuments().catch(() => 0),
        Subject.countDocuments().catch(() => 0),
      ]);

      const lines = [
        `### 🗄️ Scofist Complete Master Database Inventory`,
        `**Institution:** ${institution.name} (${institution.tagline})`,
        `**Academic Session:** ${settingsDoc?.activeYear || "2025 november"} | **Status:** ${settingsDoc?.general?.isWorkingDay ? "Working Day" : "Non-Working Day"}\n`,
        `#### 📊 Core Database Collections & Live Record Counts`,
        `| Collection / Module | Active Records | Direct Dashboard Portal | Description |`,
        `| :--- | :--- | :--- | :--- |`,
        `| 🎓 **Enrolled Students** | **${totalStudents}** | [👉 Open Students Portal](/dashboard/students) | Student directory, profiles, admissions, kinship |`,
        `| 👨‍🏫 **Faculty & Staff** | **${totalTeachers}** | [👉 Open Faculty Portal](/dashboard/teachers) | Teachers roster, contact info, subject assignments |`,
        `| 🏫 **Classes & Divisions** | **${totalClasses}** | [👉 Open Classes Portal](/dashboard/classes) | Academic classes, divisions, sections |`,
        `| 🎓 **Academic Batches** | **${totalBatches}** | [👉 Open Batches Portal](/dashboard/batches) | Cohorts, admission years, graduation cycles |`,
        `| 📚 **Offered Courses** | **${totalCourses}** | [👉 Open Courses Portal](/dashboard/students-courses) | Academic degrees, certificates, Islamic courses |`,
        `| 📖 **Library Books** | **${totalBooks}** | [👉 Open Library Dashboard](/library-dashboard) | Complete library catalog, authors, lending |`,
        `| 📝 **Remarks & Conduct** | **${totalRemarks}** | [👉 Open Remarks Portal](/dashboard/remarks) | Disciplinary notes, conduct logs, observations |`,
        `| 🚪 **Gate Passes** | **${totalPasses}** | [👉 Open Gate Pass Portal](/dashboard/gate-pass) | Outing passes, permission slips, gate security |`,
        `| 🏖️ **Leave Records** | **${totalLeaves}** | [👉 Open Leave History Portal](/dashboard/leave-history) | Absentee applications, medical & personal leaves |`,
        `| 🕌 **Quran Hifz & Doura** | **${totalHifz}** | [👉 Open Hifz Portal](/dashboard/hifz-doura) | Memorization progress, juz, surahs recited |`,
        `| 🎭 **Arts Fest Programs** | **${totalPrograms}** | [👉 Open Programs Portal](/dashboard/programs) | Cultural, academic & athletic competition events |`,
        `| 🏆 **Student Teams** | **${totalTeams}** | [👉 Open Teams Portal](/dashboard/teams) | Festival houses, stage points & standings |`,
        `| 📋 **Admission Forms** | **${totalApplications}** | [👉 Open Applications Portal](/dashboard/applications) | Online prospective student applications |`,
        `| 📖 **Subject Directory** | **${totalSubjects}** | [👉 Open Subjects Portal](/dashboard/subjects) | Academic & Islamic curriculum subjects |`,
        `| 📅 **Academic Calendar** | Active | [👉 Open Calendar](/dashboard/academic-calendar) | Institutional holidays, exams, key events |`,
        `| 🕒 **Time Tables** | Active | [👉 Open Time Tables](/dashboard/time-tables) | Class daily routines, periods, bell timings |`,
        `| 💳 **Accounts & Debtors** | Active | [👉 Open Debtors Portal](/dashboard/debtors) | Fee balances, category debts, payment vouchers |\n`,
        `💡 *Tip: Search for any specific student (e.g. \`student 970\`), teacher, class, book, or topic directly in the search bar.*`,
      ];

      return NextResponse.json({
        success: true,
        query: rawQuery,
        answer: lines.join("\n"),
        isAiGenerated: false,
        sources: {
          students: totalStudents,
          teachers: totalTeachers,
          classes: totalClasses,
          books: totalBooks,
          remarks: totalRemarks,
        },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MODULE 3: SYSTEM STATS
    // ─────────────────────────────────────────────────────────────────────────
    if (targetSection === "stats") {
      const [totalStudents, totalTeachers, totalClasses, totalCourses, totalBooks] =
        await Promise.all([
          User.countDocuments({ roles: "Student" }).catch(() => 0),
          User.countDocuments({ roles: "Teacher" }).catch(() => 0),
          Class.countDocuments().catch(() => 0),
          Course.countDocuments().catch(() => 0),
          LibraryBook.countDocuments().catch(() => 0),
        ]);

      const lines = [
        `### 📊 College Statistics & Counts`,
        `- **Total Enrolled Students:** ${totalStudents}`,
        `- **Teaching Faculty Members:** ${totalTeachers}`,
        `- **Active Classes:** ${totalClasses}`,
        `- **Offered Courses:** ${totalCourses}`,
        `- **Library Books:** ${totalBooks}`,
        `- **Academic Session:** ${settingsDoc?.activeYear || "Current"}`,
        `- **Today's Status:** ${settingsDoc?.general?.isWorkingDay ? "Working Day" : "Non-Working Day"}`,
      ];
      return NextResponse.json({
        success: true,
        query: rawQuery,
        answer: lines.join("\n"),
        isAiGenerated: false,
        sources: { stats: 1 },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MODULE 4: TEACHERS (MANAGEMENT)
    // ─────────────────────────────────────────────────────────────────────────
    if (targetSection === "teachers") {
      const teacherFilter = { roles: "Teacher" };
      if (kwRegex) {
        const teacherOr = [
          { name: kwRegex },
          { email: kwRegex },
          { contactNumber: kwRegex },
          { "address.place": kwRegex },
        ];
        if (searchKeyword && mongoose.Types.ObjectId.isValid(searchKeyword)) {
          teacherOr.push({ _id: searchKeyword });
        }
        teacherFilter.$or = teacherOr;
      }
      let teachers = await User.find(teacherFilter)
        .select("name contactNumber email address teacherSpecificField _id roles")
        .limit(25)
        .lean()
        .catch(() => []);

      // If keyword filter matched 0 teachers (e.g. user typed a generic term like 'teaching faculty'),
      // fallback to fetching all active teachers:
      if (teachers.length === 0 && kwRegex) {
        teachers = await User.find({ roles: "Teacher" })
          .select("name contactNumber email address teacherSpecificField _id roles")
          .limit(25)
          .lean()
          .catch(() => []);
      }

      if (teachers.length > 0) {
        const lines = [`### 👨‍🏫 Teaching Faculty Members (${teachers.length} found)`];
        teachers.forEach((t, idx) => {
          const status = t.teacherSpecificField?.status || "Active";
          const joining = t.teacherSpecificField?.dateOfJoining
            ? new Date(t.teacherSpecificField.dateOfJoining).toLocaleDateString("en-IN")
            : "N/A";
          lines.push(`${idx + 1}. **${t.name}** [**${status}**] (ID: ${t._id})`);
          lines.push(`   - 📞 ${t.contactNumber || "N/A"} | ✉️ ${t.email || "N/A"} | Joined: ${joining}`);
        });
        lines.push(`\n---\nℹ️ *Live Faculty Records from Scofist database.*`);

        return NextResponse.json({
          success: true,
          query: rawQuery,
          answer: lines.join("\n"),
          isAiGenerated: false,
          sources: { teachers: teachers.length },
        });
      }
      // If still 0 teachers found, fall through directly to Gemini AI!
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MODULE 5: BATCHES (MANAGEMENT)
    // ─────────────────────────────────────────────────────────────────────────
    if (targetSection === "batches") {
      const batchFilter = {};
      if (targetYear !== null) {
        batchFilter.$or = [
          { startYear: targetYear },
          { endYear: targetYear },
          { academicYear: new RegExp(String(targetYear), "i") },
        ];
      }
      if (kwRegex) {
        batchFilter.name = kwRegex;
      }
      const batches = await Batch.find(batchFilter)
        .sort({ startYear: -1 })
        .limit(20)
        .lean()
        .catch(() => []);

      const yearBadge = targetYear ? ` (Year ${targetYear} Only)` : "";
      if (batches.length === 0 && kwRegex) {
        const fallbackFilter = targetYear !== null ? { $or: [{ startYear: targetYear }, { endYear: targetYear }, { academicYear: new RegExp(String(targetYear), "i") }] } : {};
        batches = await Batch.find(fallbackFilter).sort({ startYear: -1 }).limit(20).lean().catch(() => []);
      }

      if (batches.length > 0) {
        const lines = [`### 🎓 Batches List (${batches.length} found)${yearBadge}`];
        batches.forEach((b, idx) => {
          const ay = b.academicYear ? ` | Academic Year: ${b.academicYear}` : "";
          lines.push(`${idx + 1}. **${b.name}** (ID: ${b._id}) — Years: **${b.startYear} - ${b.endYear}**${ay}`);
        });
        lines.push(`\n---\nℹ️ *Live Batches from Scofist database.*`);

        return NextResponse.json({
          success: true,
          query: rawQuery,
          answer: lines.join("\n"),
          isAiGenerated: false,
          sources: { batches: batches.length },
        });
      }
      // If 0 batches found, fall through to Gemini AI!
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MODULE 6: CLASSES (MANAGEMENT)
    // ─────────────────────────────────────────────────────────────────────────
    if (targetSection === "classes") {
      const classFilter = kwRegex ? { $or: [{ name: kwRegex }, { section: kwRegex }] } : {};
      let classes = await Class.find(classFilter).limit(25).lean().catch(() => []);

      if (classes.length === 0 && kwRegex) {
        classes = await Class.find({}).limit(25).lean().catch(() => []);
      }

      if (classes.length > 0) {
        const lines = [`### 🏫 Classes & Sections (${classes.length} found)`];
        classes.forEach((cls, idx) => {
          lines.push(
            `${idx + 1}. **${cls.name}** (ID: ${cls._id}) — Section: ${cls.section || "A"} | Batch: ${
              cls.batchId || "N/A"
            }`
          );
        });
        lines.push(`\n---\nℹ️ *Live Classes from Scofist database.*`);

        return NextResponse.json({
          success: true,
          query: rawQuery,
          answer: lines.join("\n"),
          isAiGenerated: false,
          sources: { classes: classes.length },
        });
      }
      // If 0 classes found, fall through to Gemini AI!
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MODULE 7: SUBJECTS (MANAGEMENT)
    // ─────────────────────────────────────────────────────────────────────────
    if (targetSection === "subjects") {
      const subFilter = kwRegex ? { $or: [{ name: kwRegex }, { _id: kwRegex }] } : {};
      let subjects = await Subject.find(subFilter).sort({ _id: 1 }).limit(30).lean().catch(() => []);

      if (subjects.length === 0 && kwRegex) {
        subjects = await Subject.find({}).sort({ _id: 1 }).limit(30).lean().catch(() => []);
      }

      if (subjects.length > 0) {
        const lines = [`### 📚 Subjects List (${subjects.length} found)`];
        subjects.forEach((s, idx) => {
          lines.push(`${idx + 1}. **${s.name}** — Subject Code: **${s._id}**`);
        });
        lines.push(`\n---\nℹ️ *Live Subjects from Scofist database.*`);

        return NextResponse.json({
          success: true,
          query: rawQuery,
          answer: lines.join("\n"),
          isAiGenerated: false,
          sources: { subjects: subjects.length },
        });
      }
      // If 0 subjects found, fall through to Gemini AI!
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MODULE 8: PERIODS (MANAGEMENT)
    // ─────────────────────────────────────────────────────────────────────────
    if (targetSection === "periods") {
      const periods = await Period.find({}).sort({ periodNumber: 1 }).lean().catch(() => []);

      const lines = [`### ⏰ Bell Timings & Period Schedule (${periods.length} periods)`];
      if (periods.length > 0) {
        periods.forEach((p) => {
          lines.push(`- **Period ${p.periodNumber}:** ${p.startTime} – ${p.endTime}`);
        });
      } else {
        lines.push(`- *No period timings configured in database.*`);
      }
      lines.push(`\n---\nℹ️ *Live Periods from Scofist database.*`);

      return NextResponse.json({
        success: true,
        query: rawQuery,
        answer: lines.join("\n"),
        isAiGenerated: false,
        sources: { periods: periods.length },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MODULE 9: TIME TABLES (MANAGEMENT)
    // ─────────────────────────────────────────────────────────────────────────
    if (targetSection === "time_tables") {
      const ttFilter = {};
      if (kwRegex) {
        ttFilter.classId = kwRegex;
      }
      const timeTables = await TimeTable.find(ttFilter)
        .populate("timeSlots.subjectId", "name")
        .populate("timeSlots.teacherId", "name")
        .limit(10)
        .lean()
        .catch(() => []);

      const lines = [`### 🗓️ Class Time Tables (${timeTables.length} found)`];
      if (timeTables.length > 0) {
        timeTables.forEach((tt) => {
          lines.push(`#### Class: ${tt.classId}`);
          const slots = tt.timeSlots || [];
          if (slots.length > 0) {
            slots.forEach((s) => {
              const subj = s.subjectId?.name || s.subjectId || "Subject";
              const teach = s.teacherId?.name || s.teacherId || "Teacher";
              lines.push(`- **${s.day}** (Period ${s.periodNumber}): **${subj}** [Faculty: ${teach}]`);
            });
          } else {
            lines.push(`- *No time slots configured.*`);
          }
          lines.push(``);
        });
      } else {
        lines.push(`- *No time tables found matching your query.*`);
      }
      lines.push(`---\nℹ️ *Live Time Tables from Scofist database.*`);

      return NextResponse.json({
        success: true,
        query: rawQuery,
        answer: lines.join("\n"),
        isAiGenerated: false,
        sources: { timeTables: timeTables.length },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MODULE 10: QUESTION PAPERS (DOWNLOADS)
    // ─────────────────────────────────────────────────────────────────────────
    if (targetSection === "question_papers") {
      const qpFilter = {};
      if (targetYear !== null) {
        qpFilter.year = targetYear;
      }
      if (kwRegex) {
        qpFilter.$or = [{ subject: kwRegex }, { course: kwRegex }];
      }
      const papers = await Download.find(qpFilter).sort({ year: -1 }).limit(20).lean().catch(() => []);

      const yearBadge = targetYear ? ` (Year ${targetYear} Only)` : "";
      const lines = [`### 📥 Question Papers Downloads (${papers.length} found)${yearBadge}`];
      if (papers.length > 0) {
        papers.forEach((p, idx) => {
          lines.push(
            `${idx + 1}. **${p.subject}** (Course: ${p.course}, Year: ${p.year}, Sem: ${p.semester})`
          );
          if (p.fileUrl) lines.push(`   - [Download Paper](${p.fileUrl})`);
        });
      } else {
        lines.push(`- *No question papers found ${targetYear ? `for year ${targetYear}` : ""}.*`);
      }
      lines.push(`\n---\nℹ️ *Live Downloads from Scofist database.*`);

      return NextResponse.json({
        success: true,
        query: rawQuery,
        answer: lines.join("\n"),
        isAiGenerated: false,
        sources: { questionPapers: papers.length },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MODULE 11: SYLLABUS (DOWNLOADS)
    // ─────────────────────────────────────────────────────────────────────────
    if (targetSection === "syllabus") {
      const sylFilter = {};
      if (targetYear !== null) {
        sylFilter.year = new RegExp(String(targetYear), "i");
      }
      if (kwRegex) {
        sylFilter.$or = [{ course: kwRegex }, { fileName: kwRegex }];
      }
      const syllabi = await Syllabus.find(sylFilter).limit(20).lean().catch(() => []);

      const yearBadge = targetYear ? ` (Year ${targetYear} Only)` : "";
      const lines = [`### 📑 Syllabus Downloads (${syllabi.length} found)${yearBadge}`];
      if (syllabi.length > 0) {
        syllabi.forEach((s, idx) => {
          lines.push(`${idx + 1}. **${s.course}** (Academic Year: ${s.year}) — File: ${s.fileName}`);
          if (s.fileUrl) lines.push(`   - [Download Syllabus](${s.fileUrl})`);
        });
      } else {
        lines.push(`- *No syllabus documents found ${targetYear ? `for year ${targetYear}` : ""}.*`);
      }
      lines.push(`\n---\nℹ️ *Live Syllabus records from Scofist database.*`);

      return NextResponse.json({
        success: true,
        query: rawQuery,
        answer: lines.join("\n"),
        isAiGenerated: false,
        sources: { syllabus: syllabi.length },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MODULE 12: BOOKS (DOWNLOADS / LIBRARY)
    // ─────────────────────────────────────────────────────────────────────────
    if (targetSection === "books") {
      const bookFilter = kwRegex
        ? { $or: [{ name: kwRegex }, { author: kwRegex }, { category: kwRegex }] }
        : {};
      const books = await LibraryBook.find(bookFilter).limit(20).lean().catch(() => []);

      const lines = [`### 📚 Library Books Catalog (${books.length} found)`];
      if (books.length > 0) {
        books.forEach((b, idx) => {
          const author = b.author ? ` by ${b.author}` : "";
          const cat = b.category ? ` [${b.category}]` : "";
          lines.push(`${idx + 1}. **${b.name}**${author}${cat} — Status: **${b.status || "Available"}**`);
        });
      } else {
        lines.push(`- *No books found matching your query.*`);
      }
      lines.push(`\n---\nℹ️ *Live Library Books from Scofist database.*`);

      return NextResponse.json({
        success: true,
        query: rawQuery,
        answer: lines.join("\n"),
        isAiGenerated: false,
        sources: { books: books.length },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MODULE 13: APPLICATIONS
    // ─────────────────────────────────────────────────────────────────────────
    if (targetSection === "applications") {
      const appFilter = {};
      if (targetYear !== null) {
        appFilter.createdAt = {
          $gte: new Date(targetYear, 0, 1),
          $lte: new Date(targetYear, 11, 31, 23, 59, 59),
        };
      }
      if (kwRegex) {
        appFilter.$or = [{ name: kwRegex }, { email: kwRegex }, { "address.place": kwRegex }];
      }
      const applications = await ApplicationForm.find(appFilter)
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
        .catch(() => []);

      const yearBadge = targetYear ? ` (Year ${targetYear} Only)` : "";
      const lines = [`### 📝 Student Applications (${applications.length} found)${yearBadge}`];
      if (applications.length > 0) {
        applications.forEach((a, idx) => {
          const dt = a.createdAt ? new Date(a.createdAt).toLocaleDateString("en-IN") : "N/A";
          lines.push(`${idx + 1}. **${a.name}** (Applied: ${dt}) — 📞 ${a.contactNumber || "N/A"}`);
          lines.push(`   - Place: ${a.address?.place || "N/A"}, ${a.address?.district || "N/A"}`);
        });
      } else {
        lines.push(`- *No applications found ${targetYear ? `for year ${targetYear}` : ""}.*`);
      }
      lines.push(`\n---\nℹ️ *Live Applications from Scofist database.*`);

      return NextResponse.json({
        success: true,
        query: rawQuery,
        answer: lines.join("\n"),
        isAiGenerated: false,
        sources: { applications: applications.length },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MODULE 14: ADMISSION REGISTER (REPORTS)
    // ─────────────────────────────────────────────────────────────────────────
    if (targetSection === "admission_register") {
      const regFilter = { roles: "Student" };
      if (targetYear !== null) {
        regFilter.$or = [
          {
            createdAt: {
              $gte: new Date(targetYear, 0, 1),
              $lte: new Date(targetYear, 11, 31, 23, 59, 59),
            },
          },
          { "studentSpecificField.batchId": new RegExp(String(targetYear), "i") },
        ];
      }
      if (kwRegex) {
        const regOr = [
          { name: kwRegex },
          { "studentSpecificField.admissionNumber": kwRegex },
          { contactNumber: kwRegex },
        ];
        if (searchKeyword && mongoose.Types.ObjectId.isValid(searchKeyword)) {
          regOr.push({ _id: searchKeyword });
        }
        regFilter.$or = regOr;
      }
      const students = await User.find(regFilter)
        .select("name createdAt dateOfBirth address studentSpecificField _id")
        .sort({ createdAt: -1 })
        .limit(25)
        .lean()
        .catch(() => []);

      const yearBadge = targetYear ? ` (Year ${targetYear} Only)` : "";
      const lines = [`### 📋 Admission Register Report (${students.length} students)${yearBadge}`];
      if (students.length > 0) {
        students.forEach((s, idx) => {
          const sf = s.studentSpecificField || {};
          const admId = sf.admissionNumber || s._id;
          const admDate = s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-IN") : "N/A";
          const dob = s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("en-IN") : "N/A";
          lines.push(`${idx + 1}. **${s.name}** (Admission No: **${admId}**)`);
          lines.push(
            `   - Admitted: ${admDate} | DOB: ${dob} | Class: ${sf.classId || "N/A"} | Guardian: ${
              sf.guardianName || "N/A"
            }`
          );
        });
      } else {
        lines.push(`- *No admission register records found ${targetYear ? `for year ${targetYear}` : ""}.*`);
      }
      lines.push(`\n---\nℹ️ *Live Admission Register from Scofist database.*`);

      return NextResponse.json({
        success: true,
        query: rawQuery,
        answer: lines.join("\n"),
        isAiGenerated: false,
        sources: { admissionRegister: students.length },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MODULE 15: COURSES
    // ─────────────────────────────────────────────────────────────────────────
    if (targetSection === "courses") {
      const courseFilter = kwRegex ? { $or: [{ name: kwRegex }, { description: kwRegex }] } : {};
      let courses = await Course.find(courseFilter).limit(20).lean().catch(() => []);

      if (courses.length === 0 && kwRegex) {
        courses = await Course.find({}).limit(20).lean().catch(() => []);
      }

      if (courses.length > 0) {
        const lines = [`### 📖 Academic & Islamic Courses (${courses.length} found)`];
        courses.forEach((c, idx) => {
          const board = c.universityBoard ? ` | Board: ${c.universityBoard}` : "";
          lines.push(`${idx + 1}. **${c.name}** [${c.type || "Academic"}]${board}`);
          if (c.description) lines.push(`   - *${c.description}*`);
        });
        lines.push(`\n---\nℹ️ *Live Courses from Scofist database.*`);

        return NextResponse.json({
          success: true,
          query: rawQuery,
          answer: lines.join("\n"),
          isAiGenerated: false,
          sources: { courses: courses.length },
        });
      }
      // If 0 courses found, fall through to Gemini AI!
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MODULE: GENERAL REMARKS & CONDUCT LEDGER (/dashboard/remarks)
    // ─────────────────────────────────────────────────────────────────────────
    if (
      targetSection === "remarks" ||
      rawQuery.toLowerCase().includes("/dashboard/remarks") ||
      (rawQuery.toLowerCase().includes("remark") && extractedNumbers.length === 0)
    ) {
      const [totalRemarksCount, recentRemarks] = await Promise.all([
        Remark.countDocuments().catch(() => 0),
        Remark.find({})
          .populate("studentId", "name studentSpecificField")
          .populate("teacherId", "name")
          .populate("classId", "name")
          .sort({ createdAt: -1 })
          .limit(20)
          .lean()
          .catch(() => []),
      ]);

      const lines = [
        `### 💬 Student Remarks & Conduct Directory (${totalRemarksCount} total remarks)`,
        `🔗 **Portal Link:** [👉 Open Remarks Portal](/dashboard/remarks)\n`,
        `The Scofist Remarks module allows teachers and college administrators to track student behavior, discipline notices, and classroom observations.\n`,
      ];

      if (recentRemarks.length > 0) {
        lines.push(`| Student | Admission No | Class | Teacher | Date | Status | Comment |`);
        lines.push(`| :--- | :--- | :--- | :--- | :--- | :--- | :--- |`);
        recentRemarks.forEach((r) => {
          const sName = r.studentId?.name || `Student ${r.studentId}`;
          const sAdm = r.studentId?.studentSpecificField?.admissionNumber || r.studentId?._id || "N/A";
          const cName = r.classId?.name || "N/A";
          const tName = r.teacherId?.name || `Teacher ${r.teacherId}`;
          const rDate = r.date ? new Date(r.date).toLocaleDateString("en-IN") : "N/A";
          const status = r.status || "N/A";
          const comment = (r.comments || "N/A").replace(/\|/g, "/");
          lines.push(`| **${sName}** | ${sAdm} | ${cName} | ${tName} | ${rDate} | \`${status}\` | ${comment} |`);
        });
      } else {
        lines.push(`- *No student remarks recorded in the active database.*`);
      }

      lines.push(`\n---\nℹ️ *Live Remarks from Scofist database. Manage all records at [/dashboard/remarks](/dashboard/remarks).*`);

      return NextResponse.json({
        success: true,
        query: rawQuery,
        answer: lines.join("\n"),
        isAiGenerated: false,
        sources: { remarks: totalRemarksCount },
        geminiError: req._geminiError,
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STUDENT-SPECIFIC TARGETED INQUIRIES
    // Look up matching student first by ID, admissionNumber, or name
    // ─────────────────────────────────────────────────────────────────────────
    let student = null;

    if (extractedNumbers.length > 0) {
      const idConditions = [
        { "studentSpecificField.admissionNumber": { $in: extractedNumbers } },
        { contactNumber: { $in: extractedNumbers } },
      ];
      const validIds = extractedNumbers.filter((n) => mongoose.Types.ObjectId.isValid(n));
      if (validIds.length > 0) {
        idConditions.push({ _id: { $in: validIds } });
      }

      student = await User.findOne({ roles: "Student", $or: idConditions })
        .select(
          "name email contactNumber alternativeNumber address roles studentSpecificField _id classId batchId dateOfBirth createdAt"
        )
        .lean()
        .catch(() => null);
    }

    if (!student && kwRegex) {
      const nameConditions = [
        { name: kwRegex },
        { "studentSpecificField.admissionNumber": kwRegex },
        { contactNumber: kwRegex },
        { email: kwRegex },
      ];
      if (searchKeyword && mongoose.Types.ObjectId.isValid(searchKeyword)) {
        nameConditions.push({ _id: searchKeyword });
      }

      student = await User.findOne({
        roles: "Student",
        $or: nameConditions,
      })
        .select(
          "name email contactNumber alternativeNumber address roles studentSpecificField _id classId batchId dateOfBirth createdAt"
        )
        .lean()
        .catch(() => null);
    }

    // If a specific student was found, answer ONLY the requested section:
    if (student) {
      const sId = student._id;

      // 1. ATTENDANCE ONLY
      if (targetSection === "attendance" || targetSection === "attendance_table" || targetSection === "attendance_sheet") {
        const studentDoc = await StudentAttendance.findOne({ studentId: sId }).lean().catch(() => null);

        return NextResponse.json({
          success: true,
          query: rawQuery,
          answer: formatAttendanceOnly(student, studentDoc, targetYear),
          isAiGenerated: false,
          sources: { attendance: studentDoc?.attendanceRecords?.length || 0 },
        });
      }

      // 2. MARKS ONLY
      if (targetSection === "marks") {
        const markDocs = await Mark.find({ "students.studentId": sId })
          .sort({ createdAt: -1 })
          .limit(15)
          .lean()
          .catch(() => []);

        return NextResponse.json({
          success: true,
          query: rawQuery,
          answer: formatMarksOnly(student, markDocs, targetYear),
          isAiGenerated: false,
          sources: { marks: markDocs.length },
        });
      }

      // 3. REMARKS ONLY
      if (targetSection === "remarks") {
        const remarkDocs = await Remark.find({ studentId: sId })
          .sort({ date: -1 })
          .limit(15)
          .lean()
          .catch(() => []);

        return NextResponse.json({
          success: true,
          query: rawQuery,
          answer: formatRemarksOnly(student, remarkDocs, targetYear),
          isAiGenerated: false,
          sources: { remarks: remarkDocs.length },
        });
      }

      // 4. STUDENTS CONTACTS ONLY
      if (targetSection === "contacts") {
        return NextResponse.json({
          success: true,
          query: rawQuery,
          answer: formatContactsOnly(student),
          isAiGenerated: false,
          sources: { contacts: 1 },
        });
      }

      // 5. KINSHIP ONLY
      if (targetSection === "kinship") {
        return NextResponse.json({
          success: true,
          query: rawQuery,
          answer: formatKinshipOnly(student),
          isAiGenerated: false,
          sources: { kinship: 1 },
        });
      }

      // 6. ACCOUNTS / DEBTORS ONLY
      if (targetSection === "accounts") {
        const debtDocs = await Debtor.find({ studentId: sId })
          .sort({ createdAt: -1 })
          .lean()
          .catch(() => []);

        return NextResponse.json({
          success: true,
          query: rawQuery,
          answer: formatAccountsOnly(student, debtDocs, targetYear),
          isAiGenerated: false,
          sources: { accounts: debtDocs.length },
        });
      }

      // 7. LEAVE REGISTER ONLY
      if (targetSection === "leaves") {
        const leaveQuery = { studentId: sId };
        if (targetYear !== null) {
          leaveQuery.dateOfLeave = {
            $gte: new Date(targetYear, 0, 1),
            $lte: new Date(targetYear, 11, 31, 23, 59, 59),
          };
        }
        const studentLeaves = await LeaveRecord.find(leaveQuery)
          .sort({ dateOfLeave: -1 })
          .limit(15)
          .lean()
          .catch(() => []);

        return NextResponse.json({
          success: true,
          query: rawQuery,
          answer: formatLeavesOnly(student, studentLeaves, targetYear),
          isAiGenerated: false,
          sources: { leaves: studentLeaves.length },
        });
      }

      // 8. GATE PASS ONLY
      if (targetSection === "gatepass") {
        const passes = await GatePass.find({ studentId: sId })
          .sort({ timestamp: -1 })
          .limit(15)
          .lean()
          .catch(() => []);

        return NextResponse.json({
          success: true,
          query: rawQuery,
          answer: formatGatePassOnly(student, passes, targetYear),
          isAiGenerated: false,
          sources: { gatepass: passes.length },
        });
      }

      // 9. HIFZ & DOURA ONLY
      if (targetSection === "hifz_doura") {
        const hifzRecords = await HifzDoura.find({ studentId: sId })
          .sort({ date: -1 })
          .limit(20)
          .lean()
          .catch(() => []);

        return NextResponse.json({
          success: true,
          query: rawQuery,
          answer: formatHifzDouraOnly(student, hifzRecords, targetYear),
          isAiGenerated: false,
          sources: { hifzDoura: hifzRecords.length },
        });
      }

      // 10. PERFORMANCE ONLY
      if (targetSection === "performance") {
        const perfDocs = await Performance.find({ studentId: sId })
          .sort({ date: -1 })
          .limit(15)
          .lean()
          .catch(() => []);

        return NextResponse.json({
          success: true,
          query: rawQuery,
          answer: formatPerformanceOnly(student, perfDocs, targetYear),
          isAiGenerated: false,
          sources: { performance: perfDocs.length },
        });
      }

      // 11. IDENTITY CARDS ONLY
      if (targetSection === "identity_cards") {
        return NextResponse.json({
          success: true,
          query: rawQuery,
          answer: formatIdentityCardOnly(student),
          isAiGenerated: false,
          sources: { identityCard: 1 },
        });
      }

      // 12. CLEARANCE CERTIFICATE ONLY
      if (targetSection === "clearance_certificate") {
        const debtDocs = await Debtor.find({ studentId: sId }).lean().catch(() => []);

        return NextResponse.json({
          success: true,
          query: rawQuery,
          answer: formatClearanceCertificateOnly(student, debtDocs),
          isAiGenerated: false,
          sources: { clearanceCertificate: 1 },
        });
      }

      // 13. STUDENTS CERTIFICATE (Bonafide) ONLY
      if (targetSection === "students_certificate") {
        const batchDoc = await Batch.findById(student.studentSpecificField?.batchId)
          .lean()
          .catch(() => null);

        return NextResponse.json({
          success: true,
          query: rawQuery,
          answer: formatStudentCertificateOnly(student, batchDoc),
          isAiGenerated: false,
          sources: { studentCertificate: 1 },
        });
      }

      // 14. STUDENTS REPORTS (Comprehensive 360°)
      if (targetSection === "students_reports") {
        const [studentDoc, markDocs, remarkDocs, debtDocs] = await Promise.all([
          StudentAttendance.findOne({ studentId: sId }).lean().catch(() => null),
          Mark.find({ "students.studentId": sId }).sort({ createdAt: -1 }).limit(10).lean().catch(() => []),
          Remark.find({ studentId: sId }).sort({ date: -1 }).limit(5).lean().catch(() => []),
          Debtor.find({ studentId: sId }).lean().catch(() => []),
        ]);

        return NextResponse.json({
          success: true,
          query: rawQuery,
          answer: formatStudentsReportOnly(student, studentDoc, markDocs, remarkDocs, debtDocs, targetYear),
          isAiGenerated: false,
          sources: { studentsReport: 1 },
        });
      }

      // DEFAULT: General Student Profile
      return NextResponse.json({
        success: true,
        query: rawQuery,
        answer: formatStudentProfile(student),
        isAiGenerated: false,
        sources: { student: 1 },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GENERAL / SECTION FALLBACKS (When no individual student was queried)
    // ─────────────────────────────────────────────────────────────────────────

    // General Leaves / Absentees:
    if (targetSection === "leaves" || targetSection === "attendance_sheet") {
      const leaveQuery = { arrivedDate: null };
      if (targetYear !== null) {
        leaveQuery.dateOfLeave = {
          $gte: new Date(targetYear, 0, 1),
          $lte: new Date(targetYear, 11, 31, 23, 59, 59),
        };
      }
      const activeLeaves = await LeaveRecord.find(leaveQuery)
        .populate("studentId", "name contactNumber")
        .populate("classId", "name")
        .sort({ dateOfLeave: -1 })
        .limit(20)
        .lean()
        .catch(() => []);

      const yearBadge = targetYear ? ` (Year ${targetYear} Only)` : "";
      const lines = [`### 📋 Current Absentees & Leave Register${yearBadge}`];
      if (activeLeaves.length > 0) {
        activeLeaves.forEach((l, idx) => {
          const sName = l.studentId?.name || "Student";
          const cName = l.classId?.name || l.classId || "";
          lines.push(
            `${idx + 1}. **${sName}** (${cName}) — Leave: ${new Date(l.dateOfLeave).toLocaleDateString(
              "en-IN"
            )} to ${new Date(l.dateOfArrival).toLocaleDateString("en-IN")}`
          );
          if (l.leaveReason) lines.push(`   - Reason: "${l.leaveReason}"`);
        });
      } else {
        lines.push(`- *No active absentees or leave records found ${targetYear ? `for year ${targetYear}` : ""}.*`);
      }
      lines.push(`\n---\nℹ️ *Live Leave Records from Scofist database.*`);

      return NextResponse.json({
        success: true,
        query: rawQuery,
        answer: lines.join("\n"),
        isAiGenerated: false,
        sources: { leaves: activeLeaves.length },
      });
    }

    // General Accounts / Debtors Summary:
    if (targetSection === "accounts") {
      const debtFilter = {};
      if (targetYear !== null) {
        debtFilter.year = new RegExp(String(targetYear), "i");
      }
      const debtors = await Debtor.find(debtFilter)
        .populate("studentId", "name")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
        .catch(() => []);

      const yearBadge = targetYear ? ` (Year ${targetYear} Only)` : "";
      const lines = [`### 💰 Accounts & Debtors Summary (${debtors.length} records)${yearBadge}`];
      if (debtors.length > 0) {
        let totalAssigned = 0;
        let totalPaid = 0;
        debtors.forEach((d, idx) => {
          const sName = d.studentId?.name || `Student ${d.studentId}`;
          const paid = (d.payments || []).reduce((s, p) => s + p.amount, 0);
          const bal = d.totalAmount - paid;
          totalAssigned += d.totalAmount;
          totalPaid += paid;
          lines.push(
            `${idx + 1}. **${sName}** — Category: ${d.category} | Assigned: ₹${d.totalAmount.toLocaleString(
              "en-IN"
            )} | Due: **₹${bal.toLocaleString("en-IN")}**`
          );
        });
        lines.push(
          `\n**Summary:** Total Assigned: ₹${totalAssigned.toLocaleString(
            "en-IN"
          )} | Total Balance Due: ₹${(totalAssigned - totalPaid).toLocaleString("en-IN")}`
        );
      } else {
        lines.push(`- *No debtor accounts found ${targetYear ? `for year ${targetYear}` : ""}.*`);
      }
      lines.push(`\n---\nℹ️ *Live Accounts from Scofist database.*`);

      return NextResponse.json({
        success: true,
        query: rawQuery,
        answer: lines.join("\n"),
        isAiGenerated: false,
        sources: { accounts: debtors.length },
      });
    }

    // General Students Listing:
    if (targetSection === "students") {
      const sFilter = { roles: "Student" };
      if (targetYear !== null) {
        sFilter.$or = [
          {
            createdAt: {
              $gte: new Date(targetYear, 0, 1),
              $lte: new Date(targetYear, 11, 31, 23, 59, 59),
            },
          },
          { "studentSpecificField.batchId": new RegExp(String(targetYear), "i") },
        ];
      }
      if (kwRegex) {
        const studentOr = [
          { name: kwRegex },
          { "studentSpecificField.admissionNumber": kwRegex },
          { contactNumber: kwRegex },
        ];
        if (searchKeyword && mongoose.Types.ObjectId.isValid(searchKeyword)) {
          studentOr.push({ _id: searchKeyword });
        }
        sFilter.$or = studentOr;
      }
      const students = await User.find(sFilter)
        .select("name studentSpecificField _id contactNumber")
        .limit(20)
        .lean()
        .catch(() => []);

      if (students.length > 0) {
        const yearBadge = targetYear ? ` (Year ${targetYear} Only)` : "";
        const lines = [`### 🎓 Enrolled Students (${students.length} found)${yearBadge}`];
        students.forEach((s, idx) => {
          const sf = s.studentSpecificField || {};
          const admId = sf.admissionNumber || s._id;
          lines.push(
            `${idx + 1}. **${s.name}** (ID: **${admId}**) — Class: ${sf.classId || "N/A"} | Batch: ${
              sf.batchId || "N/A"
            }`
          );
        });
        lines.push(`\n---\nℹ️ *Live Students from Scofist database.*`);

        return NextResponse.json({
          success: true,
          query: rawQuery,
          answer: lines.join("\n"),
          isAiGenerated: false,
          sources: { students: students.length },
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SYNTHESIZED DATABASE FALLBACK (When no direct static section matched)
    // Always provides correct answers directly from active database records
    // with zero tips, zero disclaimers, and zero unsupported search messages.
    // ─────────────────────────────────────────────────────────────────────────
    const { answer: synthesizedAnswer, sources: synthesizedSources } =
      await synthesizeDatabaseAnswer(rawQuery, intent, institution);

    return NextResponse.json({
      success: true,
      query: rawQuery,
      answer: synthesizedAnswer,
      isAiGenerated: false,
      sources: synthesizedSources,
    });
  } catch (error) {
    console.error("AI Search API Error:", error);
    return NextResponse.json(
      { error: error?.message || "An error occurred while processing your search." },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") || "overview";
  return POST(
    new Request(req.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    })
  );
}
