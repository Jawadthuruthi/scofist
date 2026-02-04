import connectToDB from "@/lib/db";
import Finance from "@/models/Finance";
import AccountName from "@/models/AccountName";
import { NextResponse } from "next/server";

export async function PUT(req) {
    try {
        await connectToDB();
        const body = await req.json();
        const { oldName, newName, accountType } = body;

        if (!newName || !accountType) {
            return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
        }

        // Determine query for finding records to update
        let query = { accountType };
        if (oldName) {
            query.accountName = oldName;
        } else {
            // If oldName is not provided (or empty), distinct from "null" in database?
            // Usually we want to capture null or empty string.
            query.accountName = { $in: [null, ""] };
        }

        // Bulk update all transactions with the old account name to the new account name
        // scoped by accountType
        console.log(`Renaming Account [${accountType}]: '${oldName}' -> '${newName}'`);

        const result = await Finance.updateMany(
            query,
            { $set: { accountName: newName } }
        );

        console.log("Finance Update Result:", result); // Debug log

        // Also update the AccountName persistent record

        // Also update the AccountName persistent record
        if (oldName) {
            // Rename existing
            await AccountName.updateOne(
                { name: oldName, accountType },
                { $set: { name: newName } }
            );
        } else {
            // "Unnamed" to "Named". Create/Upsert the new name if it doesn't exist.
            // We don't "rename" the null record because it doesn't exist in AccountName.
            // We just ensure "newName" exists.
            const exists = await AccountName.findOne({ name: newName, accountType });
            if (!exists) {
                await AccountName.create({ name: newName, accountType });
            }
        }

        return NextResponse.json({
            success: true,
            message: `Renamed ${result.modifiedCount} transactions.`,
            modifiedCount: result.modifiedCount
        });

    } catch (error) {
        console.error("Error renaming account name:", error);
        return NextResponse.json({ success: false, error: "Failed to rename account" }, { status: 500 });
    }
}
