const { execSync } = require('child_process');
const fs = require('fs');

console.log('Running fix scripts...');
execSync('node fix.cjs');
execSync('node fix_curve.cjs');
execSync('node fix_close.cjs');

console.log('Applying manual edits...');
let c = fs.readFileSync('components/Dashboard.jsx', 'utf8');

// 1. "2 in a row faculty profiles" -> remove lg:grid-cols-3
c = c.replace('className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5 flex-1 overflow-y-auto"', 'className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 flex-1 overflow-y-auto"');
c = c.replace('className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5"', 'className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5"');

// 2. Reduce width of bars -> Math.max(30, Math.floor(vw * 0.05)) -> Math.min(40, Math.max(25, Math.floor(vw * 0.03)))
c = c.replace(/const calculatedWidth = Math.max\(30, Math.floor\(vw \* 0\.05\)\);/g, 'const calculatedWidth = Math.min(40, Math.max(25, Math.floor(vw * 0.03)));');

// 3. View active teaching staff profiles
c = c.replace('View active teaching staff profile and information', 'View active teaching staff profiles');

// 4. Import X
if (!c.includes('X,')) {
    c = c.replace('Check,', 'Check,\n  X,');
}

// 5. Informations about active classes
c = c.replace('Detailed information about active classes', 'informations about active classes');

fs.writeFileSync('components/Dashboard.jsx', c);
console.log('Restoration complete!');
