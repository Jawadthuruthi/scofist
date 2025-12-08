
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IndianRupee, Wallet, Building2, Calculator } from "lucide-react";

export default function FinanceStats({ summary }) {
    return (
        <div className="grid gap-4 md:grid-cols-3 mb-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Cash Balance</CardTitle>
                    <Wallet className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold flex items-center">
                        <IndianRupee className="h-4 w-4 mr-1" />
                        {summary?.cashBalance || 0}
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Bank Balance</CardTitle>
                    <Building2 className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold flex items-center">
                        <IndianRupee className="h-4 w-4 mr-1" />
                        {summary?.bankBalance || 0}
                    </div>
                </CardContent>
            </Card>
            <Card className="bg-slate-50 border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                    <Calculator className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-emerald-600 flex items-center">
                        <IndianRupee className="h-4 w-4 mr-1" />
                        {summary?.totalBalance || 0}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
