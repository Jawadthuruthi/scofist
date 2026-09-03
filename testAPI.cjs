const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/teacherAttendances?teacherId=TCH-002&startDate=2026-09-01&endDate=2026-09-01',
  method: 'GET',
  headers: {
    'api-key': 'your-api-key' // wait, I don't know the exact API key, I will just import dotenv
  }
};

const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

options.headers['api-key'] = process.env.API_KEY;

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Resulting teacherAttendances count:', json.teacherAttendances ? json.teacherAttendances[0].attendanceRecords.length : 0);
      const records = json.teacherAttendances ? json.teacherAttendances[0].attendanceRecords : [];
      records.forEach(r => {
        console.log(`Period ${r.periodNumber}: present=${r.present}, leaveReason=${r.leaveReason}`);
      });
    } catch(e) {
      console.log('Error parsing JSON:', e.message, data);
    }
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.end();
