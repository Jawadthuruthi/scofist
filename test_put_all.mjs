import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function test() {
  try {
    const res = await fetch("http://localhost:3000/api/users", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.API_KEY
      },
      body: JSON.stringify({
        ids: ["TCH-001"],
        name: "TEST UPDATE",
        email: "ekshareef111@gmail.com",
        contactNumber: "9961987765",
        alternativeNumber: "",
        dateOfBirth: "1976-05-06",
        dateOfJoining: "2018-11-18",
        roles: ["Teacher"],
        houseName: "",
        place: "MAVILADAM",
        postOffice: "",
        district: "KASARAGOD",
        state: "KERALA",
        pin: "",
        status: "Active"
      })
    });
    console.log(res.status);
    const text = await res.text();
    console.log(text);
  } catch (e) {
    console.error(e);
  }
}
test();
