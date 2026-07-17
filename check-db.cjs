const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb+srv://abdullakk:abdullakk3030@sdc.qw7au9k.mongodb.net/scofist?retryWrites=true&w=majority&appName=SDC');
  const collection = mongoose.connection.collection('divisions');
  const indexes = await collection.indexes();
  console.log("Indexes on divisions collection:");
  console.log(JSON.stringify(indexes, null, 2));
  
  const docs = await collection.find({}).toArray();
  console.log("\nSample division docs:");
  console.log(JSON.stringify(docs.slice(0, 2), null, 2));
  
  process.exit(0);
}

check().catch(console.error);
