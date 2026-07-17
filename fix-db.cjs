const mongoose = require('mongoose');

async function fix() {
  await mongoose.connect('mongodb+srv://abdullakk:abdullakk3030@sdc.qw7au9k.mongodb.net/scofist?retryWrites=true&w=majority&appName=SDC');
  const collection = mongoose.connection.collection('divisions');
  
  try {
    await collection.dropIndex('name_1');
    console.log("Successfully dropped name_1 index.");
  } catch (err) {
    console.error("Error dropping name_1:", err.message);
  }

  process.exit(0);
}

fix().catch(console.error);
