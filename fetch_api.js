async function run() {
  try {
    const res = await fetch("http://localhost:3000/api/team-points-poster?year=2026", {
      cache: "no-store"
    });
    const text = await res.text();
    console.log(text);
  } catch (e) {
    console.error(e);
  }
}
run();
