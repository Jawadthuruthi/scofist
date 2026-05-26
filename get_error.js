const puppeteer = require('puppeteer');  
(async () = const browser = await puppeteer.launch(); const page = await browser.newPage(); page.on('console', msg = LOG:', msg.text())); page.on('pageerror', err = ERROR:', err.toString())); await page.goto('http://localhost:3000/dashboard/students-reports'); await new Promise(r =, 5000)); await browser.close(); })(); 
