const fs = require('fs');
const file = 'components/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. mx-0
content = content.replaceAll(
  'className="flex flex-row items-center gap-3 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md"',
  'className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md"'
);

// 2. Active Students By Class
content = content.replace(
  'Active Students By Class ({dashboardData?.activeStudents?.length ?? 0})',
  'Active Students By Class'
);

// 3. Distribution of active students
content = content.replace(
  'Distribution of active students across different classes',
  'Distribution of active students.'
);

// 4. Graduated Students By Batch
content = content.replace(
  'Graduated Students By Batch ({dashboardData?.graduatedStudents?.length ?? 0})',
  'Graduated Students By Batch'
);

// 5. Distribution of graduated students
content = content.replace(
  'Distribution of graduated students across different batches',
  'Distribution of graduated students.'
);

// 6. Total Students
content = content.replace(
  'Total Students ({dashboardData?.students?.length ?? 0})',
  'Total Students'
);

// 7. Student status distribution
content = content.replace(
  'Student status distribution and breakdown by batch',
  'Student status distribution.'
);

// 8. Students On Leave
content = content.replace(
  'Students On Leave ({dashboardData?.onLeaveStudentsList?.length ?? 0})',
  'Students On Leave'
);

// 9. On Leave DialogContent
content = content.replace(
  '<DialogContent className="rounded-2xl sm:rounded-2xl max-w-md max-h-[70vh] overflow-y-auto p-0 gap-0">',
  '<DialogContent className="rounded-2xl sm:rounded-2xl max-w-md max-h-[70vh] [&>button.absolute]:hidden overflow-y-auto p-0 gap-0">'
);

// 10. Students on Leave list
const oldList = `          <div className="space-y-1 p-5">
            {dashboardData?.onLeaveStudentsList?.length > 0 ? (
              dashboardData.onLeaveStudentsList.map((student, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {index + 1}. {student.name} {student.admissionNumber ? \`(\${student.admissionNumber})\` : ""}
                    </span>
                    {student.leaveReason && (
                      <span className="text-xs text-red-600 dark:text-red-400 mt-0.5 font-medium">
                        {student.leaveReason}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded h-fit">{student.className}</span>
                    {student.id && (
                      <span className="text-xs text-muted-foreground bg-white dark:bg-slate-900 border px-2 py-0.5 rounded shadow-sm h-fit">
                        {student.id}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No students currently on leave</p>
            )}
          </div>`;

const newList = `          <div className="space-y-4 p-5">
            {dashboardData?.onLeaveStudentsList?.length > 0 ? (
              Object.entries(
                dashboardData.onLeaveStudentsList.reduce((acc, student) => {
                  const className = student.className || "Unknown Class";
                  if (!acc[className]) acc[className] = [];
                  acc[className].push(student);
                  return acc;
                }, {})
              ).map(([className, students]) => (
                <div key={className} className="space-y-2 border-b pb-4 last:border-0 last:pb-0">
                  <h4 className="font-semibold text-sm text-primary">{className}</h4>
                  <div className="space-y-1">
                    {students.map((student, index) => (
                      <div
                        key={student.id || index}
                        className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {index + 1}. {student.name} {student.admissionNumber ? \`(\${student.admissionNumber})\` : ""}
                          </span>
                          {student.leaveReason && (
                            <span className="text-xs text-red-600 dark:text-red-400 mt-0.5 font-medium">
                              {student.leaveReason}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {student.id && (
                            <span className="text-xs text-muted-foreground bg-white dark:bg-slate-900 border px-2 py-0.5 rounded shadow-sm h-fit">
                              {student.id}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No students currently on leave</p>
            )}
          </div>`;

content = content.replace(oldList, newList);

fs.writeFileSync(file, content, 'utf8');
console.log('Update complete');
