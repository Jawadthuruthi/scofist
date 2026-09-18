async function run() {
  try {
    // 1. Fetch from poster (public)
    const resPoster = await fetch("http://localhost:3000/api/team-points-poster?year=2026");
    const posterData = await resPoster.json();
    
    // 2. Fetch from teams (dashboard)
    const resTeams = await fetch("http://localhost:3000/api/teams?year=2026&sortByPoints=true");
    const teamsData = await resTeams.json();

    console.log("--- POSTER TEAMS ---");
    posterData.teams.forEach(t => console.log(`${t.name}: ${t.points}`));

    console.log("\n--- DASHBOARD TEAMS ---");
    teamsData.teams.forEach(t => console.log(`${t.name}: ${t.totalPoints}`));

  } catch (e) {
    console.error(e);
  }
}
run();
