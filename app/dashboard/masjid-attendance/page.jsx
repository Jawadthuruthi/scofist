import MasjidDashboard from "@/components/masjid-attendance/MasjidDashboard";
import { headers } from "next/headers";
import connectDB from "@/lib/db";
import Class from "@/models/Class";
import { sortClasses, parseUser } from "@/lib/utils";

export const dynamic = "force-dynamic";

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

    classes.sort((a, b) => sortClasses(a, b));

    const serializedClasses = classes.map((cls) => ({
        _id: cls._id.toString(),
        name: cls.name,
        batchId: cls.batchId?._id?.toString(),
        batchName: cls.batchId?.name,
    }));

    return <MasjidDashboard classes={serializedClasses} apiKey={apiKey} />;
};

export default MasjidAttendancePage;
