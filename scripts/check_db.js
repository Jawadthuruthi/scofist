import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({path: '.env.local'});
mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const db = mongoose.connection.db;
    
    // Get all library books
    const allBooks = await db.collection('librarybooks').find({}).toArray();
    
    const invalidBooks = allBooks.filter(b => {
        const id = String(b.id || '');
        const hasLetter = /[a-zA-Z]/.test(id);
        const hasNumber = /[0-9]/.test(id);
        return !(hasLetter && hasNumber);
    });
    
    console.log(`Found ${invalidBooks.length} books without BOTH letters and numbers.`);
    
    // Print a few to see what they look like
    for (let i = 0; i < Math.min(20, invalidBooks.length); i++) {
        console.log(`ID: ${invalidBooks[i].id}, Name: ${invalidBooks[i].name}, Category: ${invalidBooks[i].category}`);
    }
    
    process.exit(0);
});
