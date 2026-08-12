const fs = require('fs');
let c = fs.readFileSync('components/Dashboard.jsx', 'utf8');

// 1. Add DialogClose import
if (!c.includes('DialogClose')) {
  c = c.replace(/DialogDescription,/, 'DialogDescription, DialogClose,');
}

// 2. Hide absolute button and adjust height
c = c.replace(/<DialogContent className="([^"]*?)(max-h-\[80vh\]|max-h-\[75vh\])/g, '<DialogContent className="$1max-h-[70vh] sm:max-h-[80vh] [&>button.absolute]:hidden');

// 3. Add DialogClose inside DialogHeader
// All DialogHeaders in Dashboard.jsx look like:
//             </div>
//           </DialogHeader>
c = c.replace(/            <\/div>\s*<\/DialogHeader>/g, 
`            </div>
            <DialogClose className="p-1.5 -mr-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground focus:outline-none">
              <X className="h-5 w-5" />
            </DialogClose>
          </DialogHeader>`);

fs.writeFileSync('components/Dashboard.jsx', c);
console.log('done3');
