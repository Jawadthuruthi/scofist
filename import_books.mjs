import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

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

async function importBooks() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            bufferCommands: false,
        });
        console.log("Connected to MongoDB.");

        const booksDir = "C:\\Users\\ABDULLA\\Downloads\\books";
        
        if (!fs.existsSync(booksDir)) {
            console.error(`Directory ${booksDir} does not exist.`);
            process.exit(1);
        }

        const files = fs.readdirSync(booksDir).filter(f => f.endsWith('.csv'));
        
        let importedCount = 0;

        for (const file of files) {
            console.log(`Processing file: ${file}`);
            const content = fs.readFileSync(path.join(booksDir, file), 'utf-8');
            const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
            
            // Assume first line is header
            const header = lines[0].split(',').map(h => h.trim());
            const idIndex = header.indexOf('_id') !== -1 ? header.indexOf('_id') : header.indexOf('id');
            const nameIndex = header.indexOf('name');
            const authorIndex = header.indexOf('author');
            const priceIndex = header.indexOf('price');
            const languageIndex = header.indexOf('language');
            const statusIndex = header.indexOf('status');
            const categoryIndex = header.indexOf('category');
            const publicationIndex = header.indexOf('publication');

            for (let i = 1; i < lines.length; i++) {
                // simple split by comma, works if no quotes with commas inside are used
                const columns = lines[i].split(',').map(c => c.trim());
                
                if (columns.length < 2) continue; // skip empty or invalid lines

                const id = idIndex !== -1 ? columns[idIndex] : '';
                if (!id) continue;

                let prefix = "";
                let number = id;
                const match = id.match(/^([A-Za-z_-]+)?(\d+)?$/);
                if (match) {
                    prefix = match[1] || "";
                    number = match[2] || id;
                }

                const bookData = {
                    id: id,
                    prefix: prefix,
                    number: number,
                    name: nameIndex !== -1 ? columns[nameIndex] : '',
                    author: authorIndex !== -1 ? columns[authorIndex] : '',
                    price: priceIndex !== -1 && !isNaN(Number(columns[priceIndex])) ? Number(columns[priceIndex]) : 0,
                    language: languageIndex !== -1 ? columns[languageIndex] : '',
                    status: statusIndex !== -1 ? (columns[statusIndex] || 'Available') : 'Available',
                    category: categoryIndex !== -1 ? columns[categoryIndex] : '',
                    publication: publicationIndex !== -1 ? columns[publicationIndex] : '',
                };

                // Add book, don't remove existing
                await LibraryBook.updateOne(
                    { id: id },
                    { $set: bookData },
                    { upsert: true }
                );
                importedCount++;
            }
        }

        console.log(`Successfully imported/updated ${importedCount} books.`);
        process.exit(0);
    } catch (error) {
        console.error("Error importing books:", error);
        process.exit(1);
    }
}

importBooks();
