const fs = require('fs');
const files = [
  'components/YearSwitcher.jsx',
  'components/ProgramDetailsModal.jsx',
  'components/ProfileComparisonDialog.jsx',
  'components/PendingRequestsDialog.jsx',
  'components/MyPeriods.jsx',
  'components/masjid-attendance/AttendanceSheet.jsx',
  'components/masjid-attendance/PrayerSection.jsx',
  'components/ImageUploader.jsx',
  'components/IdentityCards.jsx',
  'components/DataTableComponent.jsx',
  'components/ConfirmationPopup.jsx',
  'components/Dashboard.jsx',
  'components/CodeLettersComponent.jsx',
  'components/Attendance.jsx',
  'components/StudentsFund.jsx',
  'components/TimeTableComponent.jsx',
  'components/TimeTablesManagements.jsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf-8');
  
  // Skip if already has useDownloadPopup
  if (content.includes('useDownloadPopup')) continue;
  
  const hasIconHeader = /<(?:Dialog|AlertDialog)Header[^>]*>[\s\S]*?<div[^>]*className="[^"]*p-2 rounded-lg[^"]*"[^>]*>[\s\S]*?<\w+[^>]*>[\s\S]*?<\/div>/g;
  
  if (!hasIconHeader.test(content)) continue;
  console.log('Needs updating:', file);
}
