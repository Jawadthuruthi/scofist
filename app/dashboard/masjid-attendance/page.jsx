import MasjidDashboard from "@/components/masjid-attendance/MasjidDashboard";
import { headers } from "next/headers";
import { parseUser } from "@/lib/utils";
import connectDB from "@/lib/db";
import Class from "@/models/Class";

const MasjidAttendancePage = async () => {
    const apiKey = process.env.API_KEY;
    const headerStore = await headers();
    const user = parseUser(headerStore);

    await connectDB();
    // Fetch all active classes
    // We serialize the data to pass it to the client component
    const classes = await Class.find({})
        .select("name batchId")
        .populate("batchId", "name")
        .lean();

    console.log("Fetched Classes Count:", classes.length);
    if (classes.length > 0) {
        console.log("First Class:", classes[0]);
    } else {
        console.log("No classes found.");
    }

    // Custom sort order matching the main dashboard
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

    classes.sort((a, b) => {
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

    const serializedClasses = classes.map((cls) => ({
        _id: cls._id.toString(),
        name: cls.name,
        batchId: cls.batchId?._id?.toString(),
        batchName: cls.batchId?.name,
    }));

    return <MasjidDashboard classes={serializedClasses} apiKey={apiKey} />;
};

export default MasjidAttendancePage;
