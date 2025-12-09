import { cookies } from "next/headers";
import ErrorPage from "@/components/ErrorPage";
import StudentsClient from "@/components/StudentsClient.jsx";
import connectToDB from "@/lib/db";
import Batch from "@/models/Batch.js";
import Class from "@/models/Class.js";

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

        const batchesData = await Batch.find({}).select("_id name endYear").sort({ endYear: 1 }).lean();
        const classesData = await Class.find({}).select("_id name").lean();

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

        const batches = JSON.parse(JSON.stringify(batchesData)).map(batch => ({
            ...batch,
            name: `${batch.name} (${batch.endYear})`
        }));
        const classes = JSON.parse(JSON.stringify(classesData));

        return (
            <StudentsClient
                batches={batches}
                classes={classes}
                activeRole={activeRole}
                apiKey={process.env.API_KEY}
                isReadOnly={true}
                pageTitle="ADMISSION REGISTER"
                excludedColumns={["email", "batchName", "className", "bloodGroup", "roles", "status", "guardianContactNumber", "guardianAlternativeNumber", "contactNumber", "alternativeNumber", "aadharNo", "profilePic", "admissionClassName", "serialNo"]}
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

