
import mongoose from "mongoose";
import connectToDB from "./lib/db.js";
import LibraryBook from "./models/LibraryBook.js";

async function verify() {
    try {
        await connectToDB();
        const count = await LibraryBook.countDocuments();
        console.log(`Total books in DB: ${count}`);
        
        const firstBook = await LibraryBook.findOne({ id: "BG01" });
        console.log("First book (BG01):", firstBook);
        
        const lastBook = await LibraryBook.findOne({ id: "BG220" });
        console.log("Last book (BG220):", lastBook);

        process.exitCount = (count >= 209) ? 0 : 1;
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

verify();
