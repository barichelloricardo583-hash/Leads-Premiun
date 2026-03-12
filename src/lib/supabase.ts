import { createClient } from '@supabase/supabase-js';

const isDev = import.meta.env.DEV;
const supabaseUrl = isDev 
    ? `${window.location.origin}/supabase-proxy`
    : import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl && !isDev) {
    console.error('VITE_SUPABASE_URL não definida. Verifique o arquivo .env');
}
if (!supabaseAnonKey) {
    console.error('VITE_SUPABASE_ANON_KEY não definida. Verifique o arquivo .env');
}

// Monitoramento silencioso de tamanho de sessao (apenas avisa no console se for crítico)
const checkSessionSize = () => {
    // Busca dinâmica pelas chaves do Supabase no localStorage
    const supabaseKeys = Object.keys(localStorage).filter(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
    supabaseKeys.forEach(key => {
        const session = localStorage.getItem(key);
        if (session && session.length > 12000) {
            console.warn(`⚠️ SESSÃO GRANDE [${key}]: Se notar erros de "Failed to fetch", use o botão de Reset no Login.`);
        }
    });
};
checkSessionSize();
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    },
});

/**
 * Funçao para limpar todos os dados de sessao locais e resolver o erro 431/Failed to fetch
 */
export const clearSessionData = async () => {
    // 1. Limpa o Supabase
    await supabase.auth.signOut();
    
    // 2. Limpa apenas chaves relacionadas ao Supabase e ao App
    const keysToRemove = Object.keys(localStorage).filter(key => 
        key.startsWith('sb-') || 
        key.startsWith('@LeadsPremium:')
    );
    keysToRemove.forEach(key => localStorage.removeItem(key));
    sessionStorage.clear();
    
    // 3. Limpa cookies específicos (se houver conhecimento de nomes)
    // Mantido genérico mas com cautela
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
        // Limpar apenas cookies que pareçam ser de auth do supabase
        if (name.startsWith('sb-')) {
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        }
    }
    
    // 4. Recarrega a pagina para garantir um estado limpo
    window.location.reload();
};
