import React from 'react';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { IMAGES, AppView } from '../constants';

import { supabase } from '../lib/supabase';

interface LoginPageProps {
    onNavigate: (view: AppView) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            
            if (data.session) {
                 onNavigate('performance');
            }
        } catch (err: any) {
             setError(err.message || 'Erro ao fazer login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-display bg-[#101822]">
            {/* Background */}
            <div className="absolute inset-0 z-0">
                 <div className="absolute inset-0 bg-gradient-to-tr from-[#136dec] via-[#101822] to-[#101822] opacity-20"></div>
                 <img 
                    src={IMAGES.LOGIN_BG} 
                    alt="Background" 
                    className="w-full h-full object-cover mix-blend-overlay opacity-30"
                 />
            </div>

            <div className="w-full max-w-md p-6 z-10 relative">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold tracking-tight text-white mb-2">LEADS Premium</h1>
                </div>

                <div className="bg-[#1a2432] rounded-xl shadow-2xl ring-1 ring-slate-700/50 p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg mb-4">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">E-mail Corporativo</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="text-slate-400" size={20} />
                                </div>
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="nome@empresa.com.br"
                                    required
                                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-600 rounded-lg leading-5 bg-[#151e29] text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#136dec] focus:border-[#136dec] sm:text-sm transition-colors duration-200"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Senha</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="text-slate-400" size={20} />
                                </div>
                                <input 
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="block w-full pl-10 pr-10 py-2.5 border border-slate-600 rounded-lg leading-5 bg-[#151e29] text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#136dec] focus:border-[#136dec] sm:text-sm transition-colors duration-200"
                                />
                                <div 
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer hover:text-white text-slate-400 transition-colors"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input id="remember-me" type="checkbox" className="h-4 w-4 text-[#136dec] focus:ring-[#136dec] border-slate-600 rounded bg-[#151e29]" />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-400">Lembrar de mim</label>
                            </div>
                            <div className="text-sm">
                                <a href="#" className="font-medium text-[#136dec] hover:text-blue-400 transition-colors">Esqueci minha senha</a>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-[#136dec] hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#136dec] focus:ring-offset-[#1a2432] transition-all duration-200 hover:shadow-lg hover:shadow-[#136dec]/20 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {loading ? 'Entrando...' : 'Entrar na Plataforma'}
                        </button>
                    </form>
                </div>
                
                <div className="mt-8 text-center text-sm text-slate-500 flex flex-col gap-3">
                    <div>
                        Não tem uma conta?
                        <button onClick={() => onNavigate('register')} className="font-medium text-[#136dec] hover:text-blue-400 transition-colors ml-1">Solicitar cadastro</button>
                    </div>
                    <div className="pt-4 border-t border-slate-700/50">
                        <button 
                            onClick={async () => {
                                if (confirm('Isso irá limpar todos os dados de login e cookies do seu navegador para resolver erros de conexão. Deseja continuar?')) {
                                    const { clearSessionData } = await import('../lib/supabase');
                                    await clearSessionData();
                                }
                            }}
                            className="text-slate-500 hover:text-red-400 text-xs transition-colors underline decoration-dotted underline-offset-4"
                        >
                            Problemas ao entrar? Resetar conexão e cookies
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
