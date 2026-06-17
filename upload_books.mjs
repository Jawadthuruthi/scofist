import fs from 'fs';
import path from 'path';
import * as xlsx from 'xlsx';
import connectToDB from './lib/db.js';
import LibraryBook from './models/LibraryBook.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function run() {
  await connectToDB();
  console.log("Connected to database. Reading CSV files...");
  
  // Clean up corrupted records
  const deleted = await LibraryBook.deleteMany({ id: { $not: /^[A-Z]{1,4}\d+$/i } });
  if (deleted.deletedCount > 0) {
      console.log(`Cleaned up ${deleted.deletedCount} completely malformed junk records.`);
  }
  
  const dirPath = 'C:/Users/ABDULLA/Downloads/books';
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.csv'));

  if (files.length === 0) {
      console.log("No CSV files found in directory.");
      process.exit(0);
  }

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Repair broken CSV rows (newlines without quotes)
    const rawLines = content.split(/\r?\n/);
    const repairedLines = [];
    let currentLine = '';
    
    for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i].trim();
        if (!line && currentLine === '') continue; // Skip truly empty lines
        
        if (currentLine === '') {
            currentLine = line;
        } else {
            const commaCount = (currentLine.match(/,/g) || []).length;
            if (commaCount < 5) {
                // The current line is broken, so append the next line to it
                currentLine += ' ' + line;
            } else {
                repairedLines.push(currentLine);
                currentLine = line;
            }
        }
    }
    if (currentLine) repairedLines.push(currentLine);
    content = repairedLines.join('\n');
    
    const workbook = xlsx.read(content, { type: 'string' });
    const sheetName = workbook.SheetNames[0];
    
    // Read as an array of arrays to perfectly map columns dynamically
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    let headerRowIndex = -1;
    for (let i = 0; i < rows.length; i++) {
        if (!rows[i] || !Array.isArray(rows[i])) continue;
        const rowStr = rows[i].join(' ').toLowerCase();
        if (rowStr.includes('name') && rowStr.includes('_id')) {
            headerRowIndex = i;
            break;
        }
    }

    if (headerRowIndex === -1) {
        console.error(`\nSkipping ${file}: Could not find header row (must contain 'name' and '_id').`);
        continue;
    }

    const headers = rows[headerRowIndex].map(h => String(h || '').trim().toLowerCase());
    
    const nameIdx = headers.findIndex(h => h === 'name' || h.includes('name'));
    const idIdx = headers.findIndex(h => h === '_id' || h === 'id' || h.includes('_id'));
    const authorIdx = headers.findIndex(h => h === 'author' || h.includes('author'));
    const priceIdx = headers.findIndex(h => h === 'price' || h.includes('price'));
    const statusIdx = headers.findIndex(h => h === 'status' || h.includes('status'));
    const langIdx = headers.findIndex(h => h === 'language' || h === 'langugae' || h.includes('language'));
    const catIdx = headers.findIndex(h => h === 'category' || h.includes('category'));
    const pubIdx = headers.findIndex(h => h === 'publication' || h.includes('publication'));

    console.log(`\nProcessing ${file}: Found headers at row ${headerRowIndex + 1}. Columns mapping -> Name: ${nameIdx}, ID: ${idIdx}, Author: ${authorIdx}, Price: ${priceIdx}`);

    let updated = 0;
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row.length) continue;

      const id = String(row[idIdx] || '').trim();
      const name = String(row[nameIdx] || '').trim();

      if (!id || id === '_id' || id === 'undefined' || !name) continue;
      
      // Parse prefix
      const prefix = id.replace(/[0-9]/g, '').trim();

      await LibraryBook.findOneAndUpdate(
        { id: id },
        {
          id: id,
          prefix: prefix,
          number: id,
          name: name,
          author: authorIdx !== -1 ? String(row[authorIdx] || '').trim() : '',
          price: priceIdx !== -1 ? (Number(row[priceIdx]) || 0) : 0,
          status: statusIdx !== -1 ? String(row[statusIdx] || 'Available').trim() : 'Available',
          language: langIdx !== -1 ? String(row[langIdx] || '').trim() : '',
          category: catIdx !== -1 ? String(row[catIdx] || '').trim() : '',
          publication: pubIdx !== -1 ? String(row[pubIdx] || '').trim() : ''
        },
        { upsert: true, new: true }
      );
      updated++;
    }
    console.log(`Finished ${file}. Processed ${updated} records.`);
  }
  
  console.log(`All uploads complete.`);
  process.exit(0);
}

run().catch(err => {
    console.error("Error during upload:", err);
    process.exit(1);
});
