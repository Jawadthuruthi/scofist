import StudentsCertificate from "@/components/StudentsCertificate";
import Header from "@/components/Header";
import { headers } from "next/headers";
import { cookies } from "next/headers";

export default async function StudentsCertificatePage() {
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
        <div className="h-full flex flex-col print:block print:h-auto print:p-0 space-y-4">
            <Header title="STUDENTS CERTIFICATE" subTitle="Generate and print student certificates." />
            <div className="flex-1 min-h-0 print:block print:h-auto print:overflow-visible">
                <StudentsCertificate apiKey={apiKey} userId={userId} userRole={userRole} />
            </div>
        </div>
    );
}
