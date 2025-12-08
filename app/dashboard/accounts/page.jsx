
import { getFinanceSummary } from "@/libservices/financeService";
import AccountsClient from "./AccountsClient";

export const dynamic = "force-dynamic"; // Ensure real-time updates

export default async function AccountsPage() {
    const summary = await getFinanceSummary();
    // Prioritize API_KEY since we are on the server, ensuring we match what middleware expects
    const apiKey = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY;

    return (
        <div className="p-2 space-y-4">
            <div className="mb-2">
                <h1 className="font-bold text-xl md:text-2xl tracking-tight uppercase">ACCOUNTS</h1>
                <p className="text-muted-foreground">Manage your financial transactions</p>
            </div>
            <AccountsClient initialSummary={summary} apiKey={apiKey} />
        </div>
    );
}
