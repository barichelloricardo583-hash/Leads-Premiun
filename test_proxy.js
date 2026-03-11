
const url = 'http://localhost:3001/supabase-proxy/rest/v1/leads?select=*';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppbWpkbXlweW1ocXl6amp3cXliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4Mjc5NzcsImV4cCI6MjA4NjQwMzk3N30.IPtbNreVM3jUUrsYxH9zmbHJnoivhibxZ4dTiGgZfQY';

async function testProxy() {
    console.log("Testing proxy at http://localhost:3001/supabase-proxy...");
    try {
        const response = await fetch(url, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                // Simulate a large header to test the 431 fix
                'X-Dummy-Header': 'X'.repeat(20000) 
            }
        });
        console.log("Response status:", response.status);
        if (response.status === 200) {
            const data = await response.json();
            console.log("Success! Data count via proxy:", data.length);
        } else {
            console.log("Proxy returned an error:", response.statusText);
            const text = await response.text();
            console.log("Error body:", text.substring(0, 200));
        }
    } catch (error) {
        console.error("Test proxy failed:", error.message);
    }
}

testProxy();
