import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("Please define the MONGODB_URI environment variable inside .env.local");
    process.exit(1);
}

async function fixIndexes() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB");

        const collection = mongoose.connection.collection("studentsfunds");

        // Drop the incorrect index
        const indexName = "studentId_1_batchId_1_teacherId_1";
        if (await collection.indexExists(indexName)) {
            await collection.dropIndex(indexName);
            console.log(`Dropped index: ${indexName}`);
        } else {
            console.log(`Index ${indexName} not found.`);
        }

        await mongoose.disconnect();
        console.log("\nDisconnected. Please restart the application to trigger Mongoose index recreation.");
    } catch (error) {
        console.error("Error fixing indexes:", error);
        process.exit(1);
    }
}

fixIndexes();
