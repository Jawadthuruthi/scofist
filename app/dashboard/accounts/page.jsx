
import { getFinanceSummary } from "@/libservices/financeService";
import AccountsClient from "./AccountsClient";

export const dynamic = "force-dynamic"; // Ensure real-time updates

export default async function AccountsPage() {
    const summary = await getFinanceSummary();
    // Prioritize API_KEY since we are on the server, ensuring we match what middleware expects
    const apiKey = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
            </div>
            <AccountsClient initialSummary={summary} apiKey={apiKey} />
        </div>
    );
}
