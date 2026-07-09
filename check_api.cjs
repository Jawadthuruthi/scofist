const http = require('http');

http.get('http://localhost:3000/api/teacher-attendance-lookup?teacherId=TCH-002&month=7&year=2026', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      if (result.records) {
        const period9 = result.records.filter(r => r.periodNumber === 9);
        console.log("Period 9 records in July 2026:");
        console.log(JSON.stringify(period9, null, 2));
      } else {
        console.log("No records found:", result);
      }
    } catch (e) {
      console.log("Error parsing JSON:", e.message, "\nData:", data);
    }
  });
}).on('error', (err) => {
  console.log("Error:", err.message);
});
