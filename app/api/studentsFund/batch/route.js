import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import StudentsFund from "@/models/StudentsFund";
import User from "@/models/User";
import { apiResponse } from "@/lib/apiResponse";

export async function POST(req, res) {
  try {
    await connectToDB();

    const { batchId, teacherId, transaction } = await req.json();

    // Find all students in the given batch
    const students = await User.find({
      "studentSpecificField.batchId": batchId,
      "studentSpecificField.status": "Active",
    });

    if (!students || students.length === 0) {
      return apiResponse.error("No students found in this batch", 404);
    }

    // Process transactions for each student
    const transactionPromises = students.map(async (student) => {
      const studentId = student._id;

      // Check if a fund document already exists for the student
      let studentFund = await StudentsFund.findOne({
        studentId,
        batchId,
        teacherId,
      });

      const transactionAmount = parseFloat(transaction.amount);
      const isDeposit = transaction.type === "Deposit";

      if (studentFund) {
        // If it exists, update the balance and add the transaction
        const currentBalance = studentFund.balance || 0;
        studentFund.balance = isDeposit
          ? currentBalance + transactionAmount
          : currentBalance - transactionAmount;

        studentFund.transactions.push({ ...transaction, date: new Date() });
        return studentFund.save();
      } else {
        // If it doesn't exist, create a new fund document
        const newBalance = isDeposit ? transactionAmount : -transactionAmount;
        const newStudentFund = new StudentsFund({
          studentId,
          batchId,
          teacherId,
          balance: newBalance,
          transactions: [{ ...transaction, date: new Date() }],
        });
        return newStudentFund.save();
      }
    });

    // Wait for all transaction promises to resolve
    await Promise.all(transactionPromises);

    return apiResponse.success(
      "Batch transaction completed successfully.",
      null,
      200
    );
  } catch (error) {
    console.error("Batch transaction failed:", error);
    return apiResponse.error(error.message, 500);
  }
}
