const fs = require('fs');

const lines = fs.readFileSync('d:/Projects/scofist/components/PosterCustomizer.jsx', 'utf-8').split('\n');

// Find boundaries
const gridDefStart = lines.findIndex(l => l.includes('className={`grid gap-6 ${isFullPage ? "lg:grid-cols-3" : "grid-cols-1 md:grid-cols-2"}`}') || l.includes('className={`grid gap-6 ${isFullPage ? "lg:grid-cols-2" : "grid-cols-1 lg:grid-cols-2"}`}'));

const col1Start = lines.findIndex(l => l.includes('{/* ===== COL 1: Poster Options ===== */}'));
const selectPosterStart = lines.findIndex(l => l.includes('{/* Poster Number Dropdown */}'));
const deleteDialogStart = lines.findIndex(l => l.includes('{/* Delete Poster Confirmation Dialog */}'));
const templateStart = lines.findIndex(l => l.includes('{/* Templates Dropdown */}'));
const bgUploadStart = lines.findIndex(l => l.includes('{/* Background Upload — compact button only, no preview column */}'));
const elementsDropdownStart = lines.findIndex(l => l.includes('{/* Elements Dropdown */}'));
const col1End = lines.findIndex(l => l.includes('{/* ===== COL 2: Element Settings ===== */}')) - 2;

const selectPosterEnd = deleteDialogStart - 1;
const deleteDialogEnd = templateStart - 1;
const templateEnd = bgUploadStart - 1;
const bgUploadEnd = elementsDropdownStart - 1;
const elementsDropdownEnd = col1End - 3; // roughly, up to ")}\n                </CardContent>"

const col2Start = lines.findIndex(l => l.includes('{/* ===== COL 2: Element Settings ===== */}'));
const col3Start = lines.findIndex(l => l.includes('{/* ===== COL 3: Poster Preview ===== */}'));
const previewCardContent = lines.findIndex(l => l.includes('              <CardContent>') && l.length < 30);

// Extract segments
const selectPosterBlock = lines.slice(selectPosterStart, selectPosterEnd + 1).join('\n');
const deleteDialogBlock = lines.slice(deleteDialogStart, deleteDialogEnd + 1).join('\n');
const bgUploadBlock = lines.slice(bgUploadStart, bgUploadEnd + 1).join('\n');
const elementsDropdownBlock = lines.slice(elementsDropdownStart, elementsDropdownEnd + 1).join('\n');

const elementsCard = `            {/* Elements Dropdown Card */}
            {!isPreview && (
              <Card>
                <CardContent className="pt-6 pb-6">
${elementsDropdownBlock.replace(/                  /g, "                ")}
                </CardContent>
              </Card>
            )}
`;

const posterAndBgContent = `              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
${selectPosterBlock.replace(/                  /g, "                  ")}
${bgUploadBlock.replace(/                  /g, "                  ")}
                </div>
${deleteDialogBlock.replace(/                  /g, "                ")}
`;

// Reconstruct file
lines[gridDefStart] = '          className={`grid gap-6 ${isFullPage ? "lg:grid-cols-2" : "grid-cols-1 lg:grid-cols-2"}`}';

// Remove Col 1 (replace with empty string)
for (let i = col1Start; i <= col1End; i++) {
    lines[i] = null;
}

// Modify Col 2
for (let i = 0; i < lines.length; i++) {
    if (lines[i] && lines[i].includes('className={`space-y-4 ${isFullPage ? "order-2" : ""}`}')) {
        lines[i] = '            className={`space-y-4 ${isFullPage ? "order-1" : ""}`}';
    }
    if (lines[i] && lines[i].includes('className={`${isFullPage ? "order-3" : ""}`}')) {
        lines[i] = '            className={`${isFullPage ? "order-2" : ""}`}';
    }
}

// Insert into Col 2
lines.splice(col2Start + 4, 0, elementsCard);

// Insert into Col 3
const newPreviewCardContent = lines.findIndex(l => l && l.includes('              <CardContent>') && l.length < 30);
lines[newPreviewCardContent] = posterAndBgContent;

const finalLines = lines.filter(l => l !== null).join('\n');
fs.writeFileSync('d:/Projects/scofist/components/PosterCustomizer.jsx', finalLines, 'utf-8');
console.log("Done");
