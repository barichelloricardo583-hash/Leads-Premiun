import React from 'react';
import { Mail, Lock, User, Building, Briefcase, Eye, Rocket, CheckCircle } from 'lucide-react';
import { IMAGES, AppView } from '../constants';

import { supabase } from '../lib/supabase';

interface RegisterPageProps {
    onNavigate: (view: AppView) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate }) => {
    const [name, setName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [officeName, setOfficeName] = React.useState('');
    const [role, setRole] = React.useState('Assessor');
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                        office_name: officeName,
                        role: role,
                    }
                }
            });

            if (signUpError) throw signUpError;

            // Optional: If email confirmation is off, this directly logs you in.
            // Adjust the navigation base on your confirmation settings
            if (data.session || data.user) {
                 onNavigate('leads');
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao criar conta');
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-[#101822]">
            {/* Left Side */}
            <div className="relative w-full md:w-1/2 lg:w-5/12 hidden md:flex flex-col justify-end p-12 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img src={IMAGES.REGISTER_BG} alt="Background" className="w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#101822] via-[#101822]/80 to-[#136dec]/20 mix-blend-multiply"></div>
                </div>
                
                <div className="relative z-10 max-w-lg mb-8">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-8 h-8 rounded bg-[#136dec] flex items-center justify-center">
                            <span className="material-icons text-white text-sm">trending_up</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight text-white">LEADS Premium</span>
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                        Transforme sua <span className="text-[#136dec]">prospecção</span>.
                    </h1>
                    <p className="text-lg text-gray-300 leading-relaxed mb-8">
                        O CRM definitivo para assessores de alta performance. Gerencie leads, agende reuniões e feche negócios com a plataforma líder do mercado financeiro.
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex -space-x-3">
                            <img src={IMAGES.TESTIMONIAL_1} alt="User" className="w-10 h-10 rounded-full border-2 border-[#101822]" />
                            <img src={IMAGES.TESTIMONIAL_2} alt="User" className="w-10 h-10 rounded-full border-2 border-[#101822]" />
                            <img src={IMAGES.TESTIMONIAL_3} alt="User" className="w-10 h-10 rounded-full border-2 border-[#101822]" />
                            <div className="w-10 h-10 rounded-full border-2 border-[#101822] bg-[#1a2432] flex items-center justify-center text-xs font-medium text-white">
                                +2k
                            </div>
                        </div>
                        <p>Assessores confiam na nossa plataforma.</p>
                    </div>
                </div>
            </div>

            {/* Right Side */}
            <div className="w-full md:w-1/2 lg:w-7/12 flex items-center justify-center p-6 md:p-12 overflow-y-auto bg-[#101822] text-white">
                <div className="w-full max-w-md space-y-8">
                    <div className="md:hidden flex items-center justify-center gap-2 mb-8">
                        <span className="text-xl font-bold tracking-tight text-white">LEADS Premium</span>
                    </div>
                    
                    <div className="text-center md:text-left">
                        <h2 className="text-3xl font-bold text-white">Cadastro de Novo Assessor</h2>
                        <p className="mt-2 text-sm text-gray-400">Preencha seus dados para iniciar seu trial de 14 dias.</p>
                    </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg mb-4">
                                {error}
                            </div>
                        )}
                        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Nome Completo</label>
                                <div className="relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className="text-gray-400" size={18} />
                                    </div>
                                    <input 
                                        type="text" 
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Ex: João Silva" 
                                        required
                                        className="block w-full pl-10 pr-3 py-3 border-gray-700 rounded-lg bg-[#1a2432] text-white placeholder-gray-400 focus:ring-2 focus:ring-[#136dec] focus:border-[#136dec] sm:text-sm transition-colors duration-200" 
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">E-mail Corporativo</label>
                                <div className="relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="text-gray-400" size={18} />
                                    </div>
                                    <input 
                                        type="email" 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="nome@empresa.com.br" 
                                        required
                                        className="block w-full pl-10 pr-3 py-3 border-gray-700 rounded-lg bg-[#1a2432] text-white placeholder-gray-400 focus:ring-2 focus:ring-[#136dec] focus:border-[#136dec] sm:text-sm transition-colors duration-200" 
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Nome do Escritório</label>
                                    <div className="relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Building className="text-gray-400" size={18} />
                                        </div>
                                        <input 
                                            type="text" 
                                            value={officeName}
                                            onChange={(e) => setOfficeName(e.target.value)}
                                            placeholder="XP Investimentos" 
                                            className="block w-full pl-10 pr-3 py-3 border-gray-700 rounded-lg bg-[#1a2432] text-white placeholder-gray-400 focus:ring-2 focus:ring-[#136dec] focus:border-[#136dec] sm:text-sm transition-colors duration-200" 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Cargo</label>
                                    <div className="relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Briefcase className="text-gray-400" size={18} />
                                        </div>
                                        <select 
                                            value={role}
                                            onChange={(e) => setRole(e.target.value)}
                                            className="block w-full pl-10 pr-10 py-3 border-gray-700 rounded-lg bg-[#1a2432] text-white focus:ring-2 focus:ring-[#136dec] focus:border-[#136dec] sm:text-sm appearance-none cursor-pointer"
                                        >
                                            <option value="Assessor">Assessor</option>
                                            <option value="Gestor">Gestor</option>
                                            <option value="Sócio">Sócio</option>
                                            <option value="Backoffice">Backoffice</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Senha</label>
                                <div className="relative rounded-md shadow-sm group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="text-gray-400 group-focus-within:text-[#136dec] transition-colors" size={18} />
                                    </div>
                                    <input 
                                        type="password" 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••" 
                                        required
                                        className="block w-full pl-10 pr-10 py-3 border-gray-700 rounded-lg bg-[#1a2432] text-white placeholder-gray-400 focus:ring-2 focus:ring-[#136dec] focus:border-[#136dec] sm:text-sm transition-colors duration-200" 
                                        minLength={6}
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer">
                                        <Eye className="text-gray-400 hover:text-gray-300" size={18} />
                                    </div>
                                </div>
                                <p className="mt-2 text-xs text-gray-500">Mínimo de 6 caracteres.</p>
                            </div>

                            <div className="flex items-start">
                                <div className="flex items-center h-5">
                                    <input id="terms" type="checkbox" required className="h-4 w-4 text-[#136dec] focus:ring-[#136dec] border-gray-600 rounded bg-[#1a2432]" />
                                </div>
                                <div className="ml-3 text-sm">
                                    <label htmlFor="terms" className="font-medium text-gray-300">
                                        Aceito os <a href="#" className="text-[#136dec] hover:text-blue-400 transition-colors">termos e condições</a> e a <a href="#" className="text-[#136dec] hover:text-blue-400 transition-colors">política de privacidade</a>.
                                    </label>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={loading}
                                className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-[#136dec] hover:bg-[#0e5bc4] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#136dec] focus:ring-offset-[#101822] transition-all duration-200 shadow-lg shadow-[#136dec]/25 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Rocket className="text-blue-200 group-hover:text-white transition-colors" size={18} />
                                </span>
                                {loading ? 'Criando Conta...' : 'Criar Minha Conta'}
                            </button>
                        </form>

                    <div className="text-center mt-6">
                        <p className="text-sm text-gray-400">
                            Já possui conta? <button onClick={() => onNavigate('login')} className="font-medium text-[#136dec] hover:text-blue-400 transition-colors">Faça login</button>
                        </p>
                    </div>

                    <div className="flex items-center justify-center gap-2 pt-6 border-t border-gray-800">
                        <Lock className="text-gray-400" size={12} />
                        <span className="text-xs text-gray-500">Seus dados estão protegidos com criptografia de ponta a ponta.</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
