const fetch = require('node-fetch');

async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/users?roles=Teacher', {
      headers: {
        'x-api-key': '123123', // I don't know the exact key, maybe it checks process.env.API_KEY
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
