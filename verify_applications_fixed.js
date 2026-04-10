const axios = require('axios');

const API_KEY = "b6e89b8263fe3dbcfef9d80c0a3e3b2300a07cbcf48ae9f4b0e6c9f2df12d99d";
const BASE_URL = "http://localhost:3000/api";

async function verify() {
    try {
        console.log('--- Phase 1: Fetching initial applications ---');
        const listResponse = await axios.get(`${BASE_URL}/applications?limit=2`, {
            headers: { 'api-key': API_KEY }
        });
        
        const apps = listResponse.data.applications;
        if (apps.length < 2) {
            console.log('Need at least 2 applications for full verification. Found:', apps.length);
            // I'll create one if needed, but assuming there are some in a real DB.
            console.log('Skipping ID specific verification if less than 2.');
        }

        if (apps.length > 0) {
            console.log('--- Phase 2: Verifying individual fetching via _id param ---');
            for (const app of apps) {
                const idResponse = await axios.get(`${BASE_URL}/applications?_id=${app._id}`, {
                    headers: { 'api-key': API_KEY }
                });
                const fetchedApp = idResponse.data.applications[0];
                if (fetchedApp._id === app._id) {
                    console.log(`Success: Correctly fetched ${app._id}`);
                } else {
                    console.error(`Failure: Fetched ${fetchedApp._id} instead of ${app._id}`);
                }
            }

            console.log('--- Phase 3: Verifying individual fetching via /api/applications/:id ---');
             for (const app of apps) {
                const idResponse = await axios.get(`${BASE_URL}/applications/${app._id}`, {
                    headers: { 'api-key': API_KEY }
                });
                const fetchedApp = idResponse.data.applicationForm || idResponse.data;
                if (fetchedApp._id === app._id) {
                    console.log(`Success: Correctly fetched ${app._id} via ID route`);
                } else {
                    console.error(`Failure: Fetched ${fetchedApp._id} instead of ${app._id} via ID route`);
                }
            }

            console.log('--- Phase 4: Verifying PUT (Update) ---');
            const targetApp = apps[0];
            const newStatus = targetApp.status === 'Approved' ? 'Pending' : 'Approved';
            console.log(`Updating status of ${targetApp._id} to ${newStatus}`);
            
            const putResponse = await axios.put(`${BASE_URL}/applications`, {
                id: targetApp._id,
                status: newStatus
            }, {
                headers: { 'api-key': API_KEY }
            });
            
            if (putResponse.data.applicationForm.status === newStatus) {
                console.log('Success: Status updated correctly');
            } else {
                console.error('Failure: Status not updated correctly. Response:', putResponse.data);
            }

            console.log('--- Phase 5: Verifying DELETE ---');
            // I'll create a dummy application to delete so I don't destroy real data if possible,
            // but for verification I'll just use one of the existing ones if this is a test environment.
            // Since I'm an AI working on a dev environment, I'll create a temporary one.
            
            console.log('Creating a temporary application for deletion test...');
            const postResponse = await axios.post(`${BASE_URL}/applications`, {
                name: "Delete Me Test",
                dateOfBirth: "2000-01-01",
                guardianName: "Test Guardian",
                relationship: "Father",
                guardianContactNumber: "1234567890",
                place: "Test Place",
                district: "Test District",
                state: "Test State",
                admissionClass: "8"
            }, {
                headers: { 'api-key': API_KEY }
            });
            
            const tempId = postResponse.data.applicationForm._id;
            console.log(`Temp application created with ID: ${tempId}`);
            
            console.log(`Deleting ${tempId}...`);
            const deleteResponse = await axios.delete(`${BASE_URL}/applications`, {
                headers: { 'api-key': API_KEY },
                data: { ids: [tempId] }
            });
            
            console.log('Delete response:', deleteResponse.data.message);
            
            // Verify it's gone
            try {
                await axios.get(`${BASE_URL}/applications/${tempId}`, {
                    headers: { 'api-key': API_KEY }
                });
                console.error('Failure: Application still exists after deletion!');
            } catch (e) {
                if (e.response && e.response.status === 404) {
                    console.log('Success: Application confirmed deleted (404 Not Found)');
                } else {
                    console.error('Failure: Unexpected error verifying deletion:', e.message);
                }
            }
        }

    } catch (err) {
        console.error('Verification failed:', err.message);
        if (err.response) {
            console.error('Response data:', err.response.data);
        }
    }
}

verify();
