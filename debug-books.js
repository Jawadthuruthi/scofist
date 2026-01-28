const mongoose = require("mongoose");

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/scofist";

const bookSchema = new mongoose.Schema({
    status: String,
    title: String,
    name: String,
}, { strict: false });

const LibraryBook = mongoose.models.LibraryBook || mongoose.model("LibraryBook", bookSchema);

async function checkBooks() {
    try {
        await mongoose.connect(mongoUri);
        console.log("Connected to DB");

        const total = await LibraryBook.countDocuments();
        const available = await LibraryBook.countDocuments({ status: "Available" });
        const rented = await LibraryBook.countDocuments({ status: "Rented" });
        const noStatus = await LibraryBook.countDocuments({ status: { $exists: false } });
        const otherStatus = await LibraryBook.countDocuments({ status: { $nin: ["Available", "Rented"] } });

        console.log(`Total Books: ${total}`);
        console.log(`Available: ${available}`);
        console.log(`Rented: ${rented}`);
        console.log(`No Status: ${noStatus}`);
        console.log(`Other Status: ${otherStatus}`);

        if (otherStatus > 0) {
            const others = await LibraryBook.find({ status: { $nin: ["Available", "Rented"] } }).limit(5).select("status name");
            console.log("Sample Other Statuses:", others);
        }

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}

checkBooks();
