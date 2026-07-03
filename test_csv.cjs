const fs = require('fs');
const XLSX = require('xlsx');

const folderPath = 'C:\\Users\\ABDULLA\\Downloads\\books';
const filePath = folderPath + '\\_Kannada KPL KST - KPL.csv';

// Try 1: buffer with codepage
const buffer = fs.readFileSync(filePath);
const wb1 = XLSX.read(buffer, { type: 'buffer', codepage: 65001 });
console.log("Method 1:", XLSX.utils.sheet_to_json(wb1.Sheets[wb1.SheetNames[0]])[0].name);

// Try 2: utf8 string
const str = fs.readFileSync(filePath, 'utf8');
const wb2 = XLSX.read(str, { type: 'string' });
console.log("Method 2:", XLSX.utils.sheet_to_json(wb2.Sheets[wb2.SheetNames[0]])[0].name);
