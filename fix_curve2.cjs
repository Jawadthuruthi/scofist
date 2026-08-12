const fs = require('fs');
let c = fs.readFileSync('components/SectionWorkingDayToggle.jsx', 'utf8');
c = c.replace(/<DialogContent className="/g, '<DialogContent className="rounded-2xl sm:rounded-2xl ');
fs.writeFileSync('components/SectionWorkingDayToggle.jsx', c);
console.log('done2');
