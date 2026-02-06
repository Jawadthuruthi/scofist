import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import StudentsFund from "@/models/StudentsFund";
import { apiResponse } from "@/lib/apiResponse";

export async function GET(req, res) {
  try {
    await connectToDB();
    const url = new URL(req.url);
    const searchParams = {};
    for (const [key, value] of url.searchParams.entries()) {
      searchParams[key] = value;
    }

    const query = {};
    if (searchParams.studentId) {
      query.studentId = searchParams.studentId;
    } else {
      query.studentId = { $exists: false };
    }

    // Hybrid Fund Logic
    if (searchParams.department) {
      query.department = searchParams.department;
      query.fundType = "Department";
    } else if (searchParams.teacherId) {
      query.teacherId = searchParams.teacherId;
      // Allow legacy docs (missing fundType) or new docs (fundType="Individual")
      query.$or = [{ fundType: "Individual" }, { fundType: { $exists: false } }];
    }

    if (searchParams.batchId) {
      query.batchId = searchParams.batchId;
    }

    const studentFund = await StudentsFund.findOne(query);

    // Query for "All Students Balance" list
    const allStudentsQuery = {
      batchId: searchParams.batchId,
      balance: { $ne: 0 },
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

    const allStudentsFund = await StudentsFund.find(allStudentsQuery)
      .populate("studentId")
      .sort({ updatedAt: -1 });

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
      balance,
      transaction,
      department,
      fundType = "Individual",
    } = await req.json();

    const query = {
      batchId,
    };

    if (fundType === "Department" && department) {
      query.department = department;
    } else {
      query.teacherId = teacherId;
    }

    if (studentId) {
      query.studentId = studentId;
    } else {
      query.studentId = { $exists: false };
    }

    let studentFund = await StudentsFund.findOne(query);

    if (!studentFund) {
      const newStudentsFundData = {
        ...query,
        balance,
        transactions: [{ ...transaction, date: new Date() }],
        fundType, // Ensure fundType is set for new docs
      };
      // Clean up query artifacts from newStudentsFundData if necessary
      delete newStudentsFundData.$or;

      if (studentId) {
        newStudentsFundData.studentId = studentId;
      }
      // Explicitly set teacherId if it's an Individual fund (it might be in query, but good to be safe)
      if (fundType === "Individual") {
        newStudentsFundData.teacherId = teacherId;
      }

      studentFund = new StudentsFund(newStudentsFundData);
    } else {
      studentFund.balance = balance;
      studentFund.transactions.push({ ...transaction, date: new Date() });

      // Migration: Ensure fundType is set if it was missing
      if (!studentFund.fundType) {
        studentFund.fundType = "Individual";
      }
    }

    await studentFund.save();

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

    const query = {
      batchId,
    };

    if (studentId) {
      query.studentId = studentId;
    } else {
      query.studentId = { $exists: false };
    }

    if (fundType === "Department" && department) {
      query.department = department;
    } else {
      query.teacherId = teacherId;
    }

    const studentFund = await StudentsFund.findOneAndUpdate(
      query,
      {
        $set: {
          transactions: [],
          fundType: fundType, // Migrate on update
        },
      },
      { new: true }
    );
    return NextResponse.json({ studentFund }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error);
  }
}
