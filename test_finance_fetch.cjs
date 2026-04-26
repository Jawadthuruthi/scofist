const mongoose = require('mongoose');

async function test() {
  await mongoose.connect('mongodb://127.0.0.1:27017/scofist');
  const Finance = mongoose.model('Finance', new mongoose.Schema({
    date: Date, type: String, invoiceNo: String, category: String, amount: Number, mode: String, accountType: String, accountName: String, userId: String
  }, { strict: false }));
  
  const AccountName = mongoose.model('AccountName', new mongoose.Schema({
    name: String, accountType: String, userId: String
  }, { strict: false }));

  console.log("Finance documents:", await Finance.find({ accountType: 'College' }).select('accountName userId amount').limit(5));
  console.log("AccountName documents:", await AccountName.find({ accountType: 'College' }).select('name userId').limit(5));

  process.exit(0);
}

test();
