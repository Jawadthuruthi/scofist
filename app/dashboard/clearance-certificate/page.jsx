import ClearanceCertificate from "@/components/ClearanceCertificate";
import { headers } from "next/headers";
import { cookies } from "next/headers";

export default async function ClearanceCertificatePage() {
    const headersList = headers();
    const apiKey = process.env.API_KEY;

    let userId = "";
    try {
        const userHeader = headersList.get("x-user");
        if (userHeader) {
            const user = JSON.parse(userHeader);
            userId = user._id || user.userId;
        }
    } catch (e) {
        console.error("Failed to parse x-user header", e);
    }

    const cookieStore = cookies();
    const userRole = cookieStore.get("active-role")?.value || "College Admin";

    return (
        <div className="p-4 h-full flex flex-col print:block print:h-auto print:p-0">
            <div className="mb-6 print:hidden">
                <h1 className="text-2xl font-bold tracking-tight uppercase">CLEARANCE CERTIFICATE</h1>
                <p className="text-muted-foreground">Generate and print clearance certificates.</p>
            </div>
            <div className="flex-1 min-h-0 print:block print:h-auto print:overflow-visible">
                <ClearanceCertificate apiKey={apiKey} userId={userId} userRole={userRole} />
            </div>
        </div>
    );
}
