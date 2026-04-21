
import mongoose from "mongoose";
import connectToDB from "./lib/db.js";
import LibraryBook from "./models/LibraryBook.js";

async function check() {
    try {
        await connectToDB();
        const books = await LibraryBook.find({ id: { $not: /^BG/ } }).limit(5);
        console.log("Non-BG books:");
        console.log(JSON.stringify(books, null, 2));

        const bgBooks = await LibraryBook.find({ id: /^BG/ }).limit(5);
        console.log("BG books (newly uploaded):");
        console.log(JSON.stringify(bgBooks, null, 2));

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

check();
