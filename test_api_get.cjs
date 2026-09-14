const http = require("http");

const req = http.request(
    "http://localhost:3000/api/masjid/attendance/categories",
    {
        method: "GET",
        headers: {
            "api-key": process.env.API_KEY || "scofist-2025" // assuming this or test_api runs in environment that doesn't matter since it's just GET
        }
    },
    (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => console.log("Status:", res.statusCode, "Body:", body));
    }
);

req.on("error", console.error);
req.end();
