import fs from 'fs';

const files = [
    'components/LibraryDashboard.jsx',
    'components/LibraryRequests.jsx',
    'components/StudentDashboard.jsx'
];

files.forEach(f => {
    let c = fs.readFileSync(f, 'utf-8');
    // Replace all property accesses of .number on objects with .id
    // to display the full book ID including letters
    c = c.replace(/(\w+|\w+\.\w+|\w+\?\.)\.number\b/g, '$1.id');
    fs.writeFileSync(f, c);
});
