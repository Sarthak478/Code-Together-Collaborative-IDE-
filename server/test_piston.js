import axios from 'axios';

async function testPiston() {
    try {
        const response = await axios.post('https://emkc.org/api/v2/piston/execute', {
            language: 'python',
            version: '3.10.0',
            files: [{ content: "print('Piston connectivity test: SUCCESS!')" }]
        });
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

testPiston();
