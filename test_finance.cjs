
const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/scofist').then(async () => {
  const Finance = mongoose.model('Finance', new mongoose.Schema({
    date: Date, type: String, invoiceNo: String, category: String, amount: Number, mode: String, accountType: String, userId: String
  }, { strict: false }));
  
  await Finance.create({ date: new Date(), type: 'Expense', invoiceNo: 'TEST-1', category: 'Test', amount: 100, mode: 'Cash', accountType: 'College', userId: 'TCH-001' });
  await Finance.create({ date: new Date(), type: 'Expense', invoiceNo: 'TEST-2', category: 'Test', amount: 100, mode: 'Cash', accountType: 'College', userId: 'TCH-002' });
  
  const results1 = await Finance.find({ accountType: 'College', userId: 'TCH-001' });
  console.log('TCH-001 sees:', results1.length);
  
  const results2 = await Finance.find({ accountType: 'College', userId: 'TCH-002' });
  console.log('TCH-002 sees:', results2.length);
  
  process.exit(0);
});

