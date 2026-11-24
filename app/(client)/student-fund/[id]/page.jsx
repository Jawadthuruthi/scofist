import mongoose from "mongoose";
import connectToDB from "@/lib/db";
import User from "@/models/User";
import Class from "@/models/Class";
import Batch from "@/models/Batch";
import Settings from "@/models/Settings";
import StudentsFund from "@/models/StudentsFund";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import StudentFundClientView from "./StudentFundClientView";
import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  await connectToDB();

  const decodedId = id ? decodeURIComponent(id).trim() : "";
  const queries = [
    { _id: decodedId },
    { _id: decodedId.toUpperCase() },
    { "studentSpecificField.admissionNumber": decodedId },
    { admissionNumber: decodedId },
    { "studentSpecificField.admissionNumber": decodedId.toUpperCase() },
  ];
  if (mongoose.Types.ObjectId.isValid(decodedId)) {
    queries.push({ _id: new mongoose.Types.ObjectId(decodedId) });
  }

  const student = await User.findOne({ $or: queries })
    .select("name studentSpecificField admissionNumber")
    .lean();

  const studentName = student?.name || "Student";
  const admissionNo =
    student?.studentSpecificField?.admissionNumber ||
    student?.admissionNumber ||
    "";

  return {
    title: `Fund Statement - ${studentName}${admissionNo ? ` (${admissionNo})` : ""} | Scofist`,
    description: `Official student fund balance and transaction statement for ${studentName}`,
  };
}

export default async function StudentFundPage({ params }) {
  const { id } = await params;
  await connectToDB();

  const decodedId = id ? decodeURIComponent(id).trim() : "";
  const searchQueries = [
    { _id: decodedId },
    { _id: decodedId.toUpperCase() },
    { "studentSpecificField.admissionNumber": decodedId },
    { admissionNumber: decodedId },
    { "studentSpecificField.admissionNumber": decodedId.toUpperCase() },
  ];
  if (mongoose.Types.ObjectId.isValid(decodedId)) {
    searchQueries.push({ _id: new mongoose.Types.ObjectId(decodedId) });
  }

  // Find Student by _id, admission number, or ObjectId
  const student = await User.findOne({ $or: searchQueries })
    .select(
      "name email profilePic studentSpecificField classId batchId contactNumber place district admissionNumber"
    )
    .lean();

  // If student not found
  if (!student) {
    const settings = await Settings.findOne().lean();
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#070e0a]">
        <PublicHeader
          name={settings?.institution?.name}
          logo={settings?.institution?.logo}
        />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Student Record Not Found
            </h2>
            <p className="text-sm text-slate-500">
              We couldn&apos;t locate any student matching the identifier &ldquo;{id}&rdquo;. Please verify the QR code or link.
            </p>
            <div className="pt-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Return to Home
                </Link>
              </Button>
            </div>
          </div>
        </main>
        <PublicFooter
          institution={settings?.institution}
          logo={settings?.institution?.logo}
        />
      </div>
    );
  }

  // Student found, fetch Class, Batch, Settings, and Funds in parallel
  const studentIdStr = String(student._id);
  const classId = student.studentSpecificField?.classId || student.classId;
  const batchId = student.studentSpecificField?.batchId || student.batchId;

  const possibleStudentIds = [
    studentIdStr,
    studentIdStr.toUpperCase(),
    studentIdStr.toLowerCase(),
    student._id,
  ];
  if (student.studentSpecificField?.admissionNumber) {
    possibleStudentIds.push(String(student.studentSpecificField.admissionNumber));
    possibleStudentIds.push(String(student.studentSpecificField.admissionNumber).toUpperCase());
  }
  if (student.admissionNumber) {
    possibleStudentIds.push(String(student.admissionNumber));
    possibleStudentIds.push(String(student.admissionNumber).toUpperCase());
  }
  const uniqueStudentIds = [...new Set(possibleStudentIds.filter(Boolean))];

  const fundQueries = [{ studentId: { $in: uniqueStudentIds } }];
  if (mongoose.Types.ObjectId.isValid(studentIdStr)) {
    fundQueries.push({ studentId: new mongoose.Types.ObjectId(studentIdStr) });
  }

  const [settings, cls, batch, rawFunds] = await Promise.all([
    Settings.findOne().lean(),
    classId ? Class.findById(classId).select("name").lean() : null,
    batchId ? Batch.findById(batchId).select("name startYear endYear").lean() : null,
    StudentsFund.find({ $or: fundQueries })
      .populate("teacherId", "name roles")
      .populate("transactions.performedBy", "name")
      .lean(),
  ]);

  // Aggregate funds
  const formattedFunds = (rawFunds || []).map((fund) => {
    let label = "Students Fund";
    let subLabel = "";

    if (fund.fundType === "Department") {
      label = `${fund.department || "Department"} Fund`;
      const lastTx = fund.transactions?.[fund.transactions.length - 1];
      subLabel = lastTx?.performedBy?.name || fund.department || "";
    } else {
      subLabel = fund.teacherId?.name || "Class Teacher";
      const roles = fund.teacherId?.roles || [];
      if (roles.includes("Teacher")) {
        label = "Students Fund";
      } else if (roles.length > 0) {
        label = "Staff Fund";
      }
    }

    let fundBalance = fund.balance;
    if (typeof fundBalance !== "number" || isNaN(fundBalance)) {
      fundBalance = (fund.transactions || []).reduce((acc, t) => {
        const amt = Number(t.amount) || 0;
        return t.type === "Deposit" ? acc + amt : acc - amt;
      }, 0);
    }

    return {
      _id: String(fund._id),
      label,
      subLabel,
      balance: fundBalance || 0,
      fundType: fund.fundType,
      department: fund.department,
      transactions: fund.transactions || [],
    };
  });

  // Consolidate all transactions
  const allTransactions = [];
  formattedFunds.forEach((fund) => {
    (fund.transactions || []).forEach((t) => {
      allTransactions.push({
        _id: String(t._id || ""),
        amount: Number(t.amount) || 0,
        type: t.type,
        note: t.note || "",
        date: t.date ? new Date(t.date).toISOString() : new Date().toISOString(),
        performedByName: t.performedBy?.name || fund.subLabel || "",
        fundName: fund.label,
      });
    });
  });

  // Calculate chronological running balances
  const chronological = [...allTransactions].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  let running = 0;
  chronological.forEach((tx) => {
    if (tx.type === "Deposit") {
      running += tx.amount;
    } else {
      running -= tx.amount;
    }
    tx.runningBalance = running;
  });

  // Display newest first
  const sortedTransactions = [...chronological].reverse();

  // Compute summary stats
  const totalBalance = formattedFunds.reduce((sum, f) => sum + (f.balance || 0), 0);
  const totalDeposits = allTransactions
    .filter((t) => t.type === "Deposit")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalWithdrawals = allTransactions
    .filter((t) => t.type === "Withdrawal")
    .reduce((sum, t) => sum + t.amount, 0);

  const netFromTransactions = totalDeposits - totalWithdrawals;
  const resolvedTotalBalance = totalBalance !== 0 ? totalBalance : netFromTransactions;

  const summary = {
    totalBalance: resolvedTotalBalance,
    totalDeposits,
    totalWithdrawals,
    count: allTransactions.length,
  };

  const safeStudent = JSON.parse(JSON.stringify(student));
  const safeInstitution = JSON.parse(JSON.stringify(settings?.institution || {}));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#070e0a]">
      <PublicHeader
        name={settings?.institution?.name}
        logo={settings?.institution?.logo}
      />
      <main className="flex-1">
        <StudentFundClientView
          student={safeStudent}
          institution={safeInstitution}
          className={cls?.name || ""}
          batchName={batch?.name || ""}
          funds={formattedFunds}
          transactions={sortedTransactions}
          summary={summary}
        />
      </main>
      <PublicFooter
        institution={safeInstitution}
        logo={settings?.institution?.logo}
      />
    </div>
  );
}
