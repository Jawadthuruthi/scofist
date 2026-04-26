const mongoose = require('mongoose'); 
mongoose.connect('mongodb://127.0.0.1:27017/scofist').then(() => { 
  const Finance = mongoose.model('Finance', new mongoose.Schema({}, { strict: false })); 
  Finance.find({ accountType: 'College', userId: { $exists: false } }).countDocuments().then(c => { 
    console.log('Count without userId:', c); 
    process.exit(0); 
  }); 
});
