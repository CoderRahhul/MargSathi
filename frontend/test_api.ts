import axios from 'axios';

const API_KEY = 'rakshamarg-dwklhfdewhff-efjjefwoihjfohgn';
const URL = 'http://34.59.71.173:8000/api/v1/navigation/incident/details?id=11837,11842,12099';

async function testApi() {
    try {
        const response = await axios.get(URL, {
            headers: {
                'x-api-key': API_KEY
            }
        });
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

testApi();
