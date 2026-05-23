const fs = require('fs');
const file = './components/MarksManager.jsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `            {/* ── Marks Entry Table */}
            {examReady && !showResult && students.length > 0 && (`;

const replaceStr = `            {/* ── Marks Entry Table */}
            {examReady && !showResult && students.length === 0 && (
                <div className="p-10 text-center border rounded bg-muted/20 text-muted-foreground mt-4">
                    <p className="font-medium">No students found in the selected class.</p>
                </div>
            )}
            {examReady && !showResult && students.length > 0 && (`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, replaceStr);
    fs.writeFileSync(file, content);
    console.log('Added no students fallback.');
} else {
    console.log('Target string not found.');
}
