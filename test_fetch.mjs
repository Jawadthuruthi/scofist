import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });


async function test() {
  try {
    const res = await fetch("http://localhost:3000/api/users?roles=Teacher", {
      headers: {
        "api-key": process.env.API_KEY
      }
    });
    console.log(res.status);
    const text = await res.text();
    console.log(text);
  } catch (e) {
    console.error(e);
  }
}
test();
