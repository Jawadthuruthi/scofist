import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Define Schema
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

async function importBooks() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        const booksDir = 'C:\\Users\\ABDULLA\\Downloads\\books';
        if (!fs.existsSync(booksDir)) {
            console.log(`Directory ${booksDir} does not exist.`);
            return;
        }

        const files = fs.readdirSync(booksDir).filter(f => f.endsWith('.csv') || f.endsWith('.xlsx'));
        
        if (files.length === 0) {
            console.log("No CSV or Excel files found in the directory.");
            return;
        }

        for (const file of files) {
            console.log(`\nProcessing file: ${file}`);
            const filePath = path.join(booksDir, file);
            
            const workbook = xlsx.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            
            // Assuming range 1 skips an initial empty row or bad formatting as seen in the ENG file
            // Let's try reading without range first to check if first row is empty, but for safety 
            // since we saw it requires range: 1, we will use it. Better yet, we can check if the first row of data has __EMPTY.
            let data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false });
            
            if (data.length > 0 && data[0]['__EMPTY'] !== undefined) {
                // Reread with range 1 if first row looks like empty header row
                data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false, range: 1 });
            }

            console.log(`Found ${data.length} rows in ${file}.`);
            
            let newCount = 0;
            let existCount = 0;

            for (const row of data) {
                const bookId = row['book ID'] || row['book id'] || row['BOOK ID'] || row['id'] || row['ID'];
                
                if (!bookId) continue;

                const prefix = bookId.replace(/[0-9]/g, '');
                const number = bookId.replace(/[^0-9]/g, '');

                const existingBook = await LibraryBook.findOne({ id: bookId });
                
                if (existingBook) {
                    existCount++;
                } else {
                    await LibraryBook.create({
                        id: bookId,
                        prefix: prefix,
                        number: number,
                        name: row['name'] || row['Name'] || row['NAME'] || '',
                        author: row['author'] || row['Author'] || row['AUTHOR'] || '',
                        price: parseFloat(row['price'] || row['Price'] || row['PRICE']) || 0,
                        status: row['status'] || row['Status'] || row['STATUS'] || 'Available',
                        language: row['language'] || row['Language'] || row['LANGUAGE'] || '',
                        category: row['category'] || row['Category'] || row['CATEGORY'] || '',
                        publication: row['PUBLICATION'] || row['publication'] || row['Publication'] || ''
                    });
                    newCount++;
                }
            }
            console.log(`Completed ${file}: Added ${newCount} new books. Skipped ${existCount} existing books.`);
        }
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
        console.log("\nDisconnected from MongoDB");
    }
}

importBooks();
