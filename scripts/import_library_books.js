
import mongoose from 'mongoose';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable inside .env.local');
    process.exit(1);
}

// Define Schema locally
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

const DOWNLOADS_DIR = 'C:\\Users\\ABDULLA\\Downloads\\books';

// Helper to find all CSV files
function findCSVFiles() {
    try {
        if (!fs.existsSync(DOWNLOADS_DIR)) return [];
        const files = fs.readdirSync(DOWNLOADS_DIR);
        return files
            .filter(file => file.toLowerCase().endsWith('.csv'))
            .map(file => path.join(DOWNLOADS_DIR, file));
    } catch (err) {
        console.error(`Error reading downloads directory: ${err.message}`);
        return [];
    }
}

// Helper to extract prefix and number (User Logic)
function parseId(id) {
    if (!id) return { prefix: '', number: null };
    const strId = String(id).trim();

    if (/^\d+$/.test(strId)) {
        return { prefix: '', number: parseInt(strId, 10) };
    }

    // Regex to match prefix (anything that is not a digit at the end) and number (digits at the end)
    const match = strId.match(/^(.+?)(\d+)$/);

    if (match) {
        return {
            prefix: match[1].trim(),
            number: parseInt(match[2], 10)
        };
    }

    return { prefix: strId, number: null };
}

async function importBooks() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        let totalImported = 0;

        const filesToProcess = findCSVFiles();
        if (filesToProcess.length === 0) {
            console.warn(`No CSV files found in downloads directory.`);
        }

        for (const filePath of filesToProcess) {
            console.log(`Processing file: ${filePath}`);

            // Read CSV as UTF-8 string to handle special chars (Arabic/Kannada)
            const fileContent = fs.readFileSync(filePath, 'utf8');
            // Parse CSV with XLSX
            const workbook = XLSX.read(fileContent, { type: 'string' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
            
            let headerRowIndex = -1;
            let headers = [];
            
            // Find the header row
            for (let i = 0; i < Math.min(10, rawRows.length); i++) {
                const row = rawRows[i];
                if (!Array.isArray(row)) continue;
                const lowerRow = row.map(cell => String(cell).toLowerCase().trim());
                if (lowerRow.includes('_id') || lowerRow.includes('id')) {
                    headerRowIndex = i;
                    headers = row.map(cell => String(cell).trim());
                    break;
                }
            }
            
            if (headerRowIndex === -1) {
                console.warn(`Could not find header row containing '_id' or 'id' in ${path.basename(filePath)}`);
                continue;
            }
            
            const books = [];
            for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
                const rowArray = rawRows[i];
                if (!Array.isArray(rowArray) || rowArray.length === 0) continue;
                if (rowArray.every(cell => String(cell).trim() === "")) continue;
                
                const bookObj = {};
                for (let j = 0; j < headers.length; j++) {
                    const header = headers[j];
                    if (header) {
                        bookObj[header] = rowArray[j] !== undefined ? rowArray[j] : "";
                    }
                }
                books.push(bookObj);
            }

            console.log(`Found ${books.length} rows in ${path.basename(filePath)}`);

            const operations = [];

            for (const row of books) {
                // Normalize keys for case-insensitive lookup
                const normalizedRow = {};
                Object.keys(row).forEach(key => {
                    normalizedRow[key.trim().toLowerCase()] = row[key];
                });

                // Find ID from '_id' or 'id'
                let rawId = normalizedRow['_id'] || normalizedRow['id'];

                if (!rawId) {
                    continue;
                }
                
                rawId = rawId.toString().trim();
                
                // Remove all non-alphanumeric characters (like dashes, spaces)
                rawId = rawId.replace(/[^a-zA-Z0-9]/g, '');
                
                // Correct IDs without letters by prepending 'KKW'
                if (/^\d+$/.test(rawId)) {
                    rawId = 'KKW' + rawId;
                }

                const { prefix, number } = parseId(rawId);

                // Extract fields with fallback
                const name = normalizedRow['name'] || normalizedRow['title'] || normalizedRow['book name'] || 'Unknown Title';
                const author = normalizedRow['author'] || 'Unknown Author';
                const category = normalizedRow['category'] || 'General';
                const language = normalizedRow['language'];
                const publication = normalizedRow['publication'] || normalizedRow['publicat'];
                const priceStr = normalizedRow['price'];

                // Clean price
                let price = 0;
                if (priceStr) {
                    const cleaned = priceStr.toString().replace(/[,]/g, '').trim();
                    const parsed = parseFloat(cleaned);
                    price = isNaN(parsed) ? 0 : parsed;
                }

                const updateDoc = {
                    id: rawId.toString().trim(),
                    prefix: prefix,
                    number: number,
                    category: category.toString().trim(),
                    name: name.toString().trim(),
                    author: author.toString().trim(),
                    // Use optional chaining equivalent checks
                    language: language ? language.toString().trim() : undefined,
                    publication: publication ? publication.toString().trim() : undefined,
                    price: price,
                    status: normalizedRow['status'] || "Available"
                };

                // Remove undefined fields
                Object.keys(updateDoc).forEach(key => updateDoc[key] === undefined && delete updateDoc[key]);

                operations.push({
                    updateOne: {
                        filter: { id: updateDoc.id },
                        update: { $set: updateDoc },
                        upsert: true
                    }
                });
            }

            if (operations.length > 0) {
                const result = await LibraryBook.bulkWrite(operations);
                const count = result.upsertedCount + result.modifiedCount + (result.matchedCount || 0);
                // matchedCount includes modifiedCount, but logic varies. 
                // Safest to rely on `result.matchedCount` if we want total touched records.
                console.log(`Processed ${operations.length} records from ${path.basename(filePath)}`);
                totalImported += operations.length;
            } else {
                console.log(`No valid books to import from ${path.basename(filePath)}`);
            }
        }
        console.log(`Total books processed: ${totalImported}`);

    } catch (error) {
        console.error('Import failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

importBooks();
