import re

with open('components/Dashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

def replace_popup(content, ref_name, icon_name, download_name, color):
    # Regex to match the DialogHeader
    pattern = r'(<DialogHeader className="flex flex-row items-center gap-3 mx-0 px-5 py-4 border-b space-y-0 bg-muted/50 dark:bg-muted/20 sticky top-0 z-20 backdrop-blur-md">\s*)<div className="p-2 rounded-lg bg-' + color + r'-(?:500/10|100 dark:bg-[^"]+)">\s*<' + icon_name + r' className="h-5 w-5 text-' + color + r'-500" />\s*</div>'
    
    replacement = r'\1<button type="button" className="p-2 rounded-lg bg-' + color + r'-500/10 hover:bg-' + color + r'-500/20 transition-colors focus:outline-none cursor-pointer" onClick={' + download_name + r'} title="Download Image" data-html2canvas-ignore="true">\n            <' + icon_name + r' className="h-5 w-5 text-' + color + r'-500" />\n          </button>'
    
    content = re.sub(pattern, replacement, content, count=1)
    return content

content = replace_popup(content, 'activeStudentsPopupRef', 'Users', 'handleActiveStudentsDownload', 'green')
content = replace_popup(content, 'graduatedStudentsPopupRef', 'GraduationCap', 'handleGraduatedStudentsDownload', 'purple')
content = replace_popup(content, 'totalStudentsPopupRef', 'UserMinus', 'handleTotalStudentsDownload', 'orange')
content = replace_popup(content, 'onLeavePopupRef', 'UserX', 'handleOnLeaveDownload', 'red')
content = replace_popup(content, 'classesPopupRef', 'BookOpen', 'handleClassesDownload', 'blue')

# Fix DialogClose for all inside StatsOverview
pattern_close = r'(<DialogClose className="p-1\.5 -mr-1\.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none">)'
replacement_close = r'<DialogClose className="p-1.5 -mr-1.5 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none" data-html2canvas-ignore="true">'
content = re.sub(pattern_close, replacement_close, content)

# Inject ref to DialogContent
def inject_ref(content, state_name, ref_name):
    # e.g. <Dialog open={activeStudentsDialogOpen} onOpenChange={setActiveStudentsDialogOpen}>\s*<DialogContent className="
    pattern = r'(<Dialog open={' + state_name + r'} onOpenChange={set' + state_name[0].upper() + state_name[1:] + r'}>\s*)<DialogContent className="([^"]+)"'
    replacement = r'\1<DialogContent ref={' + ref_name + r'} data-html2canvas-popup="true" className="\2"'
    return re.sub(pattern, replacement, content, count=1)

content = inject_ref(content, 'activeStudentsDialogOpen', 'activeStudentsPopupRef')
content = inject_ref(content, 'graduatedStudentsDialogOpen', 'graduatedStudentsPopupRef')
content = inject_ref(content, 'totalStudentsDialogOpen', 'totalStudentsPopupRef')
content = inject_ref(content, 'onLeaveDialogOpen', 'onLeavePopupRef')
content = inject_ref(content, 'classesDialogOpen', 'classesPopupRef')

with open('components/Dashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Dashboard.jsx updated successfully!")
