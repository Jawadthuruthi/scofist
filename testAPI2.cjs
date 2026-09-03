const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/teacher-attendance-lookup?teacherId=TCH-002&month=9&year=2026',
  method: 'GET',
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const records = json.records || [];
      console.log('Resulting teacher-attendance-lookup count for whole month:', records.length);
      if (records.length > 0) {
        console.log('First record date:', records[0].date);
      }
    } catch(e) {
      console.log('Error parsing JSON:', e.message, data);
    }
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.end();
