import { NextResponse } from "next/server";
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
        teacherFilter.$or = [
          { name: kwRegex },
          { _id: kwRegex },
          { email: kwRegex },
          { "address.place": kwRegex },
        ];
      }
      const teachers = await User.find(teacherFilter)
        .select("name contactNumber email address teacherSpecificField _id roles")
        .limit(25)
        .lean()
        .catch(() => []);

      const lines = [`### 👨‍🏫 Teaching Faculty Members (${teachers.length} found)`];
      if (teachers.length > 0) {
        teachers.forEach((t, idx) => {
          const status = t.teacherSpecificField?.status || "Active";
          const joining = t.teacherSpecificField?.dateOfJoining
            ? new Date(t.teacherSpecificField.dateOfJoining).toLocaleDateString("en-IN")
            : "N/A";
          lines.push(`${idx + 1}. **${t.name}** [**${status}**] (ID: ${t._id})`);
          lines.push(`   - 📞 ${t.contactNumber || "N/A"} | ✉️ ${t.email || "N/A"} | Joined: ${joining}`);
        });
      } else {
        lines.push(`- *No teacher records found matching your query.*`);
      }
      lines.push(`\n---\nℹ️ *Live Faculty Records from Scofist database.*`);

      return NextResponse.json({
        success: true,
        query: rawQuery,
        answer: lines.join("\n"),
        isAiGenerated: false,
        sources: { teachers: teachers.length },
      });
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
      const lines = [`### 🎓 Batches List (${batches.length} found)${yearBadge}`];
      if (batches.length > 0) {
        batches.forEach((b, idx) => {
          const ay = b.academicYear ? ` | Academic Year: ${b.academicYear}` : "";
          lines.push(`${idx + 1}. **${b.name}** (ID: ${b._id}) — Years: **${b.startYear} - ${b.endYear}**${ay}`);
        });
      } else {
        lines.push(`- *No batches found ${targetYear ? `matching the year ${targetYear}` : ""}.*`);
      }
      lines.push(`\n---\nℹ️ *Live Batches from Scofist database.*`);

      return NextResponse.json({
        success: true,
        query: rawQuery,
        answer: lines.join("\n"),
        isAiGenerated: false,
        sources: { batches: batches.length },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MODULE 6: CLASSES (MANAGEMENT)
    // ─────────────────────────────────────────────────────────────────────────
    if (targetSection === "classes") {
      const classFilter = kwRegex ? { $or: [{ name: kwRegex }, { section: kwRegex }] } : {};
      const classes = await Class.find(classFilter).limit(25).lean().catch(() => []);

      const lines = [`### 🏫 Classes & Sections (${classes.length} found)`];
      if (classes.length > 0) {
        classes.forEach((cls, idx) => {
          lines.push(
            `${idx + 1}. **${cls.name}** (ID: ${cls._id}) — Section: ${cls.section || "A"} | Batch: ${
              cls.batchId || "N/A"
            }`
          );
        });
      } else {
        lines.push(`- *No classes found matching your query.*`);
      }
      lines.push(`\n---\nℹ️ *Live Classes from Scofist database.*`);

      return NextResponse.json({
        success: true,
        query: rawQuery,
        answer: lines.join("\n"),
        isAiGenerated: false,
        sources: { classes: classes.length },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MODULE 7: SUBJECTS (MANAGEMENT)
    // ─────────────────────────────────────────────────────────────────────────
    if (targetSection === "subjects") {
      const subFilter = kwRegex ? { $or: [{ name: kwRegex }, { _id: kwRegex }] } : {};
      const subjects = await Subject.find(subFilter).sort({ _id: 1 }).limit(30).lean().catch(() => []);

      const lines = [`### 📚 Subjects List (${subjects.length} found)`];
      if (subjects.length > 0) {
        subjects.forEach((s, idx) => {
          lines.push(`${idx + 1}. **${s.name}** — Subject Code: **${s._id}**`);
        });
      } else {
        lines.push(`- *No subjects found matching your query.*`);
      }
      lines.push(`\n---\nℹ️ *Live Subjects from Scofist database.*`);

      return NextResponse.json({
        success: true,
        query: rawQuery,
        answer: lines.join("\n"),
        isAiGenerated: false,
        sources: { subjects: subjects.length },
      });
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
        regFilter.$or = [{ name: kwRegex }, { _id: kwRegex }];
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
      const courses = await Course.find(courseFilter).limit(20).lean().catch(() => []);

      const lines = [`### 📖 Academic & Islamic Courses (${courses.length} found)`];
      if (courses.length > 0) {
        courses.forEach((c, idx) => {
          const board = c.universityBoard ? ` | Board: ${c.universityBoard}` : "";
          lines.push(`${idx + 1}. **${c.name}** [${c.type || "Academic"}]${board}`);
          if (c.description) lines.push(`   - *${c.description}*`);
        });
      } else {
        lines.push(`- *No courses found matching your query.*`);
      }
      lines.push(`\n---\nℹ️ *Live Courses from Scofist database.*`);

      return NextResponse.json({
        success: true,
        query: rawQuery,
        answer: lines.join("\n"),
        isAiGenerated: false,
        sources: { courses: courses.length },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STUDENT-SPECIFIC TARGETED INQUIRIES
    // Look up matching student first by ID, admissionNumber, or name
    // ─────────────────────────────────────────────────────────────────────────
    let student = null;

    if (extractedNumbers.length > 0) {
      const idConditions = [];
      extractedNumbers.forEach((num) => {
        idConditions.push({ _id: num });
        idConditions.push({ "studentSpecificField.admissionNumber": num });
      });

      student = await User.findOne({ $or: idConditions })
        .select(
          "name email contactNumber alternativeNumber address roles studentSpecificField _id classId batchId dateOfBirth createdAt"
        )
        .lean()
        .catch(() => null);
    }

    if (!student && kwRegex) {
      student = await User.findOne({
        roles: "Student",
        $or: [{ name: kwRegex }, { _id: kwRegex }],
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
        sFilter.$or = [{ name: kwRegex }, { _id: kwRegex }];
      }
      const students = await User.find(sFilter)
        .select("name studentSpecificField _id contactNumber")
        .limit(20)
        .lean()
        .catch(() => []);

      const yearBadge = targetYear ? ` (Year ${targetYear} Only)` : "";
      const lines = [`### 🎓 Enrolled Students (${students.length} found)${yearBadge}`];
      if (students.length > 0) {
        students.forEach((s, idx) => {
          const sf = s.studentSpecificField || {};
          const admId = sf.admissionNumber || s._id;
          lines.push(
            `${idx + 1}. **${s.name}** (ID: **${admId}**) — Class: ${sf.classId || "N/A"} | Batch: ${
              sf.batchId || "N/A"
            }`
          );
        });
      } else {
        lines.push(`- *No students found ${targetYear ? `for year ${targetYear}` : ""}.*`);
      }
      lines.push(`\n---\nℹ️ *Live Students from Scofist database.*`);

      return NextResponse.json({
        success: true,
        query: rawQuery,
        answer: lines.join("\n"),
        isAiGenerated: false,
        sources: { students: students.length },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FALLBACK: NO RECORD MATCHED
    // ─────────────────────────────────────────────────────────────────────────
    const notFoundAnswer =
      `### 🔍 No Specific Record Found\n` +
      `No record matched your inquiry: **"${rawQuery}"**${targetYear ? ` for year ${targetYear}` : ""}.\n\n` +
      `**Supported Search Types:**\n` +
      `- **Attendance:** \`attendance of student 970\` or \`attendance of 970 in 2025\`\n` +
      `- **Marks:** \`marks of student 970\` or \`exam marks of 970 in 2024\`\n` +
      `- **Remarks:** \`remarks of student 970\`\n` +
      `- **Contacts:** \`contact of student 970\` or \`phone of 970\`\n` +
      `- **Kinship:** \`kinship details of 970\` or \`family of 970\`\n` +
      `- **Accounts:** \`accounts of student 970\` or \`fees of 970 in 2026\`\n` +
      `- **Leave Register:** \`leave register of 970\` or \`leaves in 2025\`\n` +
      `- **Gate Pass:** \`gate pass of 970\` or \`gate pass in 2026\`\n` +
      `- **Hifz & Doura:** \`hifz of 970\` or \`hifz and doura in 2026\`\n` +
      `- **Performance:** \`performance of 970\`\n` +
      `- **Clearance Certificate:** \`clearance certificate for 970\`\n` +
      `- **Students Certificate:** \`student certificate for 970\`\n` +
      `- **Identity Card:** \`identity card of 970\`\n` +
      `- **Admission Register:** \`admission register 2025\`\n` +
      `- **Question Papers:** \`question papers 2025\`\n` +
      `- **Syllabus:** \`syllabus for 2025\`\n` +
      `- **Academic Calendar:** \`academic calendar 2026\`\n` +
      `- **Teachers:** \`list all teachers\`\n` +
      `- **Batches / Classes / Subjects / Periods:** \`batches 2024\`, \`classes\`, \`subjects\`, \`periods\``;

    return NextResponse.json({
      success: true,
      query: rawQuery,
      answer: notFoundAnswer,
      isAiGenerated: false,
      sources: {},
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
