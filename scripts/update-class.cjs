const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://abdullakk:abdullakk3030@sdc.qw7au9k.mongodb.net/scofist?retryWrites=true&w=majority&appName=SDC').then(async () => {
  const usersCollection = mongoose.connection.collection('users');
  const result = await usersCollection.updateMany(
    { 'studentSpecificField.classId': 'CLS-12' },
    { $set: { 
        'studentSpecificField.classId': 'CLS-2',
        'classId': 'CLS-2',
        'studentSpecificField.batchId': 'BTC-18',
        'batchId': 'BTC-18'
      } 
    }
  );
  console.log('Modified students count:', result.modifiedCount);
  
  // Let's also check if there are any students with classId 'CLS-12' at root level
  const rootResult = await usersCollection.updateMany(
    { 'classId': 'CLS-12' },
    { $set: { 
        'studentSpecificField.classId': 'CLS-2',
        'classId': 'CLS-2',
        'studentSpecificField.batchId': 'BTC-18',
        'batchId': 'BTC-18'
      } 
    }
  );
  console.log('Modified root students count:', rootResult.modifiedCount);
  
  process.exit(0);
});
