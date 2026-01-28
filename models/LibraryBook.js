import mongoose from "mongoose";

const libraryBookSchema = new mongoose.Schema({
    id: String,
    prefix: String,
    number: Number,
    name: String,
    author: String,
    category: String,
    language: String,
    status: { type: String, default: "Available" },
    publication: String,
    price: Number
}, { timestamps: true });

const LibraryBook = mongoose.models.LibraryBook || mongoose.model("LibraryBook", libraryBookSchema);

export default LibraryBook;
