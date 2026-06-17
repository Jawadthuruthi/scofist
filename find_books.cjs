const fs = require('fs');
const path = require('path');

function searchDir(dir, target, depth) {
    if (depth > 4) return;
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            if (file.toLowerCase().includes(target)) {
                console.log("FOUND:", fullPath);
            }
            try {
                if (fs.statSync(fullPath).isDirectory()) {
                    searchDir(fullPath, target, depth + 1);
                }
            } catch (e) {}
        }
    } catch (e) {}
}

console.log("Searching in C:\\Users\\ABDULLA\\Downloads for books...");
searchDir('C:\\Users\\ABDULLA\\Downloads', 'book', 0);
console.log("Searching in D:\\Projects\\scofist for books...");
searchDir('D:\\Projects\\scofist', 'book', 0);
