import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function getYear(req) {
  try {
    const url = new URL(req.url);
    const queryYear = url.searchParams.get("year");
    let yearToUse = queryYear;

    const db = mongoose.connection.db;
    const settings = await db.collection("settings").findOne({});
    if (settings) {
      const fetchedYears = settings.years || ["2025 november"];
      
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
    url: 'http://localhost/api/team-points-publish'
  };
  
  const year = await getYear(req);
  console.log("Publish route would use year:", year);
  
  process.exit(0);
}

check().catch(console.error);
