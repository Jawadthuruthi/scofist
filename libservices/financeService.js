
import connectToDB from "@/lib/db";
import Finance from "@/models/Finance";

export async function getFinanceSummary(accountType = "College") {
    await connectToDB();

    // Aggregation for summary
    const matchStage = { accountType }; // Filter by accountType provided

    const stats = await Finance.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: { mode: "$mode", type: "$type" },
                total: { $sum: "$amount" }
            }
        }
    ]);

    let cashIncome = 0;
    let cashExpense = 0;
    let bankIncome = 0;
    let bankExpense = 0;

    stats.forEach(s => {
        if (s._id.mode === "Cash") {
            if (s._id.type === "Income") cashIncome = s.total;
            if (s._id.type === "Expense") cashExpense = s.total;
        } else if (s._id.mode === "Bank") {
            if (s._id.type === "Income") bankIncome = s.total;
            if (s._id.type === "Expense") bankExpense = s.total;
        }
    });

    return {
        cashBalance: cashIncome - cashExpense,
        bankBalance: bankIncome - bankExpense,
        totalBalance: (cashIncome - cashExpense) + (bankIncome - bankExpense),
    };
}
