const mongoose = require("mongoose");

// Connect to DB (adjust URI if needed, defaults to local/env)
const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/scofist"; // Guessing DB name from path or common practice

// Define minimal schema
const rentalSchema = new mongoose.Schema({
    bookId: String,
    studentId: String,
    rentedDate: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

const Rental = mongoose.models.Rental || mongoose.model("Rental", rentalSchema);

async function checkRentals() {
    try {
        await mongoose.connect(mongoUri);
        console.log("Connected to DB");

        const count = await Rental.countDocuments();
        console.log(`Total Rentals: ${count}`);

        const allRentals = await Rental.find({}).limit(5);
        console.log("First 5 Rentals:");
        console.log(JSON.stringify(allRentals, null, 2));

        if (allRentals.length > 0) {
            console.log("Date type of first rental:", typeof allRentals[0].rentedDate);
            console.log("Is Date instance:", allRentals[0].rentedDate instanceof Date);
        }

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}

checkRentals();
