const fs = require('fs');
const file = './components/MarksManager.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace border-b with border where it makes sense, specifically targeting the p-* and w-* class names which is mostly where it was applied
let lines = content.split('\n');
for(let i=0; i<lines.length; i++) {
    if (lines[i].includes('border-b') && !lines[i].includes('border-b-2')) {
        lines[i] = lines[i].split('border-b').join('border');
    }
}

fs.writeFileSync(file, lines.join('\n'));
console.log('Done replacing border-b');
