const axios = require('axios');

async function testApi() {
    try {
        console.log('Fetching users from local API...');
        const response = await axios.get('http://localhost:3000/api/users?limit=5', {
            headers: {
                'api-key': 'b6e89b8263fe3dbcfef9d80c0a3e3b2300a07cbcf48ae9f4b0e6c9f2df12d99d'
            }
        });

        console.log('Success!');
        console.log('Total users found:', response.data.pagination.total);
        console.log('First user structure:', JSON.stringify(response.data.users[0], null, 2));

        const users = response.data.users;
        const filtered = users.filter((u) => {
            if (!u.roles || u.roles.length === 0) return true;
            return !u.roles.some((r) => r === 'Teacher' || r === 'Student');
        });

        console.log('Users after initial role filter:', filtered.length);
        if (filtered.length > 0) {
            const u = filtered[0];
            const searchTerm = '';
            const fields = [u.name, u.email, u._id, u.contactNumber];
            console.log('Testing search fields:', fields);

            try {
                const matches = fields.some((f) => f?.toLowerCase().includes(searchTerm.toLowerCase()));
                console.log('Search matches (empty term):', matches);
            } catch (e) {
                console.error('SEARCH FILTER CRASHED:', e.message);
            }
        }

    } catch (err) {
        console.error('API Test failed:', err.message);
        if (err.response) {
            console.error('Response data:', err.response.data);
        }
    }
}

testApi();
