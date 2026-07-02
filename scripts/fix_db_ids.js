import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({path: '.env.local'});

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const collection = db.collection('librarybooks');
    
    const allBooks = await collection.find({}).toArray();
    
    let updatedCount = 0;
    const operations = [];

    for (const book of allBooks) {
        let originalId = book.id;
        if (!originalId) continue;
        
        let idStr = String(originalId);
        
        // Remove everything except letters and digits
        let newId = idStr.replace(/[^a-zA-Z0-9]/g, '');
        
        // Ensure there's a prefix and a number? 
        // The user said: "THERE SHOULD NO ANY BOOK WITHOUT ID OF BOTH LETTERS AND NUMBERS"
        // If it's pure numbers, add 'KKW' (since that was our default fallback)
        if (/^\d+$/.test(newId)) {
            newId = 'KKW' + newId;
        } else if (/^[a-zA-Z]+$/.test(newId)) {
            newId = newId + '1'; // or something, but earlier we saw 0 such books
        }

        if (newId !== idStr || book.prefix === '' || book.prefix === undefined) {
            // Recalculate prefix and number
            let prefix = '';
            let number = null;
            
            const match = newId.match(/^([a-zA-Z]+)(\d+)$/);
            if (match) {
                prefix = match[1];
                number = parseInt(match[2], 10);
            } else {
                // In case there's numbers then letters? Like 123KKW? 
                const match2 = newId.match(/^(.+?)(\d+)$/);
                if (match2) {
                    prefix = match2[1];
                    number = parseInt(match2[2], 10);
                } else {
                    prefix = newId;
                }
            }

            operations.push({
                updateOne: {
                    filter: { _id: book._id },
                    update: { 
                        $set: { 
                            id: newId, 
                            prefix: prefix, 
                            number: number 
                        } 
                    }
                }
            });
            updatedCount++;
        }
    }

    if (operations.length > 0) {
        console.log(`Updating ${operations.length} books...`);
        // Process in batches of 500
        for (let i = 0; i < operations.length; i += 500) {
            const batch = operations.slice(i, i + 500);
            await collection.bulkWrite(batch);
        }
        console.log(`Successfully updated ${operations.length} books.`);
    } else {
        console.log('No books needed updating.');
    }
    
    process.exit(0);
}

run().catch(console.error);
