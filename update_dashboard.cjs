const fs = require('fs');

let content = fs.readFileSync('components/Dashboard.jsx', 'utf-8');

function replacePopup(content, refName, iconName, downloadName, color) {
    const pattern = new RegExp(
        `(<DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md">\\s*)<div className="p-2 rounded-lg bg-${color}-(?:500/10|100 dark:bg-[^"]+)">\\s*<${iconName} className="h-5 w-5 text-${color}-500" />\\s*</div>`
    );
    
    const replacement = `$1<button type="button" className="p-2 rounded-lg bg-${color}-500/10 hover:bg-${color}-500/20 transition-colors focus:outline-none cursor-pointer" onClick={${downloadName}} title="Download Image" data-html2canvas-ignore="true">\n              <${iconName} className="h-5 w-5 text-${color}-500" />\n            </button>`;
    
    return content.replace(pattern, replacement);
}

content = replacePopup(content, 'activeStudentsPopupRef', 'Users', 'handleActiveStudentsDownload', 'green');
content = replacePopup(content, 'graduatedStudentsPopupRef', 'GraduationCap', 'handleGraduatedStudentsDownload', 'purple');
content = replacePopup(content, 'totalStudentsPopupRef', 'UserMinus', 'handleTotalStudentsDownload', 'orange');
content = replacePopup(content, 'onLeavePopupRef', 'UserX', 'handleOnLeaveDownload', 'red');
content = replacePopup(content, 'classesPopupRef', 'BookOpen', 'handleClassesDownload', 'blue');

const patternClose = /(<DialogClose className="p-1\.5 -mr-1\.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none">)/g;
const replacementClose = '<DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none" data-html2canvas-ignore="true">';
// wait we only want to replace inside StatsOverview, but replacing all is fine, actually wait, there might be other DialogClose that we want to ignore. Let's just do it globally for Dashboard.jsx.
content = content.replace(patternClose, replacementClose);

function injectRef(content, stateName, refName) {
    const pattern = new RegExp(
        `(<Dialog open={${stateName}} onOpenChange={set${stateName[0].toUpperCase()}${stateName.slice(1)}}>\\s*)<DialogContent className="([^"]+)"`
    );
    const replacement = `$1<DialogContent ref={${refName}} data-html2canvas-popup="true" className="$2"`;
    return content.replace(pattern, replacement);
}

content = injectRef(content, 'activeStudentsDialogOpen', 'activeStudentsPopupRef');
content = injectRef(content, 'graduatedStudentsDialogOpen', 'graduatedStudentsPopupRef');
content = injectRef(content, 'totalStudentsDialogOpen', 'totalStudentsPopupRef');
content = injectRef(content, 'onLeaveDialogOpen', 'onLeavePopupRef');
content = injectRef(content, 'classesDialogOpen', 'classesPopupRef');

fs.writeFileSync('components/Dashboard.jsx', content, 'utf-8');
console.log("Dashboard.jsx updated successfully!");
