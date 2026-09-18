const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("No MONGODB_URI found");
    return;
  }
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const settingsColl = db.collection('settings');
    const settings = await settingsColl.findOne({ _id: 'global_settings' });
    if (settings && settings.festival && settings.festival.resultPosters) {
      let updated = false;
      settings.festival.resultPosters.forEach(poster => {
        if (poster.layout) {
          if (poster.layout.programInfo) {
            poster.layout.programInfo.textAlign = "left";
            updated = true;
          }
          if (poster.layout.divisionInfo) {
            poster.layout.divisionInfo.textAlign = "left";
            updated = true;
          }
        }
      });
      if (updated) {
        await settingsColl.updateOne({ _id: 'global_settings' }, { $set: { "festival.resultPosters": settings.festival.resultPosters } });
        console.log("Updated poster settings to use left alignment.");
      } else {
        console.log("No updates needed.");
      }
    } else {
        console.log("No resultPosters found in settings.");
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}
run();
