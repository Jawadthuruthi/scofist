const fs = require('fs');
const file = './components/MarksManager.jsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

let startIdx = -1;
let endIdx = -1;
for(let i=0; i<lines.length; i++) {
    if (lines[i].includes('typeof s === "string"')) {
        startIdx = i;
    }
    if (startIdx !== -1 && lines[i].includes('marksObj = entry.marks;')) {
        endIdx = i;
        break;
    }
}

if (startIdx !== -1 && endIdx !== -1) {
    const replacement = `                typeof s === "string"
                    ? { name: s, maxMark: 100, passMark: 40, subColumns: [] }
                    : { ...s, subColumns: s.subColumns || [] }
            )
            : [{ name: "", maxMark: 100, passMark: 40, subColumns: [] }];
        setSubjects(examSubjects);
        setGradingScale(exam.gradingScale || []);
        const md = {};
        (exam.students || []).forEach((entry) => {
            const sid = entry.studentId?._id || entry.studentId;
            let marksObj = {};
            if (entry.marks instanceof Map) {
                marksObj = Object.fromEntries(entry.marks);
            } else if (entry.marks && typeof entry.marks === "object") {
                marksObj = entry.marks;`.split('\n');
                
    lines.splice(startIdx, endIdx - startIdx + 1, ...replacement);
    fs.writeFileSync(file, lines.join('\n'));
    console.log('Fixed loadExam');
} else {
    console.log('Could not find start/end indices');
}
