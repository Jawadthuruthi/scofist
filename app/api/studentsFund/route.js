import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import StudentsFund from "@/models/StudentsFund";
import { apiResponse } from "@/lib/apiResponse";

export async function GET(req, res) {
  try {
    await connectToDB();
    const url = new URL(req.url);
    const studentId = url.searchParams.get("studentId");
    const studentFund = await StudentsFund.findOne({ studentId });
    return NextResponse.json({ studentFund }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function POST(req, res) {
  try {
    await connectToDB();
    const { studentId, transaction } = await req.json();
    const ISTDate = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });
    const isStudentFundExist = await StudentsFund.findOne({
      studentId: studentId,
    });
    if (!isStudentFundExist) {
      const newStudentsFund = new StudentsFund({
        studentId,
        transactions: [{ ...transaction, date: ISTDate }],
      });
      await newStudentsFund.save();
      return NextResponse.json({ newStudentsFund }, { status: 200 });
    } else {
      const newStudentsFund = await StudentsFund.findOneAndUpdate(
        { studentId },
        {
          $push: {
            transactions: { ...transaction, date: ISTDate },
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
