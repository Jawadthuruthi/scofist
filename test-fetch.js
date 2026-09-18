async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/team-points-poster?year=2026');
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}
run();
