import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import GatePass from "@/models/GatePass";
import User from "@/models/User";
import Class from "@/models/Class"; // Ensure Class model is registered
import { cookies } from "next/headers";
import { apiResponse } from "@/lib/apiResponse";
import fs from 'fs';

function logToFile(msg) {
    try {
        fs.appendFileSync('d:\\Projects\\scofist\\gatepass_log.txt', `${new Date().toISOString()} - ${msg}\n`);
    } catch (e) { }
}

// Helper to format student/gatepass data consistently
const formatPass = (pass) => {
    if (!pass) return null;
    const doc = pass.toObject ? pass.toObject() : pass;
    const student = doc.studentId;

    return {
        ...doc,
        studentId: student ? {
            _id: student._id,
            name: student.name,
            profilePic: student.profilePic,
            className: student.studentSpecificField?.classId?.name || "N/A",
            classId: student.studentSpecificField?.classId?._id || student.studentSpecificField?.classId
        } : null
    };
};

export async function GET(req) {
    try {
        await connectToDB();
        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get("studentId");
        const limit = parseInt(searchParams.get("limit") || "15");

        const query = { status: "Confirmed" };
        if (studentId) {
            query.studentId = studentId.trim().toUpperCase();
        }

        const logs = await GatePass.find(query)
            .populate({
                path: "studentId",
                select: "name profilePic studentSpecificField",
                populate: {
                    path: "studentSpecificField.classId",
                    select: "name"
                }
            })
            .populate("recordedBy", "name")
            .populate("allowedBy", "name")
            .sort({ confirmedAt: -1 })
            .limit(limit);

        const formattedLogs = logs.map(formatPass);

        return NextResponse.json({ logs: formattedLogs }, { status: 200 });
    } catch (error) {
        logToFile(`GET Error: ${error.message}`);
        console.error("Error fetching gate pass logs:", error);
        return apiResponse.error(error);
    }
}

export async function POST(req) {
    try {
        await connectToDB();
        const body = await req.json();
        let { studentId, type, reason, allowedBy, action } = body;

        if (!studentId) {
            return NextResponse.json(
                { message: "Student ID is required" },
                { status: 400 }
            );
        }

        const searchId = studentId.trim().toUpperCase();
        logToFile(`POST Request - Action: ${action}, ID: ${searchId}, Type: ${type}, AllowedBy: ${allowedBy}`);

        const cookieStore = await cookies();
        const userId = cookieStore.get("userId")?.value || "System";

        if (action === "set") {
            if (!type) {
                return NextResponse.json(
                    { message: "Type (IN/OUT) is required" },
                    { status: 400 }
                );
            }

            // Verify student exists
            const student = await User.findById(searchId);
            if (!student || !student.roles.includes("Student")) {
                logToFile(`Set Error: Student record not found for ${searchId}`);
                return NextResponse.json(
                    { message: "Invalid Student ID" },
                    { status: 404 }
                );
            }

            const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

            const newPass = await GatePass.create({
                studentId: searchId,
                type,
                reason,
                allowedBy,
                status: "Pending",
                expiresAt,
                recordedBy: userId,
            });

            logToFile(`Set Success: ID=${newPass._id}, studentId=${newPass.studentId}, expiresAt=${expiresAt.toISOString()}`);

            return NextResponse.json(
                { message: "Permission set successfully. Valid for 15 minutes.", pass: newPass },
                { status: 201 }
            );
        } else if (action === "confirm") {
            const now = new Date();
            logToFile(`Confirm Attempt: ID=${searchId}, Time=${now.toISOString()}`);

            // Find a pending pass for this student that hasn't expired
            const pendingPass = await GatePass.findOne({
                studentId: searchId,
                status: "Pending",
                expiresAt: { $gt: now },
            }).sort({ createdAt: -1 });

            if (!pendingPass) {
                const expiredPass = await GatePass.findOne({
                    studentId: searchId,
                    status: "Pending",
                    expiresAt: { $lte: now }
                }).sort({ createdAt: -1 });

                if (expiredPass) {
                    logToFile(`Found EXPIRED pass for ${searchId}: ${expiredPass._id}`);
                    return NextResponse.json(
                        { message: "Pass has expired. Please set a new permission." },
                        { status: 404 }
                    );
                }

                logToFile(`No PENDING pass found for ${searchId}`);
                return NextResponse.json(
                    { message: "No valid pending pass found for this student. Please set permission first." },
                    { status: 404 }
                );
            }

            pendingPass.status = "Confirmed";
            pendingPass.confirmedAt = new Date();
            await pendingPass.save();

            logToFile(`Confirm Success: ID=${pendingPass._id} for ${searchId}`);

            // Populate student details for the response
            const fullPass = await GatePass.findById(pendingPass._id)
                .populate({
                    path: "studentId",
                    select: "name profilePic studentSpecificField",
                    populate: {
                        path: "studentSpecificField.classId",
                        select: "name"
                    }
                })
                .populate("allowedBy", "name");

            return NextResponse.json(
                {
                    message: "Gate pass confirmed!",
                    pass: formatPass(fullPass)
                },
                { status: 200 }
            );
        } else {
            return NextResponse.json(
                { message: "Invalid action" },
                { status: 400 }
            );
        }
    } catch (error) {
        logToFile(`CRITICAL ERROR in POST: ${error.message} - ${error.stack}`);
        console.error("Error processing gate pass:", error);
        return apiResponse.error(error);
    }
}

export async function DELETE(req) {
    try {
        await connectToDB();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { message: "ID is required" },
                { status: 400 }
            );
        }

        const deletedPass = await GatePass.findByIdAndDelete(id);

        if (!deletedPass) {
            return NextResponse.json(
                { message: "Record not found" },
                { status: 404 }
            );
        }

        logToFile(`DELETE Success: ID=${id}`);

        return NextResponse.json(
            { message: "Record deleted successfully" },
            { status: 200 }
        );
    } catch (error) {
        logToFile(`DELETE Error: ${error.message}`);
        return apiResponse.error(error);
    }
}
