const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

// Since the project uses ES modules for models, we might need a workaround or just test with a simple script that imports them if possible.
// However, the models use `import`, so we should use a dynamic import or a tool that supports ESM.

async function test() {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGODB_URI.trim());
        console.log('Connected!');

        // Import model dynamically
        const { default: CustomRole } = await import('./models/CustomRole.js');

        console.log('Testing role creation...');
        const roleName = 'TEST_' + Date.now();
        const role = await CustomRole.create({
            name: roleName,
            description: 'Internal test role'
        });
        console.log('Role created:', role.name);

        console.log('Testing member addition...');
        role.members.push({
            email: 'test@example.com',
            name: 'Test Member',
            addedAt: new Date()
        });
        await role.save();
        console.log('Member added.');

        console.log('Testing retrieval...');
        const found = await CustomRole.findOne({ name: roleName });
        console.log('Found role:', found.name, 'with', found.members.length, 'members.');

        console.log('Cleaning up...');
        await CustomRole.deleteOne({ _id: role._id });
        console.log('Cleaned up.');

        await mongoose.disconnect();
        console.log('Disconnected.');
        process.exit(0);
    } catch (err) {
        console.error('Test failed:', err);
        process.exit(1);
    }
}

test();
