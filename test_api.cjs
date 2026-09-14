const http = require("http");
require("dotenv").config({ path: ".env.local" });

const data = JSON.stringify({ categories: ["Masjid", "Haddad", "Programs", "Spot", "Onnam Dars", "New Mobile Session"] });

const req = http.request(
    "http://localhost:3000/api/masjid/attendance/categories",
    {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(data),
            "api-key": process.env.API_KEY || ""
        },
    },
    (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => console.log(res.statusCode, body));
    }
);

req.on("error", console.error);
req.write(data);
req.end();
