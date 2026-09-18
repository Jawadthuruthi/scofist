import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function getYear(req) {
  try {
    const url = new URL(req.url);
    const queryYear = url.searchParams.get("year");
    const headerYear = null;
    
    let yearToUse = queryYear || headerYear;

    const db = mongoose.connection.db;
    const settings = await db.collection("settings").findOne({});
    if (settings) {
      const fetchedYears = settings.years || ["2025 november"];
      console.log("fetchedYears:", fetchedYears);
      
      if (yearToUse) {
        if (!fetchedYears.includes(yearToUse)) {
          const lowerYearToUse = yearToUse.toLowerCase();
          const match = fetchedYears.find(y => y.toLowerCase().startsWith(lowerYearToUse));
          if (match) return match;
        }
        return yearToUse;
      }
      return settings.activeYear || "2025 november";
    }
    return yearToUse || "2025 november";
  } catch (error) {
    return "2025 november";
  }
}

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const req = {
    url: 'http://localhost/team-points/2026?year=2026'
  };
  
  const year = await getYear(req);
  console.log("Resolved year:", year);
  
  const db = mongoose.connection.db;
  const docs = await db.collection("settings").find({}).toArray();
  const doc = docs[0];
  const snapshot = (doc.teamPointsSnapshot || []).find(s => s.year === year);
  console.log("Found snapshot:", snapshot ? "Yes" : "No", snapshot?.year);
  
  process.exit(0);
}

check().catch(console.error);
