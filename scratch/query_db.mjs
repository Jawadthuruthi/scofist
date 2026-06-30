import mongoose from 'mongoose';
mongoose.connect('mongodb+srv://abdullakk:abdullakk3030@sdc.qw7au9k.mongodb.net/scofist?retryWrites=true&w=majority&appName=SDC').then(async () => {
  const classes = await mongoose.connection.db.collection('classes').find({}).toArray();
  const plusTwo = classes.filter(c => c.name.toLowerCase().includes('plus'));
  console.log('Plus Two classes:', plusTwo);
  
  const users = await mongoose.connection.db.collection('users').find({ 'studentSpecificField.classId': 'CLS-2' }).toArray();
  console.log('Users with CLS-2:', users.length);
  process.exit();
});
