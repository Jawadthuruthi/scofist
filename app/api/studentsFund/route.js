import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import StudentsFund from "@/models/StudentsFund";
import User from "@/models/User";
import Batch from "@/models/Batch";
import Class from "@/models/Class";
import { apiResponse } from "@/lib/apiResponse";

export async function GET(req, res) {
  try {
    await connectToDB();
    const url = new URL(req.url);
    const searchParams = {};
    for (const [key, value] of url.searchParams.entries()) {
      searchParams[key] = value;
    }

    // IF getAll is present, fetch ALL funds for this student
    if (searchParams.getAll && searchParams.studentId) {
      const query = { studentId: searchParams.studentId };
      if (searchParams.batchId) {
        query.batchId = searchParams.batchId;
      }

      const studentFunds = await StudentsFund.find(query)
        .populate("teacherId", "name roles")
        .populate("transactions.performedBy", "name")
        .lean();

      return NextResponse.json({ studentFunds }, { status: 200 });
    }

    const projections = {};
    if (searchParams.projection) {
      searchParams.projection.split(",").forEach((field) => {
        projections[field.trim()] = 1;
      });
    }

    const filterConditions = [];

    if (searchParams.studentId) {
      if (searchParams.batchId && searchParams.studentId === searchParams.batchId) {
        filterConditions.push({
          $or: [
            { studentId: searchParams.studentId },
            { studentId: { $exists: false } },
            { studentId: null },
          ],
        });
        filterConditions.push({ batchId: searchParams.batchId });
      } else {
        filterConditions.push({ studentId: searchParams.studentId });
      }
    } else {
      filterConditions.push({
        $or: [
          { studentId: { $exists: false } },
          { studentId: null },
          ...(searchParams.batchId ? [{ studentId: searchParams.batchId }] : []),
        ],
      });
      if (searchParams.batchId) {
        filterConditions.push({ batchId: searchParams.batchId });
      }
    }

    // Hybrid Fund Logic
    if (searchParams.department) {
      filterConditions.push({ department: searchParams.department, fundType: "Department" });
    } else if (searchParams.teacherId) {
      filterConditions.push({
        teacherId: searchParams.teacherId,
        $or: [{ fundType: "Individual" }, { fundType: { $exists: false } }],
      });
    }

    const query = filterConditions.length > 0 ? { $and: filterConditions } : {};

    const studentFundsList = await StudentsFund.find(query, projections).sort({ updatedAt: -1 }).lean();

    let studentFund = null;
    if (studentFundsList.length > 0) {
      if (studentFundsList.length === 1) {
        studentFund = studentFundsList[0];
      } else {
        // Merge duplicates for this specific student
        studentFund = { ...studentFundsList[0] };
        studentFund.balance = studentFundsList.reduce((sum, fund) => sum + (fund.balance || 0), 0);
        studentFund.transactions = studentFundsList.reduce((acc, fund) => acc.concat(fund.transactions || []), []).sort((a, b) => new Date(b.date) - new Date(a.date));
      }
    }

    // Query for "All Students Balance" list
    // Optimization: If specific studentId is requested, we might not need allStudentsFund unless specifically asked
    let allStudentsFund = [];
    if (!searchParams.studentId || searchParams.includeSummary === "true") {
      const allStudentsQuery = {
        batchId: searchParams.batchId,
      };

      if (searchParams.department) {
        allStudentsQuery.department = searchParams.department;
        allStudentsQuery.fundType = "Department";
      } else if (searchParams.teacherId) {
        allStudentsQuery.teacherId = searchParams.teacherId;
        allStudentsQuery.$or = [
          { fundType: "Individual" },
          { fundType: { $exists: false } },
        ];
      }

      const rawFunds = await StudentsFund.find(allStudentsQuery)
        .populate("studentId", "name profilePic studentSpecificField.admissionNumber studentSpecificField.batchId studentSpecificField.classId") // Optimized population
        .sort({ updatedAt: -1 })
        .lean();

      // Deduplicate on the backend to prevent duplicate students in the list, but sum their balances!
      const uniqueStudentsMap = new Map();
      rawFunds.forEach(fund => {
        const studentId = fund.studentId?._id;
        if (studentId) {
          const idStr = studentId.toString();
          if (!uniqueStudentsMap.has(idStr)) {
            uniqueStudentsMap.set(idStr, { ...fund });
          } else {
            // merge balance and transactions for duplicates
            const existing = uniqueStudentsMap.get(idStr);
            existing.balance = (existing.balance || 0) + (fund.balance || 0);
            if (fund.transactions && fund.transactions.length > 0) {
              existing.transactions = (existing.transactions || []).concat(fund.transactions);
            }
          }
        }
      });
      allStudentsFund = Array.from(uniqueStudentsMap.values());
    }

    return NextResponse.json({ studentFund, allStudentsFund }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function POST(req, res) {
  try {
    await connectToDB();
    const {
      studentId,
      teacherId,
      batchId,
      transaction,
      department,
      fundType = "Individual",
    } = await req.json();

    if (!batchId) {
      return NextResponse.json(
        {
          success: false,
          error: "Batch ID is required",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    if (
      !transaction ||
      !transaction.type ||
      transaction.amount === undefined ||
      transaction.amount === null ||
      isNaN(Number(transaction.amount)) ||
      Number(transaction.amount) <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Valid transaction with type ('Deposit' or 'Withdrawal') and a positive amount is required.",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    transaction.amount = Number(transaction.amount);

    if (fundType === "Department") {
      if (!department) {
        return NextResponse.json(
          { message: "Department is required for Department funds" },
          { status: 400 }
        );
      }
    } else {
      if (!teacherId) {
        return NextResponse.json(
          { message: "Teacher ID is required for Individual funds" },
          { status: 400 }
        );
      }
    }

    const filterConditions = [];

    if (fundType === "Department" && department) {
      filterConditions.push({ department, fundType: "Department" });
    } else {
      filterConditions.push({
        teacherId,
        $or: [{ fundType: "Individual" }, { fundType: { $exists: false } }],
      });
    }

    if (studentId) {
      if (batchId && studentId === batchId) {
        filterConditions.push({
          $or: [
            { studentId: studentId },
            { studentId: { $exists: false } },
            { studentId: null },
          ],
        });
        filterConditions.push({ batchId });
      } else {
        filterConditions.push({ studentId });
      }
    } else {
      filterConditions.push({
        $or: [
          { studentId: { $exists: false } },
          { studentId: null },
          ...(batchId ? [{ studentId: batchId }] : []),
        ],
      });
      if (batchId) {
        filterConditions.push({ batchId });
      }
    }

    const query = { $and: filterConditions };

    const amountChange =
      transaction.type === "Deposit"
        ? transaction.amount
        : -transaction.amount;

    const sanitizeTx = (tx) => {
      if (!tx) return null;
      const raw = tx.toObject ? tx.toObject() : tx;
      const amount = Number(raw.amount);
      const type = raw.type;
      if (!type || !["Deposit", "Withdrawal"].includes(type) || isNaN(amount) || amount < 0) {
        return null;
      }
      return {
        ...raw,
        type,
        amount,
        date: raw.date ? new Date(raw.date) : new Date(),
      };
    };

    const sanitizeTxList = (list = []) => {
      return list.map(sanitizeTx).filter(Boolean);
    };

    // Find all existing records for this query
    const existingFunds = await StudentsFund.find(query).sort({ updatedAt: -1 });

    let studentFund;

    if (existingFunds.length > 1) {
      // We found duplicates! We need to merge them to fix the data pollution.
      const totalBalance = existingFunds.reduce((sum, f) => sum + (f.balance || 0), 0);
      const allTransactions = existingFunds.reduce((acc, f) => acc.concat(f.transactions || []), []);

      const primaryFund = existingFunds[0];
      const duplicateIds = existingFunds.slice(1).map(f => f._id);

      await StudentsFund.deleteMany({ _id: { $in: duplicateIds } });

      const newTotalBalance = totalBalance + amountChange;
      const validTransactions = sanitizeTxList([
        ...allTransactions,
        { ...transaction, date: new Date() },
      ]);
      validTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

      primaryFund.balance = newTotalBalance;
      primaryFund.transactions = validTransactions;
      primaryFund.batchId = batchId;
      primaryFund.studentId = studentId || undefined;
      primaryFund.fundType = fundType;
      if (fundType === "Department") {
        primaryFund.department = department;
      } else {
        primaryFund.teacherId = teacherId;
      }
      await primaryFund.save();

      studentFund = primaryFund;
    } else if (existingFunds.length === 1) {
      // Exactly 1 existing record
      const primaryFund = existingFunds[0];
      primaryFund.balance = (primaryFund.balance || 0) + amountChange;

      const cleanedExisting = sanitizeTxList(primaryFund.transactions || []);
      const newTx = sanitizeTx({ ...transaction, date: new Date() });
      primaryFund.transactions = newTx
        ? [...cleanedExisting, newTx]
        : cleanedExisting;

      primaryFund.batchId = batchId;
      if (studentId) {
        primaryFund.studentId = studentId;
      }
      primaryFund.fundType = fundType;
      if (fundType === "Department") {
        primaryFund.department = department;
      } else {
        primaryFund.teacherId = teacherId;
      }
      await primaryFund.save();

      studentFund = primaryFund;
    } else {
      // No record found, create a new one
      const newTx = sanitizeTx({ ...transaction, date: new Date() });
      studentFund = await StudentsFund.create({
        studentId: studentId || undefined,
        teacherId: fundType === "Department" ? undefined : teacherId,
        department: fundType === "Department" ? department : undefined,
        fundType,
        batchId,
        balance: amountChange,
        transactions: newTx ? [newTx] : [],
      });
    }

    return NextResponse.json({ newStudentsFund: studentFund }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function PUT(req, res) {
  try {
    await connectToDB();
    const {
      studentId,
      teacherId,
      batchId,
      department,
      fundType = "Individual",
    } = await req.json();

    const filterConditions = [];

    if (fundType === "Department" && department) {
      filterConditions.push({ department, fundType: "Department" });
    } else {
      filterConditions.push({
        teacherId,
        $or: [{ fundType: "Individual" }, { fundType: { $exists: false } }],
      });
    }

    if (studentId) {
      if (batchId && studentId === batchId) {
        filterConditions.push({
          $or: [
            { studentId: studentId },
            { studentId: { $exists: false } },
            { studentId: null },
          ],
        });
        filterConditions.push({ batchId });
      } else {
        filterConditions.push({ studentId });
      }
    } else {
      filterConditions.push({
        $or: [
          { studentId: { $exists: false } },
          { studentId: null },
          ...(batchId ? [{ studentId: batchId }] : []),
        ],
      });
      if (batchId) {
        filterConditions.push({ batchId });
      }
    }

    const query = { $and: filterConditions };

    // Get all records to consolidate and clear
    const existingFunds = await StudentsFund.find(query).sort({ updatedAt: -1 });

    let studentFund = null;
    if (existingFunds.length > 0) {
      // Pick the primary/newest fund to keep and update
      studentFund = existingFunds[0];
      const duplicateIds = existingFunds.slice(1).map(f => f._id);

      // Delete the duplicates completely
      if (duplicateIds.length > 0) {
        await StudentsFund.deleteMany({ _id: { $in: duplicateIds } });
      }

      // Clear the primary fund's transactions and set fundType
      studentFund = await StudentsFund.findByIdAndUpdate(
        studentFund._id,
        {
          $set: {
            transactions: [],
            studentId: studentId || undefined,
            fundType: fundType,
            batchId: batchId,
          },
        },
        { new: true }
      );
    } else {
      studentFund = await StudentsFund.create({
        studentId: studentId || undefined,
        teacherId: fundType === "Department" ? undefined : teacherId,
        department: fundType === "Department" ? department : undefined,
        fundType,
        batchId,
        balance: 0,
        transactions: [],
      });
    }
    return NextResponse.json({ studentFund }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error);
  }
}
