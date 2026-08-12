import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const settings = await db.collection("settings").findOne({});
  console.dir(settings.general, {depth: null});
  process.exit(0);
}
run();
