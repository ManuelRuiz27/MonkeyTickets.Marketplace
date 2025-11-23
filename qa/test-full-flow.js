const API_URL = 'http://localhost:3000/api';

async function runTests() {
    console.log('🚀 Starting QA Full Flow Tests...');

    // 1. Test Login
    console.log('\n1️⃣  Testing Staff Login...');
    let token = '';
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'http://localhost:5174'
            },
            body: JSON.stringify({ email: 'scanner1@staff.com', password: 'password123' })
        });
        const data = await response.json();

        if (response.ok) {
            console.log('✅ Login Successful');
            token = data.token;
        } else {
            throw new Error(`Login failed: ${response.status}`);
        }
    } catch (e) {
        console.error('❌ Login Test Failed:', e.message);
        return;
    }

    // 2. Test Get Events (Organizer/Staff events)
    console.log('\n2️⃣  Testing Get Events...');
    try {
        const response = await fetch(`${API_URL}/organizer/events`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Origin': 'http://localhost:5174'
            }
        });

        if (response.ok) {
            const events = await response.json();
            console.log(`✅ Events Fetched: ${events.length} events found`);
            if (events.length > 0) {
                console.log(`   Sample Event: ${events[0].title}`);
            }
        } else {
            console.error(`❌ Get Events Failed: ${response.status}`);
        }
    } catch (e) {
        console.error('❌ Get Events Test Failed:', e.message);
    }

    // 3. Test Validate Ticket (Negative Test)
    console.log('\n3️⃣  Testing Validate Ticket (Invalid QR)...');
    try {
        const response = await fetch(`${API_URL}/tickets/validate/INVALID-QR-CODE-123`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Origin': 'http://localhost:5174'
            }
        });

        const data = await response.json();

        if (response.status === 404 || response.status === 400) {
            console.log(`✅ Validation Endpoint Reachable (Got expected ${response.status})`);
            console.log(`   Response: ${data.message || 'Ticket not found'}`);
        } else if (response.ok) {
            console.warn('⚠️  Unexpected success for invalid ticket');
        } else {
            console.error(`❌ Validate Ticket Failed with unexpected status: ${response.status}`);
        }
    } catch (e) {
        console.error('❌ Validate Ticket Test Failed:', e.message);
    }
}

runTests();
