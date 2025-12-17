import Batch from "@/models/Batch";
import User from "@/models/User";
import connectToDB from "@/lib/db";
import Header from "@/components/Header";
import { GraduationCap } from "lucide-react";
import ErrorPage from "@/components/ErrorPage";

async function getBatchStats() {
    await connectToDB();

    // Fetch all batches sorted by start year
    const batches = await Batch.find().sort({ startYear: 1 }).lean();

    // Aggregate student counts by batch and status
    const stats = await User.aggregate([
        { $match: { roles: "Student" } },
        {
            $group: {
                _id: "$studentSpecificField.batchId",
                gbMembers: {
                    $sum: {
                        $cond: [{ $eq: ["$studentSpecificField.status", "Active"] }, 1, 0],
                    },
                },
                alumniMembers: {
                    $sum: {
                        $cond: [{ $eq: ["$studentSpecificField.status", "Graduated"] }, 1, 0],
                    },
                },
            },
        },
    ]);

    // Create a map for easy lookup
    const statsMap = stats.reduce((acc, curr) => {
        acc[curr._id] = curr;
        return acc;
    }, {});

    // Merge batch info with stats
    // Use Promise.all if we had async operations inside, but map is fine here
    return batches.map((batch) => {
        // Calculate dynamic academic year just in case virtuals aren't available in lean() without explicit options
        // But lean() usually strips virtuals unless configured. 
        // Let's re-calculate academicYear for safety since virtuals are not in lean() by default for this Mongoose version usually
        const academicYear = `${batch.startYear}-${(batch.endYear % 100)
            .toString()
            .padStart(2, "0")}`;

        const batchStats = statsMap[batch._id.toString()] || {
            gbMembers: 0,
            alumniMembers: 0,
        };

        return {
            ...batch,
            academicYear,
            gbMembers: batchStats.gbMembers,
            alumniMembers: batchStats.alumniMembers,
        };
    });
}

export default async function AlumniesPage() {
    try {
        const batches = await getBatchStats();

        return (
            <div className="flex flex-col space-y-6">
                <Header
                    title="ALUMNIES"
                    subTitle="Alumni Network & Directory"
                    icon={<GraduationCap className="h-5 w-5 text-muted-foreground" />}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {batches.map((batch) => (
                        <div
                            key={batch._id}
                            className="bg-card text-card-foreground p-6 rounded-lg shadow-sm border flex flex-col items-center justify-center text-center space-y-2 hover:shadow-md transition-shadow"
                        >
                            <h3 className="font-bold text-lg uppercase">
                                {batch.name} ({batch.academicYear})
                            </h3>
                            <div className="text-sm text-muted-foreground space-y-1">
                                <p>
                                    GB Members: <span className="font-medium text-foreground">{batch.gbMembers}</span>
                                </p>
                                <p>
                                    Alumni Members: <span className="font-medium text-foreground">{batch.alumniMembers}</span>
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
                {batches.length === 0 && (
                    <div className="text-center p-12 text-muted-foreground">
                        No batches found.
                    </div>
                )}
            </div>
        );
    } catch (error) {
        console.error("Error loading alumni data:", error);
        return (
            <ErrorPage
                statusCode={500}
                title="Internal Server Error"
                description="Failed to load alumni data."
            />
        );
    }
}

export const revalidate = 60;
