import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import StudentsFund from "@/models/StudentsFund";
import { apiResponse } from "@/lib/apiResponse";

export async function POST(req) {
    try {
        await connectToDB();
        const {
            batchId,
            studentIds,
            transaction,
            teacherId,
            department,
            fundType = "Individual",
        } = await req.json();

        console.log("Bulk Transaction Payload:", {
            batchId,
            studentIdsCount: studentIds?.length,
            fundType,
            department
        });

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return NextResponse.json(
                { message: "No students selected" },
                { status: 400 }
            );
        }

        const results = {
            success: [],
            failed: [],
        };

        // Process each student sequentially to ensure data integrity
        // We could use Promise.all for speed, but sequential is safer for database load if many students
        for (const studentId of studentIds) {
            try {
                const query = {
                    batchId,
                    studentId,
                };

                if (fundType === "Department" && department) {
                    query.department = department;
                } else {
                    query.teacherId = teacherId;
                }

                let studentFund = await StudentsFund.findOne(query);

                if (!studentFund) {
                    const newStudentsFundData = {
                        batchId,
                        studentId,
                        balance: transaction.amount * (transaction.type === "Deposit" ? 1 : -1),
                        transactions: [{ ...transaction, date: new Date() }],
                        fundType,
                    };

                    if (fundType === "Department" && department) {
                        newStudentsFundData.department = department;
                    } else {
                        newStudentsFundData.teacherId = teacherId;
                    }

                    studentFund = new StudentsFund(newStudentsFundData);
                } else {
                    const amountChange =
                        transaction.type === "Deposit"
                            ? transaction.amount
                            : -transaction.amount;

                    studentFund.balance = (studentFund.balance || 0) + amountChange;
                    studentFund.transactions.push({ ...transaction, date: new Date() });

                    // Migration: Ensure fundType is set if it was missing
                    if (!studentFund.fundType) {
                        studentFund.fundType = "Individual";
                    }
                }

                await studentFund.save();
                results.success.push(studentId);
            } catch (error) {
                console.error(`Failed to update fund for student ${studentId}:`, error);
                results.failed.push({ studentId, error: error.message });
            }
        }

        return NextResponse.json(
            {
                message: "Bulk transaction processed",
                results,
            },
            { status: 200 }
        );
    } catch (error) {
        return apiResponse.error(error);
    }
}
