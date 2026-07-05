import fs from 'fs';
import xlsx from 'xlsx';

const filePath = 'C:\\Users\\ABDULLA\\Downloads\\books\\LIBRARY CATALOGUE - ENG.csv';
const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false, range: 1 });

console.log("Total rows:", data.length);
console.log("First row:");
console.log(data[0]);
console.log("Second row:");
console.log(data[1]);
