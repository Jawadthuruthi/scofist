const fs = require('fs');

let content = fs.readFileSync('components/StudentsFund.jsx', 'utf-8');

// Add hook import
content = content.replace(
    'import useCrud from "@/hooks/use-crud";',
    'import useCrud from "@/hooks/use-crud";\nimport { useDownloadPopup } from "@/hooks/useDownloadPopup";'
);

function injectPopupLogic(content) {
    // 1. All Students Balance Popup
    // state: showBalanceDialog
    // color: primary, icon: FileText
    let pattern1 = /(<DialogContent className="sm:max-w-2xl h-\[90vh\] sm:h-\[70vh\] flex flex-col p-0 gap-0 \[\&>button\.absolute\]:hidden">)/g;
    content = content.replace(pattern1, '<DialogContent ref={allStudentsBalancePopupRef} data-html2canvas-popup="true" className="sm:max-w-2xl h-[90vh] sm:h-[70vh] flex flex-col p-0 gap-0 [&>button.absolute]:hidden">');
    
    let header1 = /(<div className="p-2 rounded-lg bg-primary\/10 shrink-0">\s*)<FileText className="h-5 w-5 text-primary" \/>(\s*<\/div>)/g;
    content = content.replace(header1, '<button type="button" className="p-2 rounded-lg bg-primary/10 shrink-0 hover:bg-primary/20 transition-colors focus:outline-none cursor-pointer" onClick={handleAllStudentsBalanceDownload} title="Download Image" data-html2canvas-ignore="true">\n                                  <FileText className="h-5 w-5 text-primary" />\n                                </button>');

    // 2. Transaction History Popup
    // It does not have an explicit `open` state provided to <Dialog> that I saw (it was just DialogTrigger). Let's check if it does.
    // wait, it is inside the selected student panel.
    let pattern2 = /(<DialogContent className="sm:max-w-2xl h-\[80vh\] flex flex-col p-0 gap-0 \[\&>button\.absolute\]:hidden">)/g;
    content = content.replace(pattern2, '<DialogContent ref={transactionHistoryPopupRef} data-html2canvas-popup="true" className="sm:max-w-2xl h-[80vh] flex flex-col p-0 gap-0 [&>button.absolute]:hidden">');

    let header2 = /(<div className="p-2 rounded-lg bg-primary\/10 shrink-0">\s*)<History className="h-5 w-5 text-primary" \/>(\s*<\/div>)/g;
    content = content.replace(header2, '<button type="button" className="p-2 rounded-lg bg-primary/10 shrink-0 hover:bg-primary/20 transition-colors focus:outline-none cursor-pointer" onClick={handleTransactionHistoryDownload} title="Download Image" data-html2canvas-ignore="true">\n                          <History className="h-5 w-5 text-primary" />\n                        </button>');

    // 3. Delete confirmation (AlertDialog)
    // <AlertDialogContent className="sm:max-w-lg flex flex-col p-0 gap-0 [&>button.absolute]:hidden overflow-hidden">
    let pattern3 = /(<AlertDialogContent className="sm:max-w-lg flex flex-col p-0 gap-0 \[\&>button\.absolute\]:hidden overflow-hidden">)/g;
    content = content.replace(pattern3, '<AlertDialogContent ref={deletePopupRef} data-html2canvas-popup="true" className="sm:max-w-lg flex flex-col p-0 gap-0 [&>button.absolute]:hidden overflow-hidden">');

    let header3 = /(<div className="p-2 rounded-lg bg-destructive\/10 shrink-0">\s*)<AlertTriangle className="h-5 w-5 text-destructive" \/>(\s*<\/div>)/g;
    content = content.replace(header3, '<button type="button" className="p-2 rounded-lg bg-destructive/10 shrink-0 hover:bg-destructive/20 transition-colors focus:outline-none cursor-pointer" onClick={handleDeleteDownload} title="Download Image" data-html2canvas-ignore="true">\n              <AlertTriangle className="h-5 w-5 text-destructive" />\n            </button>');

    // 4. Settings Dialog
    let pattern4 = /(<Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>\s*)<DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl \[\&>button\.absolute\]:hidden">/g;
    content = content.replace(pattern4, '$1<DialogContent ref={settingsPopupRef} data-html2canvas-popup="true" className="sm:max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl [&>button.absolute]:hidden">');

    let header4 = /(<div className="p-2 rounded-lg bg-primary\/10 shrink-0">\s*)<Settings className="h-5 w-5 text-primary" \/>(\s*<\/div>)/g;
    content = content.replace(header4, '<button type="button" className="p-2 rounded-lg bg-primary/10 shrink-0 hover:bg-primary/20 transition-colors focus:outline-none cursor-pointer" onClick={handleSettingsDownload} title="Download Image" data-html2canvas-ignore="true">\n              <Settings className="h-5 w-5 text-primary" />\n            </button>');

    // Fix DialogClose for all
    const patternClose = /(<DialogClose className="[^"]+focus:outline-none">)/g;
    const replacementClose = (match) => {
        return match.slice(0, -2) + '" data-html2canvas-ignore="true">';
    };
    content = content.replace(patternClose, replacementClose);
    
    // Fix AlertDialogCancel
    const patternAlertClose = /(<AlertDialogCancel className="[^"]+mt-0">)/g;
    const replacementAlertClose = (match) => {
        return match.slice(0, -2) + '" data-html2canvas-ignore="true">';
    };
    content = content.replace(patternAlertClose, replacementAlertClose);

    return content;
}

content = injectPopupLogic(content);

// inject refs at the beginning of the component
const refsInjection = `
  const allStudentsBalancePopupRef = useRef(null);
  const { handleDownload: handleAllStudentsBalanceDownload } = useDownloadPopup(allStudentsBalancePopupRef, "All_Students_Balance.jpeg");

  const transactionHistoryPopupRef = useRef(null);
  const { handleDownload: handleTransactionHistoryDownload } = useDownloadPopup(transactionHistoryPopupRef, "Transaction_History.jpeg");

  const deletePopupRef = useRef(null);
  const { handleDownload: handleDeleteDownload } = useDownloadPopup(deletePopupRef, "Delete_Confirmation.jpeg");

  const settingsPopupRef = useRef(null);
  const { handleDownload: handleSettingsDownload } = useDownloadPopup(settingsPopupRef, "Settings.jpeg");
`;

content = content.replace(
    'const { get, post, put, delete: del } = useCrud();',
    'const { get, post, put, delete: del } = useCrud();\n' + refsInjection
);

fs.writeFileSync('components/StudentsFund.jsx', content, 'utf-8');
console.log("StudentsFund.jsx updated successfully!");
