import axios from 'axios';

async function testWandbox() {
    try {
        const response = await axios.post('https://wandbox.org/api/compile.json', {
            code: '#include <iostream>\nint main() { std::cout << "Wandbox C++ Connectivity Test: SUCCESS!"; return 0; }',
            compiler: 'gcc-head',
            save: false
        });
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

testWandbox();
