const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'components', 'MarksManager.jsx');
let src = fs.readFileSync(filePath, 'utf8');

const lines = src.split('\n');

// Find the line index of `                                                        {typeof markVal === 'object' ? '-' : (markVal ?? "-")}`
let idx = -1;
for(let i=0; i<lines.length; i++) {
    if (lines[i].includes("typeof markVal === 'object' ? '-' : (markVal ?? \"-\")")) {
        idx = i + 2; // skip the next two lines: </td> \n );
        break;
    }
}

if (idx === -1) {
    console.error("Target not found!");
    process.exit(1);
}

// Find the line index of `                                                <td className="p-2 text-center font-semibold text-yellow-700 dark:text-yellow-300 border">{stat?.rank ?? "-"}</td>`
let endIdx = -1;
for(let i=idx; i<lines.length; i++) {
    if (lines[i].includes("stat?.rank ?? \"-\"")) {
        endIdx = i;
        break;
    }
}

if (endIdx === -1) {
    console.error("End target not found!");
    process.exit(1);
}

const insertion = `                                            })}
                                            <td className="p-2 text-center font-bold border text-blue-700 dark:text-blue-300 print:text-black">
                                                {stat.total}
                                            </td>
                                            <td className="p-2 text-center font-bold border text-green-700 dark:text-green-300 print:text-black">
                                                {stat.percentage}%
                                            </td>
                                            <td className={\`p-2 text-center font-bold border \${stat.remark === "Pass" ? "text-green-600 print:text-green-700" : stat.remark === "Failed" ? "text-red-600 print:text-red-700" : "text-blue-600 print:text-blue-700"}\`}>
                                                {stat.remark}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <style jsx global>{\`
                                @media print {
                                    @page {
                                        size: auto;
                                        margin: 10mm;
                                    }
                                    body {
                                        background: white !important;
                                        padding: 0 !important;
                                    }
                                    table {
                                        border-collapse: separate !important;
                                        border-spacing: 2px !important;
                                        border: none !important;
                                    }
                                    th, td {
                                        border: 0.5pt solid black !important;
                                        padding: 4px 8px !important;
                                        line-height: 1.1 !important;
                                        background-color: transparent !important;
                                        -webkit-print-color-adjust: exact;
                                        print-color-adjust: exact;
                                    }
                                    tr {
                                        break-inside: avoid;
                                    }
                                }
                            \`}</style>
                        </div>
                    ) : (
                        <div className="p-6 text-center text-sm text-muted-foreground">
                            Select an exam above to view results.
                        </div>
                    )}
                </div>
            )}

            {/* ── Marks Entry Table */}
            {examReady && !showResult && students.length > 0 && (
                activeRole !== "Teacher" || selectedSubjectIndex !== null ? (
                    <div className="space-y-3">
                        <div className="overflow-x-auto rounded border" ref={printRef}>
                            <table className="w-full text-sm">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="p-3 text-center border-b w-12" rowSpan={hasAnySubCols ? 2 : 1}>Sl No</th>
                                        <th className="p-1 text-left border-b w-[50px]" rowSpan={hasAnySubCols ? 2 : 1}>Adm. No</th>
                                        <th className="p-1 text-left border-b min-w-[80px]" rowSpan={hasAnySubCols ? 2 : 1}>Name</th>
                                        {subjects.map((subj, i) => {
                                            if (activeRole === "Teacher" && selectedSubjectIndex !== null && selectedSubjectIndex !== i) return null;
                                            const scs = subj.subColumns || [];
                                            if (scs.length > 0) {
                                                return (
                                                    <th key={i} colSpan={scs.length + 1} className="p-1 text-center border-b">
                                                        <div className="flex flex-col items-center gap-1 group">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-xs font-semibold truncate max-w-[120px]">{subj.name || \`Sub \${i + 1}\`}</span>
                                                                {activeRole !== "Teacher" && (
                                                                    <div className="flex items-center gap-1">
                                                                        <Edit className="w-3 h-3 cursor-pointer text-muted-foreground hover:text-primary transition-colors" onClick={() => openSubjectDialog(i)} />
                                                                        <Trash2 className="w-3 h-3 cursor-pointer text-red-500 hover:text-red-700 transition-colors" onClick={(e) => { e.stopPropagation(); if (subjects.length <= 1) { toast.error("At least one subject is required."); return; } setSubjectToDeleteIndex(i); }} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </th>
                                                );
                                            }
                                            return (
                                                <th key={i} rowSpan={hasAnySubCols ? 2 : 1} className="p-1 text-center border-b w-auto">
                                                    <div className="flex flex-col items-center gap-1 group">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs font-semibold truncate max-w-[80px]">{subj.name || \`Sub \${i + 1}\`}</span>
                                                            {activeRole !== "Teacher" && (
                                                                <div className="flex items-center gap-1">
                                                                    <Edit className="w-3 h-3 cursor-pointer text-muted-foreground hover:text-primary transition-colors" onClick={() => openSubjectDialog(i)} />
                                                                    <Trash2 className="w-3 h-3 cursor-pointer text-red-500 hover:text-red-700 transition-colors" onClick={(e) => { e.stopPropagation(); if (subjects.length <= 1) { toast.error("At least one subject is required."); return; } setSubjectToDeleteIndex(i); }} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="text-[9px] text-muted-foreground leading-none">({subj.passMark}/{subj.maxMark})</div>
                                                    </div>
                                                </th>
                                            );
                                        })}
                                        {activeRole !== "Teacher" && (
                                            <th className="p-2 border-b w-10" rowSpan={hasAnySubCols ? 2 : 1}>
                                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openSubjectDialog()} title="Add subject column">
                                                    <Plus className="w-4 h-4 text-primary" />
                                                </Button>
                                            </th>
                                        )}
                                        <th className="p-3 text-center border-b bg-blue-50 dark:bg-blue-950 min-w-[60px]" rowSpan={hasAnySubCols ? 2 : 1}>Total</th>
                                        <th className="p-3 text-center border-b bg-green-50 dark:bg-green-950 min-w-[60px]" rowSpan={hasAnySubCols ? 2 : 1}>%</th>
                                        <th className="p-3 text-center border-b bg-yellow-50 dark:bg-yellow-950 min-w-[60px]" rowSpan={hasAnySubCols ? 2 : 1}>Rank</th>
                                        <th
                                            className={\`p-3 text-center border-b bg-slate-50 dark:bg-slate-900 min-w-[70px] \${activeRole !== "Teacher" ? "cursor-pointer hover:bg-slate-100 transition-colors group" : ""}\`}
                                            onClick={() => activeRole !== "Teacher" && setIsGradingDialogOpen(true)}
                                            title={activeRole !== "Teacher" ? "Click to change remark settings" : ""}
                                            rowSpan={hasAnySubCols ? 2 : 1}
                                        >
                                            <div className="flex items-center justify-center gap-1">
                                                Remark
                                                {activeRole !== "Teacher" && <Settings className="w-3 h-3 text-muted-foreground group-hover:text-primary" />}
                                            </div>
                                        </th>
                                    </tr>
                                    {hasAnySubCols && (
                                        <tr>
                                            {subjects.map((subj, i) => {
                                                if (activeRole === "Teacher" && selectedSubjectIndex !== null && selectedSubjectIndex !== i) return null;
                                                const scs = subj.subColumns || [];
                                                if (scs.length > 0) {
                                                    return (
                                                        <React.Fragment key={i}>
                                                            {scs.map((sc, j) => (
                                                                <th key={\`\${i}-\${j}\`} className="p-1 text-center border-b text-xs font-semibold">
                                                                    <div>{sc.name}</div>
                                                                    <div className="text-[9px] text-muted-foreground">({sc.passMark}/{sc.maxMark})</div>
                                                                </th>
                                                            ))}
                                                            <th key={\`\${i}-sub\`} className="p-1 text-center border-b text-xs font-semibold bg-blue-50/50 dark:bg-blue-950/50 min-w-[50px]">Sub Total</th>
                                                        </React.Fragment>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </tr>
                                    )}
                                </thead>
                                <tbody>
                                    {students.map((st, idx) => {
                                        const stat = stats.find((s) => s.studentId === st._id);
                                        return (
                                            <tr key={st._id} className="hover:bg-muted/30 border-b">
                                                <td className="p-2 text-center text-muted-foreground border">{idx + 1}</td>
                                                <td className="p-1 text-muted-foreground truncate max-w-[50px] border">{st._id}</td>
                                                <td className="p-1 font-medium border">{st.name}</td>
                                                {subjects.map((subj, i) => {
                                                    if (activeRole === "Teacher" && selectedSubjectIndex !== null && selectedSubjectIndex !== i) return null;
                                                    const scs = subj.subColumns || [];
                                                    if (scs.length > 0) {
                                                        const markObj = marksData[st._id]?.[i];
                                                        const subjTotal = scs.reduce((sum, _, j) => sum + ((markObj && typeof markObj === 'object') ? (Number(markObj[j]) || 0) : 0), 0);
                                                        return (
                                                            <React.Fragment key={i}>
                                                                {scs.map((sc, j) => {
                                                                    const val = (markObj && typeof markObj === 'object') ? markObj[j] : undefined;
                                                                    const isFailed = val !== undefined && val !== "" && Number(val) < (Number(sc.passMark) || 0);
                                                                    return (
                                                                        <td key={\`\${i}-\${j}\`} className="p-1 text-center border">
                                                                            <Input
                                                                                id={\`mark-\${idx}-\${i}-\${j}\`}
                                                                                type="number" min={0} max={sc.maxMark || 100}
                                                                                className={\`w-14 mx-auto text-center h-7 text-xs \${isFailed ? "text-red-600 font-bold" : ""}\`}
                                                                                value={val ?? ""}
                                                                                onChange={(e) => handleMarkChange(st._id, i, e.target.value, j)}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === "Enter") {
                                                                                        e.preventDefault();
                                                                                        const nextSub = document.getElementById(\`mark-\${idx}-\${i}-\${j + 1}\`);
                                                                                        if (nextSub) { nextSub.focus(); return; }
                                                                                        const nextSubj = document.getElementById(\`mark-\${idx}-\${i + 1}-0\`);
                                                                                        if (nextSubj) { nextSubj.focus(); return; }
                                                                                        const nextSimple = document.getElementById(\`mark-\${idx}-\${i + 1}\`);
                                                                                        if (nextSimple) { nextSimple.focus(); return; }
                                                                                        const nextRow = document.getElementById(\`mark-\${idx + 1}-\${i}-0\`);
                                                                                        if (nextRow) nextRow.focus();
                                                                                    }
                                                                                }}
                                                                            />
                                                                        </td>
                                                                    );
                                                                })}
                                                                <td className="p-2 text-center font-semibold text-blue-700 dark:text-blue-300 border bg-blue-50/30 dark:bg-blue-950/30">
                                                                    {subjTotal || "-"}
                                                                </td>
                                                            </React.Fragment>
                                                        );
                                                    }
                                                    return (() => {
                                                        const val = marksData[st._id]?.[i];
                                                        const isFailed = val !== undefined && val !== "" && Number(val) < (Number(subj.passMark) || 0);
                                                        return (
                                                            <td key={i} className="p-1 text-center border">
                                                                <Input
                                                                    id={\`mark-\${idx}-\${i}\`}
                                                                    type="number" min={0} max={subj.maxMark || 100}
                                                                    className={\`w-14 mx-auto text-center h-7 text-xs \${isFailed ? "text-red-600 font-bold" : ""}\`}
                                                                    value={val ?? ""}
                                                                    onChange={(e) => handleMarkChange(st._id, i, e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter") {
                                                                            e.preventDefault();
                                                                            if (activeRole === "Teacher" && selectedSubjectIndex !== null) {
                                                                                const nextRow = document.getElementById(\`mark-\${idx + 1}-\${i}\`);
                                                                                if (nextRow) nextRow.focus();
                                                                                return;
                                                                            }
                                                                            const nextCol = document.getElementById(\`mark-\${idx}-\${i + 1}\`);
                                                                            if (nextCol) { nextCol.focus(); }
                                                                            else { const nextRow = document.getElementById(\`mark-\${idx + 1}-0\`); if (nextRow) nextRow.focus(); }
                                                                        }
                                                                    }}
                                                                />
                                                            </td>
                                                        );
                                                    })();
                                                })}
                                                {activeRole !== "Teacher" && <td className="border" />}
                                                <td className="p-2 text-center font-semibold text-blue-700 dark:text-blue-300 border">{stat?.total ?? 0}</td>
                                                <td className="p-2 text-center font-semibold text-green-700 dark:text-green-300 border">{stat?.percentage ?? 0}%</td>
`;

const newLines = [...lines.slice(0, idx), insertion, ...lines.slice(endIdx)];

fs.writeFileSync(filePath, newLines.join('\n'));
console.log('Restored MarksManager.jsx lines from ' + idx + ' to ' + endIdx);
