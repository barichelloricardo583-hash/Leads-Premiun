import React from 'react';
import { LayoutDashboard, Users, Calendar, UploadCloud, PieChart, Settings, LogOut } from 'lucide-react';
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
    
    const navItemClass = (view: AppView) => `
        flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group cursor-pointer
        ${currentView === view 
            ? 'bg-primary/10 text-primary dark:text-primary font-semibold' 
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary dark:hover:text-primary'
        }
    `;

    return (
        <aside className="w-64 bg-white dark:bg-surface-dark border-r border-slate-200 dark:border-slate-700 flex flex-col shrink-0 transition-colors duration-300 hidden md:flex">
            <div className="h-16 flex items-center px-6 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                    <div className="bg-primary p-1.5 rounded-lg">
                        <span className="material-icons-round text-white text-xl">waves</span>
                    </div>
                    <h1 className="font-display font-bold text-xl tracking-tight text-slate-900 dark:text-white">LEADS Premium</h1>
                </div>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                <div onClick={() => onChangeView('performance')} className={navItemClass('performance')}>
                    <LayoutDashboard size={20} />
                    <span className="text-sm">Dashboard</span>
                </div>
                <div onClick={() => onChangeView('leads')} className={navItemClass('leads')}>
                    <Users size={20} />
                    <span className="text-sm">Meus Leads</span>
                </div>
                <div onClick={() => onChangeView('meetings')} className={navItemClass('meetings')}>
                    <Calendar size={20} />
                    <span className="text-sm">Reuniões</span>
                </div>
                <div onClick={() => onChangeView('import')} className={navItemClass('import')}>
                    <UploadCloud size={20} />
                    <span className="text-sm">Importar Leads</span>
                </div>
                
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                    <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Relatórios</p>
                    <div 
                        onClick={() => onChangeView('analytics')}
                        className={navItemClass('analytics')}
                    >
                        <PieChart size={20} />
                        <span className="text-sm font-medium">Analytics</span>
                    </div>
                </div>

                <div className="pt-2">
                     <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Configurações</p>
                    <div 
                        onClick={() => onChangeView('settings')}
                        className={navItemClass('settings')}
                    >
                        <Settings size={20} />
                        <span className="text-sm font-medium">Configurações</span>
                    </div>
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
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.name || 'Lucas Mendes'}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.role === 'admin' ? 'Administrador' : 'Assessor Senior'}</p>
                    </div>
                    <button onClick={onLogout} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </aside>
    );
};
