const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });
async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const settingsCol = db.collection('settings');
  try {
    const res1 = await settingsCol.updateOne({}, { $pull: { teamPointsSnapshot: { year: '2026 September' } } });
    console.log('pull res:', res1);
    const res2 = await settingsCol.updateOne({}, { $push: { teamPointsSnapshot: { year: '2026 September', test: 1 } } }, { upsert: true });
    console.log('push res:', res2);
  } catch (e) {
    console.error(e);
  }
  await mongoose.disconnect();
}
main().catch(console.error);
