// scripts/fix-participant-programs-index.cjs
// Run once: node scripts/fix-participant-programs-index.cjs
// Drops the broken unique index on participants.programs.id so that multiple
// participants can be registered for the same program.

require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not found in .env.local");
  process.exit(1);
}

async function fixIndex() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("participants");

    // List existing indexes
    const indexes = await collection.indexes();
    console.log("\nCurrent indexes on participants:");
    indexes.forEach((idx) => console.log(" -", JSON.stringify(idx)));

    // Drop the broken unique index if it exists
    const brokenIndex = indexes.find(
      (idx) =>
        idx.key &&
        idx.key["programs.id"] !== undefined &&
        idx.unique === true
    );

    if (brokenIndex) {
      console.log(`\n🗑  Dropping broken unique index: "${brokenIndex.name}"`);
      await collection.dropIndex(brokenIndex.name);
      console.log("✅ Dropped successfully");
    } else {
      console.log("\n✅ No broken unique index found (already clean or never existed)");
    }

    // Create the correct non-unique index
    console.log("\n📐 Creating correct non-unique index on programs.id...");
    await collection.createIndex({ "programs.id": 1 }, { background: true });
    console.log("✅ Non-unique index created");

    console.log("\n🎉 Done! participants.programs.id index is now correct.");
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

fixIndex();
