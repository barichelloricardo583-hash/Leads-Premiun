import React from 'react';
import { LayoutDashboard, Users, Calendar, UploadCloud, PieChart, Settings, LogOut, Activity } from 'lucide-react';
import { AppView, IMAGES } from '../constants';

interface SidebarProps {
    user?: {
        name: string;
        role: string;
        avatar: string;
    };
    currentView: AppView;
    onChangeView: (view: AppView) => void;
    onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, currentView, onChangeView, onLogout }) => {

    const roleLabel: Record<string, string> = {
        admin: 'Administrador',
        advisor: 'Assessor',
        senior_advisor: 'Assessor Senior'
    };

    const navItems = [
        { id: 'performance', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'leads', label: 'Meus Leads', icon: Users },
        { id: 'meetings', label: 'Reuniões', icon: Calendar },
        { id: 'import', label: 'Importar Leads', icon: UploadCloud },
    ];

    const reportItems = [
        { id: 'analytics', label: 'Analytics', icon: PieChart },
    ];

    const configItems = [
        { id: 'settings', label: 'Configurações', icon: Settings },
    ];

    const navItemClass = (view: AppView) => `
        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group cursor-pointer
        ${currentView === view
            ? 'bg-primary/10 text-primary dark:text-primary font-semibold'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary dark:hover:text-primary'
        }
    `;

    return (
        <aside className="w-64 bg-white dark:bg-surface-dark border-r border-slate-200 dark:border-slate-700 flex flex-col shrink-0 transition-colors duration-300 hidden md:flex">
            <div className="h-16 flex items-center px-6 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                    <div className="bg-primary p-1.5 rounded-lg flex items-center justify-center">
                        <Activity className="text-white" size={20} />
                    </div>
                    <h1 className="font-display font-bold text-xl tracking-tight text-slate-900 dark:text-white">LEADS Premium</h1>
                </div>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => onChangeView(item.id as AppView)}
                        className={navItemClass(item.id as AppView)}
                    >
                        <item.icon size={20} />
                        <span className="text-sm">{item.label}</span>
                    </button>
                ))}

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                    <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Relatórios</p>
                    {reportItems.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => onChangeView(item.id as AppView)}
                            className={navItemClass(item.id as AppView)}
                        >
                            <item.icon size={20} />
                            <span className="text-sm font-medium">{item.label}</span>
                        </button>
                    ))}
                </div>

                <div className="pt-2">
                    <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Configurações</p>
                    {configItems.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => onChangeView(item.id as AppView)}
                            className={navItemClass(item.id as AppView)}
                        >
                            <item.icon size={20} />
                            <span className="text-sm font-medium">{item.label}</span>
                        </button>
                    ))}
                </div>
            </nav>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <img
                            src={user?.avatar || IMAGES.AVATAR_USER}
                            alt="Advisor Avatar"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = IMAGES.AVATAR_USER;
                            }}
                            className="h-10 w-10 rounded-full object-cover border-2 border-white dark:border-slate-600 shadow-sm"
                        />
                        <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white dark:ring-slate-800"></span>
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.name || 'Usuário'}</p>
                        <p className="text-xs text-slate-500 truncate">{roleLabel[user?.role || ''] || 'Assessor'}</p>
                    </div>
                    <button onClick={onLogout} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </aside>
    );
};
