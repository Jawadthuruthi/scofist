/**
 * Migration: Move students from Plus Two B (CLS-12) → Plus Two (CLS-2)
 *
 * Usage:
 *   node migrate_plus_two_b.mjs --dry-run    (preview, no changes)
 *   node migrate_plus_two_b.mjs              (apply changes)
 */

import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌  MONGODB_URI not found in .env.local");
  process.exit(1);
}

const isDryRun = process.argv.includes("--dry-run");

// Hardcoded IDs confirmed from the database
const SOURCE_CLASS_ID = "CLS-12"; // PLUS T WO B
const TARGET_CLASS_ID = "CLS-2";  // PLUS TWO

async function run() {
  console.log(`\n🔌  Connecting to MongoDB...`);
  await mongoose.connect(MONGODB_URI);
  console.log("✅  Connected.\n");

  const db = mongoose.connection.db;
  const usersCol = db.collection("users");

  console.log(`🎯  Source class : ${SOURCE_CLASS_ID} (PLUS T WO B)`);
  console.log(`🎯  Target class : ${TARGET_CLASS_ID} (PLUS TWO)\n`);

  // Count affected students
  const affected = await usersCol.countDocuments({
    roles: "Student",
    "studentSpecificField.classId": SOURCE_CLASS_ID,
  });

  console.log(`👥  Students currently in CLS-12 (PLUS T WO B): ${affected}`);

  if (affected === 0) {
    console.log("ℹ️   No students to migrate. Exiting.");
    await mongoose.disconnect();
    process.exit(0);
  }

  if (isDryRun) {
    // Show a sample of affected students
    const sample = await usersCol
      .find(
        { roles: "Student", "studentSpecificField.classId": SOURCE_CLASS_ID },
        { projection: { _id: 1, name: 1 } }
      )
      .limit(10)
      .toArray();

    console.log("\n📄  Sample students that would be moved:");
    sample.forEach((s) => console.log(`   ${s._id} — ${s.name}`));
    if (affected > 10) console.log(`   ... and ${affected - 10} more`);

    console.log(
      "\n🔍  DRY RUN — no changes made. Run without --dry-run to apply."
    );
    await mongoose.disconnect();
    process.exit(0);
  }

  // Apply migration
  console.log(`\n⏳  Moving ${affected} student(s) to PLUS TWO (CLS-2)...`);

  const result = await usersCol.updateMany(
    {
      roles: "Student",
      "studentSpecificField.classId": SOURCE_CLASS_ID,
    },
    {
      $set: {
        "studentSpecificField.classId": TARGET_CLASS_ID,
      },
    }
  );

  console.log(`✅  Done! Modified: ${result.modifiedCount} student(s).`);
  console.log(
    `\nAll students from "PLUS T WO B" (CLS-12) are now in "PLUS TWO" (CLS-2).\n`
  );
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("❌  Error:", err.message);
  process.exit(1);
});
