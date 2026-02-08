
import axios from 'axios';

async function testCreateTeacher() {
    try {
        const response = await axios.post('http://localhost:3001/api/users', {
            _id: 'TEST001',
            name: 'Test Librarian Teacher',
            email: 'testlibrarianteacher@example.com',
            roles: ['Teacher', 'Librarian'],
            contactNumber: '1234567890',
            dateOfBirth: '1990-01-01',
            dateOfJoining: '2023-01-01',
            // status field is required for Teacher role, but let's see if it causes issues if we send it or not
            status: 'Active',
            place: 'Test Place',
            district: 'Test District',
            state: 'Test State',
            pin: '123456',
            // Adding other required fields based on User model
            address: {
                place: 'Test Place',
                district: 'Test District',
                state: 'Test State'
            }
        }, {
            headers: {
                'api-key': 'b6e89b8263fe3dbcfef9d80c0a3e3b2300a07cbcf48ae9f4b0e6c9f2df12d99d',
                'Content-Type': 'application/json'
            }
        });
        console.log('Success:', response.data);
    } catch (error) {
        console.error('Error:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    }
}

testCreateTeacher();
