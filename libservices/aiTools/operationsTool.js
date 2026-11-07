import { tool } from "ai";
import { z } from "zod";
import connectToDB from "@/lib/db";
import GatePass from "@/models/GatePass";
import Debtor from "@/models/Debtor";
import Finance from "@/models/Finance";
import User from "@/models/User";
import { escapeRegex, buildNameSearchRegex } from "./utils.js";

export const operationsTool = () =>
  tool({
    description:
      "Check campus operations: pending student fee dues/debtors, active gate passes, or school financial transactions.",
    parameters: z.object({
      category: z
        .string()
        .optional()
        .default("debtor")
        .describe("Operational category: 'debtor' (or 'fees', 'dues') for pending student fees and dues, 'gatePass' (or 'gate_pass') for student gate passes, 'finance' for college cash transactions"),
      studentName: z.string().optional().describe("Student name for gate pass or fee debtor queries"),
      status: z.string().optional().describe("Status filter, e.g. 'Pending', 'Confirmed'"),
      financeType: z.enum(["Income", "Expense"]).optional().describe("Finance type for cash flow"),
    }),
    execute: async ({ category, studentName, status, financeType }) => {
      try {
        await connectToDB();

        // Normalize colloquial and snake_case variations (e.g. 'gate_pass', 'gate-pass', 'gatepass', 'fees')
        const rawCat = (category || "debtor").toLowerCase().replace(/[-_\s]/g, "");
        let targetCategory = "debtor";
        if (rawCat.includes("gate") || rawCat.includes("pass")) {
          targetCategory = "gatePass";
        } else if (rawCat.includes("finance") || rawCat.includes("cash") || rawCat.includes("income") || rawCat.includes("expense")) {
          targetCategory = "finance";
        } else {
          targetCategory = "debtor";
        }

        // Sub-case 1: Gate Pass
        if (targetCategory === "gatePass") {
          const query = {};
          if (status) query.status = status;

          if (studentName) {
            const nameRegex = buildNameSearchRegex(studentName) || new RegExp(escapeRegex(studentName), "i");
            const student = await User.findOne({
              name: nameRegex,
              roles: "Student",
            })
              .select("_id")
              .lean();

            if (!student) {
              return {
                category: "Gate Passes",
                count: 0,
                passes: [],
                message: `No student found matching '${studentName}'.`,
              };
            }
            query.studentId = student._id;
          }

          const passes = await GatePass.find(query)
            .populate("studentId", "name studentSpecificField")
            .sort({ timestamp: -1 })
            .limit(15)
            .maxTimeMS(2500)
            .lean();

          return {
            category: "Gate Passes",
            count: passes.length,
            passes: passes.map((p) => ({
              student: p.studentId?.name || "Unknown",
              admissionNo: p.studentId?.studentSpecificField?.admissionNumber || p.studentId?._id || "N/A",
              type: p.type,
              reason: p.reason || "N/A",
              status: p.status,
              time: p.timestamp ? new Date(p.timestamp).toISOString() : "N/A",
            })),
          };
        }

        // Sub-case 2: Debtor & Fee Dues (Default)
        if (targetCategory === "debtor") {
          const query = {};

          if (studentName) {
            const nameRegex = buildNameSearchRegex(studentName) || new RegExp(escapeRegex(studentName), "i");
            const student = await User.findOne({
              name: nameRegex,
              roles: "Student",
            })
              .select("_id")
              .lean();

            if (!student) {
              return {
                category: "Fee Debtors & Dues",
                count: 0,
                records: [],
                message: `No student found matching '${studentName}'.`,
              };
            }
            query.studentId = student._id;
          }

          const debtors = await Debtor.find(query)
            .populate("studentId", "name studentSpecificField")
            .limit(20)
            .maxTimeMS(2500)
            .lean();

          const records = debtors.map((d) => {
            const totalPaid = (d.payments || []).reduce((acc, p) => acc + (p.amount || 0), 0);
            const balance = (d.totalAmount || 0) - totalPaid;
            return {
              student: d.studentId?.name || "Unknown",
              admissionNo: d.studentId?.studentSpecificField?.admissionNumber || d.studentId?._id || "N/A",
              feeCategory: d.category,
              year: d.year,
              totalFee: `₹${d.totalAmount}`,
              paidAmount: `₹${totalPaid}`,
              balanceDue: `₹${balance}`,
              isCleared: balance <= 0,
            };
          });

          // Sort so students with highest balance due appear first
          records.sort((a, b) => {
            const balA = parseInt(a.balanceDue.replace(/[₹\s]/g, ""), 10) || 0;
            const balB = parseInt(b.balanceDue.replace(/[₹\s]/g, ""), 10) || 0;
            return balB - balA;
          });

          return {
            category: "Fee Debtors & Dues",
            totalRecords: records.length,
            records,
          };
        }

        // Sub-case 3: School Financial Cash Flow
        // Enforce accountType: "College" so College Admin is restricted to College accounts only
        if (targetCategory === "finance") {
          const query = { accountType: "College" };
          if (financeType) query.type = financeType;

          const transactions = await Finance.find(query)
            .sort({ date: -1 })
            .limit(10)
            .select("item amount type date category recipient")
            .maxTimeMS(2500)
            .lean();

          return {
            category: "College Financial Records",
            count: transactions.length,
            transactions: transactions.map((t) => ({
              item: t.item || t.recipient || "Operational Expense/Income",
              amount: `₹${t.amount}`,
              type: t.type,
              category: t.category,
              date: t.date ? new Date(t.date).toISOString().split("T")[0] : "N/A",
            })),
          };
        }

        return { message: "Invalid category requested." };
      } catch (error) {
        console.error("Operations tool execution error:", error);
        return {
          count: 0,
          records: [],
          message: `Unable to query campus operations: ${error.message}`,
        };
      }
    },
  });
