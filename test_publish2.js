import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

async function run() {
  try {
    const res = await fetch("http://localhost:3000/api/team-points-publish", {
      method: "POST",
      headers: {
        "cookie": "active-year=2026%20September",
        "api-key": process.env.API_KEY
      }
    });
    const data = await res.json();
    console.log(data);
  } catch (e) {
    console.error(e);
  }
}
run();
