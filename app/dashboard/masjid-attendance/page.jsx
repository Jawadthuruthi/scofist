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
        .lean();

    console.log("Fetched Classes Count:", classes.length);
    if (classes.length > 0) {
        console.log("First Class:", classes[0]);
    } else {
        console.log("No classes found.");
    }

    const serializedClasses = classes.map((cls) => ({
        _id: cls._id.toString(),
        name: cls.name,
        batchId: cls.batchId.toString(),
    }));

    return <MasjidDashboard classes={serializedClasses} apiKey={apiKey} />;
};

export default MasjidAttendancePage;
