
import { getFinanceSummary } from "@/libservices/financeService";
import AccountsClient from "./AccountsClient";

export const dynamic = "force-dynamic"; // Ensure real-time updates

import { cookies } from "next/headers";

export default async function AccountsPage() {
    const cookieStore = await cookies();
    const activeRole = cookieStore.get("active-role")?.value;

    let accountType = "College";
    if (activeRole === "Org Admin") {
        accountType = "Org";
    }

    let summary = null;
    try {
        summary = await getFinanceSummary(accountType);
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
            <AccountsClient initialSummary={summary} apiKey={apiKey} accountType={accountType} />
        </div>
    );
}
