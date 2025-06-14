import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import StudentsFund from "@/models/StudentsFund";
import { apiResponse } from "@/lib/apiResponse";
import { format } from "date-fns-tz";

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

    const allStudentsFund = await StudentsFund.find({
      teacherId: searchParams.teacherId,
      batchId: searchParams.batchId,
    }).populate("studentId");

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
    const now = new Date();
    const timeZone = "Asia/Kolkata";

    const istDate = format(now, "yyyy-MM-dd HH:mm:ss", { timeZone });
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
