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
    if (searchParams.teacherId) {
      query.teacherId = searchParams.teacherId;
    }
    if (searchParams.batchId) {
      query.batchId = searchParams.batchId;
    }

    const studentFund = await StudentsFund.findOne(query);

    const allStudentsFund = await StudentsFund.find({
      teacherId: searchParams.teacherId,
      batchId: searchParams.batchId,
      balance: { $ne: 0 },
    })
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
    const { studentId, teacherId, batchId, balance, transaction } =
      await req.json();

    const query = {
      batchId,
      teacherId,
    };

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
      };
      if (studentId) {
        newStudentsFundData.studentId = studentId;
      }
      studentFund = new StudentsFund(newStudentsFundData);
    } else {
      studentFund.balance = balance;
      studentFund.transactions.push({ ...transaction, date: new Date() });
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
    const { studentId, teacherId, batchId } = await req.json();
    const studentFund = await StudentsFund.findOneAndUpdate(
      {
        studentId,
        teacherId,
        batchId,
      },
      {
        $set: {
          transactions: [],
        },
      }
    );
    return NextResponse.json({ studentFund }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error);
  }
}
