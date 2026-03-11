import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jimjdmypymhqyzjjwqyb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppbWpkbXlweW1ocXl6amp3cXliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4Mjc5NzcsImV4cCI6MjA4NjQwMzk3N30.IPtbNreVM3jUUrsYxH9zmbHJnoivhibxZ4dTiGgZfQY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: 'barichelloricardo04@gmail.com',
            password: '98804772'
        });
        
        if (authError) {
            console.error("Login failed:", authError.message);
            return;
        }

        const payload = {
            user_id: authData.user.id,
            name: 'Test Setup Schema Lead',
            company: 'Test Co'
        };
        const { error: insertError } = await supabase.from('leads').insert([payload]);
        if (insertError) {
            console.error("SUPABASE_ERROR_DUMP:", JSON.stringify(insertError));
        } else {
            console.log("INSERT_SUCCESS");
        }
    } catch(e) {
        console.error("Exception:", e);
    }
}
check();
