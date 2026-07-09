import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const libraryBookSchema = new mongoose.Schema({
    id: String,
    prefix: String,
    number: String,
    name: String,
    author: String,
    category: String,
    language: String,
    status: { type: String, default: "Available" },
    publication: String,
    price: Number
}, { timestamps: true });

const LibraryBook = mongoose.models.LibraryBook || mongoose.model("LibraryBook", libraryBookSchema);

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const books = await LibraryBook.find({ id: /RL/i });
    console.log(`Found ${books.length} books with RL ID`);
    if (books.length > 0) {
        console.log(books[0]);
    }
    await mongoose.disconnect();
}
check();
