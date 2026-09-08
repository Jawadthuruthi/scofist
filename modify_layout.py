import re

with open('d:/Projects/scofist/components/PosterCustomizer.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Change the main grid
content = re.sub(
    r'className={`grid gap-6 \${isFullPage \? "lg:grid-cols-3" : "grid-cols-1 md:grid-cols-2"}`}',
    r'className={`grid gap-6 ${isFullPage ? "lg:grid-cols-2" : "grid-cols-1 lg:grid-cols-2"}`}',
    content
)

# Extract Elements Dropdown
elements_dropdown_match = re.search(r'(                  {/\* Elements Dropdown \*/}.*?                  }\n)', content, re.DOTALL)
elements_dropdown = elements_dropdown_match.group(1)

# Extract Poster Number Dropdown
poster_dropdown_match = re.search(r'(                  {/\* Poster Number Dropdown \*/}.*?                  </div>\n)', content, re.DOTALL)
poster_dropdown = poster_dropdown_match.group(1)

# Extract Delete Dialog
delete_dialog_match = re.search(r'(                  {/\* Delete Poster Confirmation Dialog \*/}.*?                  </AlertDialog>\n)', content, re.DOTALL)
delete_dialog = delete_dialog_match.group(1)

# Extract Background Upload
bg_upload_match = re.search(r'(                  {/\* Background Upload — compact button only, no preview column \*/}.*?                  }\n)', content, re.DOTALL)
bg_upload = bg_upload_match.group(1)

# Remove COL 1 entirely
col1_pattern = r'(          {/\* ===== COL 1: Poster Options ===== \*/}\n          <div\n            className={`space-y-4 \${isFullPage \? "order-1" : ""}`}\n          >.*?          </div>\n\n)'
content = re.sub(col1_pattern, '', content, flags=re.DOTALL)

# Insert Elements Dropdown into COL 2
elements_card = f"""            {{/* Elements Dropdown Card */}}
            <Card>
              <CardContent className="pt-6 pb-6">
{elements_dropdown.replace("                  ", "                ")}              </CardContent>
            </Card>

"""

# Fix the order-2 to order-1
content = content.replace(
    'className={`space-y-4 ${isFullPage ? "order-2" : ""}`}',
    'className={`space-y-4 ${isFullPage ? "order-1" : ""}`}'
)

content = content.replace(
    '          {/* ===== COL 2: Element Settings ===== */}\n          <div\n            className={`space-y-4 ${isFullPage ? "order-1" : ""}`}\n          >\n',
    f'          {{/* ===== COL 2: Element Settings ===== */}}\n          <div\n            className={{`space-y-4 ${{isFullPage ? "order-1" : ""}}`}}\n          >\n{elements_card}'
)

# Insert Poster and Background into COL 3
# Find Poster Preview CardContent
preview_content = f"""              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
{poster_dropdown.replace("                  ", "                  ")}
{bg_upload.replace("                  ", "                  ")}
                </div>
{delete_dialog.replace("                  ", "                ")}
"""

content = content.replace(
    '              <CardContent>\n                <div className="w-full">',
    f'{preview_content}                <div className="w-full">'
)

# Fix the order-3 to order-2
content = content.replace(
    'className={`${isFullPage ? "order-3" : ""}`}',
    'className={`${isFullPage ? "order-2" : ""}`}'
)


with open('d:/Projects/scofist/components/PosterCustomizer.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
