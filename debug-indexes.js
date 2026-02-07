import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("Please define the MONGODB_URI environment variable inside .env.local");
    process.exit(1);
}

async function checkIndexes() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB");

        const collection = mongoose.connection.collection("studentsfunds");
        const indexes = await collection.indexes();

        console.log("\nExisting Indexes on 'studentsfunds':");
        console.log(JSON.stringify(indexes, null, 2));

        await mongoose.disconnect();
        console.log("\nDisconnected");
    } catch (error) {
        console.error("Error checking indexes:", error);
        process.exit(1);
    }
}

checkIndexes();
