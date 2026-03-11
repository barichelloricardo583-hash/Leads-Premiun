import { createClient } from '@supabase/supabase-js';

const isDev = import.meta.env.DEV;
const supabaseUrl = isDev 
    ? `${window.location.origin}/supabase-proxy`
    : 'https://jimjdmypymhqyzjjwqyb.supabase.co';

// Monitoramento silencioso de tamanho de sessao (apenas avisa no console se for crítico)
const checkSessionSize = () => {
    const session = localStorage.getItem('sb-jimjdmypymhqyzjjwqyb-auth-token');
    if (session && session.length > 12000) {
        console.warn('⚠️ SESSAO GRANDE: Se notar erros de "Failed to fetch", use o botao de Reset no Login.');
    }
};
checkSessionSize();
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppbWpkbXlweW1ocXl6amp3cXliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4Mjc5NzcsImV4cCI6MjA4NjQwMzk3N30.IPtbNreVM3jUUrsYxH9zmbHJnoivhibxZ4dTiGgZfQY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Funçao para limpar todos os dados de sessao locais e resolver o erro 431/Failed to fetch
 */
export const clearSessionData = async () => {
    // 1. Limpa o Supabase
    await supabase.auth.signOut();
    
    // 2. Limpa localStorage e sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    
    // 3. Limpa cookies do dominio atual
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substring(0, eqPos) : cookie;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    }
    
    // 4. Recarrega a pagina para garantir um estado limpo
    window.location.reload();
};
