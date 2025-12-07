import ErrorPage from "@/components/ErrorPage";
import LeaveHistory from "@/components/LeaveHistory";
import connectToDB from "@/lib/db";
import Class from "@/models/Class";
import User from "@/models/User";
import { parseUser } from "@/lib/utils";
import { cookies, headers } from "next/headers";

export default async function LeaveHistoryPage() {
    try {
        const apiKey = process.env.API_KEY;
        const headerStore = await headers();
        const cookiesStore = await cookies();
        const user = parseUser(headerStore);
        const activeRole = cookiesStore.get("active-role")?.value;

        await connectToDB();

        // Fetch Classes
        // If teacher, only fetch their class? Or all classes? Usually history allows seeing all or filtered.
        // Let's fetch all classes for dropdowns.
        const classesData = await Class.find({}).select("_id name").lean();

        // Fetch Students (Active only logic usually)
        // fetching ALL students might be heavy if there are thousands. 
        // But for dropdowns in DataTable form, we often pass them. 
        // Optimization: ideally the DataTable form should fetch students based on selected class.
        // But current FormComponent implementation usually takes static options. 
        // Let's fetch all active students for now as per previous patterns.
        const studentsData = await User.find({ "studentSpecificField.status": "Active", roles: "Student" })
            .select("_id name")
            .sort({ name: 1 })
            .lean();

        const classes = JSON.parse(JSON.stringify(classesData));
        const students = JSON.parse(JSON.stringify(studentsData));

        return (
            <LeaveHistory
                apiKey={apiKey}
                role={activeRole}
                classes={classes}
                students={students}
            />
        );
    } catch (error) {
        console.error("Error loading leave history:", error.message);
        return (
            <ErrorPage
                statusCode={500}
                title="Internal Server Error"
                description="An unexpected error occurred while processing your request."
            />
        );
    }
}

export const revalidate = 0; // Dynamic data
