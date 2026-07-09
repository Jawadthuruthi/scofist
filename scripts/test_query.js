import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const books = await mongoose.connection.db.collection('librarybooks').find({ id: { $regex: 'HY' } }).limit(5).toArray();
  console.log(books);
  process.exit(0);
});
