const API_URL = 'http://localhost:3000/api';

async function testLogin(email, password, roleName) {
    console.log(`\n🧪 Testing login for ${roleName} (${email})...`);
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'http://localhost:5174' // Simulate Scanner Origin
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            console.log(`✅ Login Successful for ${roleName}`);
            console.log(`   Role: ${data.user.role}`);
            console.log(`   Token: ${data.token ? 'Received' : 'Missing'}`);

            if (data.user.role !== 'ORGANIZER' && data.user.role !== 'STAFF' && data.user.role !== 'DIRECTOR') {
                console.warn(`⚠️  Warning: Unexpected role ${data.user.role}`);
            }
        } else {
            console.error(`❌ Login Failed for ${roleName}`);
            console.error(`   Status: ${response.status}`);
            console.error(`   Data:`, data);
        }

    } catch (error) {
        console.error(`❌ Login Failed for ${roleName}`);
        console.error(`   Error: ${error.message}`);
    }
}

async function runTests() {
    console.log('🚀 Starting QA Login Tests...');

    // Test Staff Login
    await testLogin('scanner1@staff.com', 'password123', 'STAFF');

    // Test Organizer Login
    await testLogin('eventos@musiclive.mx', 'password123', 'ORGANIZER');

    // Test Invalid Login
    await testLogin('invalid@user.com', 'wrongpass', 'INVALID USER');
}

runTests();
