const fs = require('fs');
const path = require('path');
const exts = ['.jsx', '.tsx', '.js', '.ts'];
const searchStr1 = /<DialogPrimitive\.Close className="absolute right-4 top-4 z-50 rounded-sm opacity-70/g;
const replaceStr1 = '<DialogPrimitive.Close className="absolute right-4 top-4 z-50 rounded-sm border p-0.5 opacity-70';
const searchStr2 = /<SheetPrimitive\.Close\s+className="absolute right-4 top-4 rounded-sm opacity-70/g;
const replaceStr2 = '<SheetPrimitive.Close\n        className="absolute right-4 top-4 rounded-sm border p-0.5 opacity-70';
const searchStr3 = /className="p-1\.5 -mr-1\.5 (ml-1 )?rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none"/g;
const replaceStr3 = 'className="p-1.5 -mr-1.5 $1rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none"';

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.next') && !file.includes('.git')) {
                results = results.concat(walkDir(file));
            }
        } else {
            if (exts.includes(path.extname(file))) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walkDir(process.cwd());
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    content = content.replace(searchStr1, replaceStr1);
    content = content.replace(searchStr2, replaceStr2);
    content = content.replace(searchStr3, replaceStr3);
    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated: ' + file);
    }
});
