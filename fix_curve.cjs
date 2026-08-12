const fs = require('fs');
let c = fs.readFileSync('components/Dashboard.jsx', 'utf8');
c = c.replace(/<DialogContent className="/g, '<DialogContent className="rounded-2xl sm:rounded-2xl ');
fs.writeFileSync('components/Dashboard.jsx', c);
console.log('done');
