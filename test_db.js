import { createClient } from '@supabase/supabase-js';

// Usar os dados já conhecidos do projeto
const supabaseUrl = 'https://jimjdmypymhqyzjjwqyb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppbWpkbXlweW1ocXl6amp3cXliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4Mjc5NzcsImV4cCI6MjA4NjQwMzk3N30.IPtbNreVM3jUUrsYxH9zmbHJnoivhibxZ4dTiGgZfQY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    try {
        console.log("Logging in...");
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: 'barichelloricardo04@gmail.com',
            password: '98804772'
        });
        
        if (authError) {
            console.error("Login failed:", authError.message);
            return;
        }

        console.log("Checking leads count...");
        const { data, error } = await supabase.from('leads').select('*').limit(1);
        if (error) {
            console.error("Error fetching leads:", error);
        } else {
            console.log("Success! Columns:", data?.length > 0 ? Object.keys(data[0]) : "No leads found");
            console.log("Data sample:", data);
        }
        
        console.log("Testing minimal insert...");
        const payload = {
            user_id: authData.user.id,
            name: 'Test Setup Schema Lead',
        };
        const { data: insertData, error: insertError } = await supabase.from('leads').insert([payload]).select('*');
        if (insertError) {
            console.error("Insert failed! Error details:", insertError);
        } else {
            console.log("Insert succeeded!");
            console.log("Table columns:", Object.keys(insertData[0]));
        }
    } catch(e) {
        console.error("Exception:", e);
    }
}
check();
