const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const XLSX = require('xlsx');

const URI = 'mongodb+srv://abdullakk:abdullakk3030@sdc.qw7au9k.mongodb.net/scofist?retryWrites=true&w=majority&appName=SDC';
const folderPath = 'C:\\Users\\ABDULLA\\Downloads\\books';

const parseFile = (filePath) => {
    const str = fs.readFileSync(filePath, 'utf8');
    const workbook = XLSX.read(str, { type: 'string' });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    return data;
};

const run = async () => {
    try {
        await mongoose.connect(URI);
        const LibraryBook = mongoose.models.LibraryBook || mongoose.model("LibraryBook", new mongoose.Schema({
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
        }, { timestamps: true }));

        const files = fs.readdirSync(folderPath);
        let allBooks = [];
        let bookIds = [];
        
        for (const file of files) {
            if (file.endsWith('.csv') || file.endsWith('.xlsx')) {
                const filePath = path.join(folderPath, file);
                const records = parseFile(filePath);
                
                records.forEach(row => {
                    const idStr = row._id || row['Book ID'] || '';
                    if (!idStr) return; // skip if no ID
                    
                    const prefixMatch = idStr.match(/^[A-Za-z\-]+/);
                    const numberMatch = idStr.match(/[0-9]+/);
                    
                    const prefix = prefixMatch ? prefixMatch[0] : '';
                    const number = numberMatch ? numberMatch[0] : '';

                    const book = {
                        id: String(idStr),
                        prefix: prefix,
                        number: number,
                        name: row.name || row['Book Name'] || '',
                        author: row.author || row['Author'] || '',
                        category: row.category || row['Category'] || '',
                        language: row.language || row['Language'] || '',
                        status: row.status || row['Status'] || 'Available',
                        publication: row.publication || row['Publication'] || '',
                        price: parseFloat(row.price || row['Price']) || 0
                    };
                    allBooks.push(book);
                    bookIds.push(book.id);
                });
            }
        }
        
        if (allBooks.length > 0) {
            const deleteResult = await LibraryBook.deleteMany({ id: { $in: bookIds } });
            console.log(`Deleted ${deleteResult.deletedCount} corrupted books.`);

            await LibraryBook.insertMany(allBooks);
            console.log(`Successfully re-added ${allBooks.length} books with correct encoding.`);
        } else {
            console.log('No books found to insert.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
};

run();
