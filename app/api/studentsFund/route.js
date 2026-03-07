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

    // IF getAll is present, fetch ALL funds for this student
    if (searchParams.getAll && searchParams.studentId) {
      const query = { studentId: searchParams.studentId };
      if (searchParams.batchId) {
        query.batchId = searchParams.batchId;
      }

      const studentFunds = await StudentsFund.find(query).populate("teacherId", "name"); // Get teacher name for label

      return NextResponse.json({ studentFunds }, { status: 200 });
    }

    const projections = {};
    if (searchParams.projection) {
      searchParams.projection.split(",").forEach((field) => {
        projections[field.trim()] = 1;
      });
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

    const studentFund = await StudentsFund.findOne(query, projections);

    // Query for "All Students Balance" list
    // Optimization: If specific studentId is requested, we might not need allStudentsFund unless specifically asked
    let allStudentsFund = [];
    if (!searchParams.studentId || searchParams.includeSummary === "true") {
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

      allStudentsFund = await StudentsFund.find(allStudentsQuery)
        .populate("studentId", "name profilePic studentSpecificField.admissionNumber") // Optimized population
        .sort({ updatedAt: -1 })
        .lean();
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

    const query = {
      batchId,
      fundType, // Include fundType to ensure partialFilterExpression of unique index is met
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

    const amountChange =
      transaction.type === "Deposit"
        ? transaction.amount
        : -transaction.amount;

    // Define the update operation
    const update = {
      $inc: { balance: amountChange },
      $push: { transactions: { ...transaction, date: new Date() } },
      $setOnInsert: {
        // fundType, // Already in query
        // ...query, // Already in query
      },
    };

    // Use findOneAndUpdate with upsert: true
    const studentFund = await StudentsFund.findOneAndUpdate(query, update, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });

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
