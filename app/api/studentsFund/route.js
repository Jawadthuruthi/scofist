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
    }
    if (searchParams.teacherId) {
      query.teacherId = searchParams.teacherId;
    }
    if (searchParams.batchId) {
      query.batchId = searchParams.batchId;
    }

    const studentFund = await StudentsFund.findOne(query);
    const studentsFund = {};

    if (!query.studentId) {
      studentsFund = await StudentsFund.find(query);
    }

    return NextResponse.json({ studentFund, studentsFund }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function POST(req, res) {
  try {
    await connectToDB();
    const { studentId, teacherId, batchId, balance, transaction } =
      await req.json();
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istDate = new Date(now.getTime() + istOffset);
    const isStudentFundExist = await StudentsFund.findOne({
      studentId: studentId,
      batchId: batchId,
      teacherId: teacherId,
    });
    if (!isStudentFundExist) {
      const newStudentsFund = new StudentsFund({
        studentId,
        batchId,
        teacherId,
        balance,
        transactions: [{ ...transaction, date: istDate }],
      });
      await newStudentsFund.save();
      return NextResponse.json({ newStudentsFund }, { status: 200 });
    } else {
      const newStudentsFund = await StudentsFund.findOneAndUpdate(
        { studentId, batchId, teacherId },
        {
          balance,
          $push: {
            transactions: { ...transaction, date: istDate },
          },
        },
        { new: true }
      );
      return NextResponse.json({ newStudentsFund }, { status: 200 });
    }
  } catch (error) {
    return apiResponse.error(error);
  }
}
