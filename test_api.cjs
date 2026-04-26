
const http = require('http');

const options = {
  hostname: '127.0.0.1',
  port: 3000,
  path: '/api/finance?accountType=College',
  method: 'GET',
  headers: {
    'x-user': JSON.stringify({ _id: 'TCH-002', roles: ['College Admin'] })
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Response:', data.substring(0, 500));
  });
});

req.on('error', (e) => {
  console.error(Problem with request: );
});

req.end();

