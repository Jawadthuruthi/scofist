const fs = require('fs');
const PNG = require('pngjs').PNG;

fs.createReadStream('public/sdc_seal.png')
  .pipe(new PNG({ filterType: 4 }))
  .on('parsed', function() {
    const idx = 0; // Top left pixel
    const r = this.data[idx].toString(16).padStart(2, '0');
    const g = this.data[idx+1].toString(16).padStart(2, '0');
    const b = this.data[idx+2].toString(16).padStart(2, '0');
    console.log(`#${r}${g}${b}`);
  });
