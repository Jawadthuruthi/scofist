import { cookies } from "next/headers";
import ErrorPage from "@/components/ErrorPage";
import StudentsClient from "@/components/StudentsClient.jsx";
import connectToDB from "@/lib/db";
import Batch from "@/models/Batch.js";
import Class from "@/models/Class.js";
import User from "@/models/User.js";

export default async function AdmissionRegisterPage() {
    try {
        const cookieStore = await cookies();
        const activeRole = cookieStore.get("active-role")?.value;

        try {
            await connectToDB();
        } catch (error) {
            console.error("Error connecting to database:", error.message);
            throw error;
        }

        const batchesData = await Batch.find({}).select("_id name endYear").sort({ startYear: 1, endYear: 1 }).lean();
        const classesData = await Class.find({}).select("_id name").lean();

        // Fetch the last student ID
        const lastStudent = await User.findOne({ roles: "Student" })
            .select("_id")
            .sort({ createdAt: -1 })
            .lean();
        
        const lastStudentId = lastStudent?._id || "None";

        const classOrder = [
            "PLUS ONE A",
            "PLUS ONE B",
            "PLUS TWO",
            "DEGREE FIRST YEAR",
            "DEGREE SECOND YEAR",
            "DEGREE THIRD YEAR",
            "PG FIRST YEAR",
            "PG SECOND YEAR",
            "8TH STD",
            "9TH STD",
            "10TH STD",
            "11TH STD",
            "12TH STD",
        ].map((name) => name.replace(/\s/g, "").toUpperCase());

        classesData.sort((a, b) => {
            const nameA = a.name.trim().toUpperCase().replace(/\s/g, "");
            const nameB = b.name.trim().toUpperCase().replace(/\s/g, "");
            const indexA = classOrder.indexOf(nameA);
            const indexB = classOrder.indexOf(nameB);

            if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB;
            }
            if (indexA !== -1) {
                return -1;
            }
            if (indexB !== -1) {
                return 1;
            }
            return a.name.localeCompare(b.name);
        });

        const batches = JSON.parse(JSON.stringify(batchesData));
        const classes = JSON.parse(JSON.stringify(classesData));

        return (
            <StudentsClient
                batches={batches}
                classes={classes}
                activeRole={activeRole}
                apiKey={process.env.API_KEY}
                isReadOnly={true}
                pageTitle="ADMISSION REGISTER"
                filterTitle="Admission Register"
                lastStudentId={lastStudentId}
                excludedColumns={["email", "batchName", "className", "bloodGroup", "roles", "status", "guardianContactNumber", "guardianAlternativeNumber", "contactNumber", "alternativeNumber", "aadharNo", "profilePic", "admissionClassName", "serialNo", "liabilities"]}
            />
        );
    } catch (error) {
        console.error("Error loading students:", error.message);
        return (
            <ErrorPage
                statusCode={500}
                title="Internal Server Error"
                description="An unexpected error occurred while processing your request."
            />
        );
    }
}

export const revalidate = 0;

