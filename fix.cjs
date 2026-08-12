const fs = require('fs');
let c = fs.readFileSync('components/Dashboard.jsx', 'utf8');
c = c.replace(/if \(teacher\.teacherStatus === "Principal" \|\| teacher\.teacherStatus === "Guest"\)/g, 'if (teacher.teacherSpecificField?.status === "Principal" || teacher.teacherSpecificField?.status === "Guest")');
c = c.replace(/assignedClass = teacher\.teacherStatus;/g, 'assignedClass = teacher.teacherSpecificField?.status;');
c = c.replace(/>Students:<\/span>/g, '>Total Students:</span>');
c = c.replace(/<thead className="bg-muted text-muted-foreground text-xs uppercase">/g, '<thead className="bg-muted text-muted-foreground text-xs uppercase sticky top-0 z-10 shadow-sm bg-muted\/95 backdrop-blur">');
c = c.replace(/<DialogHeader className="([^"]+)">/g, '<DialogHeader className="$1 sticky top-0 z-20 backdrop-blur-md bg-background\/95">');
fs.writeFileSync('components/Dashboard.jsx', c);
console.log('Done');
