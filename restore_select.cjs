const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components', 'MarksManager.jsx');
let src = fs.readFileSync(filePath, 'utf8');
const lines = src.split('\n');

let targetIdx = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("                                    }}") && lines[i+1] && lines[i+1].includes("                                >")) {
        // Find if next line is missing the Select content
        if (lines[i+2] && lines[i+2].includes("{/* Subject Selection for Teachers */}")) {
            targetIdx = i + 1; // index of the ">"
            break;
        }
    }
}

if (targetIdx !== -1) {
    const replacementStr = `                                >
                                    <SelectTrigger><SelectValue placeholder="Select exam..." /></SelectTrigger>
                                    <SelectContent>
                                        {activeRole !== "Teacher" && (
                                            <SelectItem value="NEW_EXAM" className="font-semibold text-primary">+ Add New Exam</SelectItem>
                                        )}
                                        {savedExams.map((exam) => (
                                            <SelectItem key={exam._id} value={exam._id}>{exam.examName}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="flex gap-1 items-center">
                                    <Input
                                        autoFocus
                                        placeholder="e.g. First Term Exam"
                                        value={examName}
                                        onChange={(e) => setExamName(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && !examReady && handleOpenTable()}
                                        className="flex-1"
                                    />
                                    {isAddingNewExam && !examReady && (
                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsAddingNewExam(false)} title="Back to dropdown">
                                            <X className="w-3 h-3" />
                                        </Button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>`;
                
    lines[targetIdx] = replacementStr;
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log('Restored the missing Select and Input fields!');
} else {
    console.log('Could not find the target index to patch!');
}
