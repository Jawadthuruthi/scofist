import os
import re

files_to_update = [
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
]

# The regex to find the icon div inside a DialogHeader/AlertDialogHeader.
# It captures the header tag opening, any classes, the icon element itself, etc.
# We will just parse the file text.

def process_file(filepath):
    if not os.path.exists(filepath):
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Skip if it already has useDownloadPopup
    if 'useDownloadPopup' in content:
        return

    # To be safe, we will just use multi_replace_file_content for precision, but wait, the python script can modify it.
    # Actually, injecting `popupRef` and `useDownloadPopup` inside the component body using regex is VERY hard and error prone in Python without an AST parser.
    # Because we need to find where the component starts and where the `DialogContent` is.
    print(f"Skipping python replace for {filepath} because AST manipulation is needed.")

if __name__ == "__main__":
    for f in files_to_update:
        process_file(f)
