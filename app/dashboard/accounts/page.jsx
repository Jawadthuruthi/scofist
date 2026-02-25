
import connectToDB from "@/lib/db";
import Finance from "@/models/Finance";
import { getFinanceSummary } from "@/libservices/financeService";
import AccountsClient from "./AccountsClient";

export const dynamic = "force-dynamic"; // Ensure real-time updates

import { cookies } from "next/headers";

export default async function AccountsPage({ searchParams }) {
    const cookieStore = await cookies();
    const activeRole = cookieStore.get("active-role")?.value;
    const { accountName } = await searchParams;

    let accountType = "College";
    if (activeRole === "Org Admin") {
        accountType = "Org";
    } else if (activeRole === "Stationary") {
        accountType = "Stationary";
    } else if (activeRole === "IT Lab") {
        accountType = "IT Lab";
    }

    let summary = null;
    let allCategories = [];
    try {
        summary = await getFinanceSummary(accountType, accountName);

        // Fetch all categories globally for this accountType across all years
        await connectToDB();
        allCategories = await Finance.distinct("category", { accountType });
        allCategories = allCategories.filter(Boolean); // Remove empty/null categories
    } catch (error) {
        console.error("Error fetching finance summary:", error);
        // Fallback or handle error gracefully so page doesn't crash
    }
    // Prioritize API_KEY since we are on the server, ensuring we match what middleware expects
    const apiKey = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY;

    return (
        <div className="p-2 space-y-4">
            <div className="mb-2">
                <h1 className="font-bold text-xl md:text-2xl tracking-tight uppercase">ACCOUNTS {accountType !== "College" ? `(${accountType})` : ""}</h1>
                <p className="text-muted-foreground">Manage your financial transactions</p>
            </div>
            <AccountsClient initialSummary={summary} apiKey={apiKey} accountType={accountType} accountName={accountName} allCategories={allCategories} />
        </div>
    );
}
