import React, { useState, useEffect } from 'react';
import { 
    Settings, 
    Bell, 
    User, 
    Lock, 
    Layers, 
    Users, 
    HelpCircle, 
    Camera, 
    ChevronRight,
    IdCard,
    Pencil,
    Moon,
    Sun
} from 'lucide-react';
import { IMAGES } from '../constants';
import { supabase } from '../lib/supabase';

type SettingsTab = 'perfil' | 'notificacoes' | 'seguranca';

interface SettingsPageProps {
    user?: {
        name: string;
        email: string;
        role: string;
        avatar: string;
    };
    onUpdateUser?: (user: any) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ user, onUpdateUser }) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('perfil');
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(false);
    
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [role, setRole] = useState(user?.role || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [avatar, setAvatar] = useState(user?.avatar || IMAGES.AVATAR_USER);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setEmail(user.email || '');
            setRole(user.role || '');
            setPhone(user.phone || '');
            if (user.avatar) setAvatar(user.avatar);
        }
    }, [user]);

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window !== 'undefined') {
            return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        }
        return 'light';
    });

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
        } else {
            document.documentElement.classList.add('light');
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = (newTheme: 'light' | 'dark') => {
        setTheme(newTheme);
    };

    const [pendingFile, setPendingFile] = useState<File | null>(null);

    const handlePhotoClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validacao básica de tamanho (5MB) para o Storage
            if (file.size > 5 * 1024 * 1024) {
                alert('A imagem é muito grande (máx 5MB).');
                return;
            }
            
            setPendingFile(file);
            
            // Preview local
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatar(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        let finalAvatarUrl = avatar;
        
        try {
            // 1. Se houver um arquivo pendente, faz o upload para o Storage
            if (pendingFile) {
                const fileExt = pendingFile.name.split('.').pop();
                const fileName = `${user?.email || 'user'}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, pendingFile, {
                        cacheControl: '3600',
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                // Pegar a URL pública
                const { data: { publicUrl } } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(filePath);
                
                finalAvatarUrl = publicUrl;
            }

            // 2. Atualiza o metadata do usuário com a URL (curta/estável)
            const { error: authError } = await supabase.auth.updateUser({
                data: {
                    full_name: name,
                    role: role,
                    phone: phone,
                    avatar_url: finalAvatarUrl
                }
            });

            if (authError) throw authError;

            // 3. Atualiza estado local
            if (onUpdateUser && user) {
                onUpdateUser({
                    ...user,
                    name,
                    email,
                    role,
                    phone,
                    avatar: finalAvatarUrl
                });
            }
            
            setPendingFile(null);
            alert('Perfil atualizado com sucesso!');
        } catch (error: any) {
            console.error('Error updating profile:', error);
            alert('Erro ao atualizar perfil: ' + (error.message || 'Erro inesperado.'));
        } finally {
            setSaving(false);
        }
    };

    const sidebarItems = [
        { id: 'perfil', label: 'Perfil', icon: User },
        { id: 'notificacoes', label: 'Notificações', icon: Bell },
        { id: 'seguranca', label: 'Segurança', icon: Lock },
    ];

    return (
        <div className="flex flex-col h-full bg-[#F8FAFC] dark:bg-background-dark overflow-hidden font-sans">
            {/* Header */}
            <header className="h-16 bg-white dark:bg-surface-dark border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 shrink-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="bg-primary/10 p-1.5 rounded-lg text-primary">
                        <Settings size={20} />
                    </div>
                    <h1 className="font-bold text-lg text-slate-900 dark:text-white">Configurações</h1>
                </div>
                <div className="flex items-center gap-4">
                    <button className="p-2 text-slate-400 hover:text-primary transition-colors relative">
                        <Bell size={20} />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-surface-dark"></span>
                    </button>
                    <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-700">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{user?.name || 'Ana Silva'}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-medium">{user?.role === 'admin' ? 'Administrador' : 'Assessor'}</p>
                        </div>
                        <img 
                            src={user?.avatar || IMAGES.AVATAR_ANA} 
                            alt="User" 
                            className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-600 shadow-sm"
                        />
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Internal Sidebar */}
                <aside className="w-64 bg-white dark:bg-surface-dark border-r border-slate-200 dark:border-slate-700 flex flex-col shrink-0 hidden lg:flex">
                    <div className="p-6">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">Menu Principal</p>
                        <p className="text-xs text-slate-400">Portal Administrativo</p>
                    </div>
                    <nav className="flex-1 px-4 space-y-1">
                        {sidebarItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id as SettingsTab)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                                    activeTab === item.id
                                        ? 'bg-primary text-white shadow-lg shadow-primary/25'
                                        : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary'
                                }`}
                            >
                                <item.icon size={18} />
                                <span className="text-sm font-medium">{item.label}</span>
                            </button>
                        ))}
                    </nav>
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                        <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-primary transition-colors">
                            <HelpCircle size={18} />
                            <span className="text-sm font-medium">Central de Ajuda</span>
                        </button>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto">
                    <div className="p-8 max-w-5xl mx-auto space-y-8">
                        {activeTab === 'perfil' && (
                            <>
                                {/* Personal Info Card */}
                                <div className="bg-white dark:bg-surface-dark rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center gap-8">
                                    <div className="relative">
                                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-50 dark:border-slate-800 shadow-inner">
                                            <img 
                                                src={avatar || IMAGES.AVATAR_USER} 
                                                alt={name || "Ana Silva"} 
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = IMAGES.AVATAR_USER;
                                                }}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            className="hidden" 
                                            accept="image/*"
                                            onChange={handleFileChange}
                                        />
                                        <button 
                                            onClick={handlePhotoClick}
                                            className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg border-4 border-white dark:border-surface-dark hover:scale-110 transition-transform"
                                        >
                                            <Camera size={16} />
                                        </button>
                                    </div>
                                    <div className="flex-1 text-center md:text-left">
                                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Informações Pessoais</h2>
                                        <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie seus dados e preferências da conta corporativa</p>
                                    </div>
                                    <button 
                                        onClick={handlePhotoClick}
                                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <Pencil size={16} />
                                        Alterar Foto
                                    </button>
                                </div>

                                {/* Profile Data Section */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 text-primary">
                                        <IdCard size={20} />
                                        <h3 className="font-bold text-slate-900 dark:text-white">Dados do Perfil</h3>
                                    </div>
                                    <div className="bg-white dark:bg-surface-dark rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nome Completo</label>
                                            <input 
                                                type="text" 
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-background-dark text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Email Corporativo</label>
                                            <input 
                                                type="email" 
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-background-dark text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Cargo</label>
                                            <input 
                                                type="text" 
                                                value={role}
                                                onChange={(e) => setRole(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-background-dark text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Celular / WhatsApp</label>
                                            <input 
                                                type="text" 
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="(11) 99999-9999"
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-background-dark text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Appearance Section */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 text-primary">
                                        <Layers size={20} />
                                        <h3 className="font-bold text-slate-900 dark:text-white">Aparência do Sistema</h3>
                                    </div>
                                    <div className="bg-white dark:bg-surface-dark rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Escolha como você prefere visualizar a interface do LEADS Premium</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <button 
                                                onClick={() => toggleTheme('light')}
                                                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                                                    theme === 'light' 
                                                        ? 'border-primary bg-primary/5' 
                                                        : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-background-dark/50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${theme === 'light' ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                                        <Sun size={20} />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="font-bold text-slate-900 dark:text-white">Modo Claro</p>
                                                        <p className="text-xs text-slate-500">Ideal para ambientes iluminados</p>
                                                    </div>
                                                </div>
                                                {theme === 'light' && <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-white rounded-full"></div></div>}
                                            </button>

                                            <button 
                                                onClick={() => toggleTheme('dark')}
                                                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                                                    theme === 'dark' 
                                                        ? 'border-primary bg-primary/5' 
                                                        : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-background-dark/50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                                        <Moon size={20} />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="font-bold text-slate-900 dark:text-white">Modo Escuro</p>
                                                        <p className="text-xs text-slate-500">Reduz o cansaço visual à noite</p>
                                                    </div>
                                                </div>
                                                {theme === 'dark' && <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-white rounded-full"></div></div>}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Notification Preferences Section */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 text-primary">
                                        <Settings size={20} />
                                        <h3 className="font-bold text-slate-900 dark:text-white">Preferências de Notificação</h3>
                                    </div>
                                    <div className="bg-white dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
                                        <div className="p-8 flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white">Notificações por Email</p>
                                                <p className="text-sm text-slate-500">Receba atualizações importantes sobre seus projetos via email</p>
                                            </div>
                                            <button 
                                                onClick={() => setEmailNotifications(!emailNotifications)}
                                                className={`w-12 h-6 rounded-full transition-colors relative ${emailNotifications ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${emailNotifications ? 'left-7' : 'left-1'}`} />
                                            </button>
                                        </div>
                                        <div className="p-8 flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white">Push Notifications</p>
                                                <p className="text-sm text-slate-500">Alertas em tempo real no seu navegador ou aplicativo móvel</p>
                                            </div>
                                            <button 
                                                onClick={() => setPushNotifications(!pushNotifications)}
                                                className={`w-12 h-6 rounded-full transition-colors relative ${pushNotifications ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${pushNotifications ? 'left-7' : 'left-1'}`} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Actions */}
                                <div className="flex justify-end gap-4 pt-4">
                                    <button className="px-8 py-3 rounded-2xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                        Descartar Alterações
                                    </button>
                                    <button 
                                        onClick={handleSave}
                                        disabled={saving}
                                        className={`px-8 py-3 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/25 hover:bg-primary-dark transition-colors ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                                    </button>
                                </div>
                            </>
                        )}

                        {activeTab !== 'perfil' && (
                            <div className="bg-white dark:bg-surface-dark rounded-3xl p-12 border border-slate-200 dark:border-slate-700 shadow-sm text-center">
                                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Settings size={40} className="text-slate-400" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Conteúdo em Breve</h2>
                                <p className="text-slate-500 mt-2">A seção de {activeTab} está sendo preparada para você.</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};
