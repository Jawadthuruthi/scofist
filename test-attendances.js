import fetch from 'node-fetch';

async function testFetch() {
    try {
        const response = await fetch('http://localhost:3000/api/literary/attendances?trackHistory=true', {
            headers: {
                'api-key': '47b86b3e028b34008ab9e5c9b83fcad2',
                'active-role': 'Literary Leader'
            }
        });
        const data = await response.json();
        console.log("Total history items:", data.history?.length);
        const groupMeetings = data.history?.filter(h => h.category === 'GROUP').length;
        const generalMeetings = data.history?.filter(h => h.category === 'ALL').length;
        console.log("Group count:", groupMeetings);
        console.log("General count:", generalMeetings);
    } catch (error) {
        console.error("Error:", error);
    }
}

testFetch();
