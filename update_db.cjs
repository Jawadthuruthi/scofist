const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://abdullakk:abdullakk3030@sdc.qw7au9k.mongodb.net/scofist?retryWrites=true&w=majority&appName=SDC', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const Settings = mongoose.model('Settings', new mongoose.Schema({}, { strict: false }));
    await Settings.updateOne({}, { $addToSet: { 'general.nonWorkingDays': new Date('2026-06-27T00:00:00.000Z') } });
    console.log('Successfully updated DB with 2026-06-27');
    process.exit(0);
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
