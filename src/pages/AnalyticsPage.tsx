import React, { useState, useEffect, useMemo } from 'react';
import { Users, Phone, Calendar, Download, Plus, Search, Trophy, TrendingUp, TrendingDown, Clock, X, Loader2 } from 'lucide-react';
import { IMAGES } from '../constants';
import { supabase } from '../lib/supabase';

type Period = 'hoje' | '7d' | '30d' | 'mes' | 'anterior' | 'ano';

interface AnalyticsPageProps {
    user?: {
        id: string;
        role: string;
        email: string;
    };
}

interface TeamMember {
    id: string;
    name: string;
    avatar: string;
    calls: number;
    effective: number;
    conversion: number;
    avgDuration: string;
    meetings: number;
    color: string;
    totalSeconds: number;
}

const parseDurationToSeconds = (value: string) => {
    if (!value) return 0;
    const match = value.match(/(\d+)m\s*(\d+)s/i);
    if (!match) {
        const secs = parseInt(value);
        return isNaN(secs) ? 0 : secs;
    }
    const minutes = Number(match[1] || 0);
    const seconds = Number(match[2] || 0);
    return minutes * 60 + seconds;
};

const formatSecondsToDuration = (totalSeconds: number) => {
    if (!totalSeconds || totalSeconds < 0) return '0m 00s';
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
};

const randomColorClasses = ['bg-emerald-500', 'bg-teal-500', 'bg-stone-500', 'bg-slate-500', 'bg-indigo-500', 'bg-primary'];

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ user }) => {
    const [selectedPeriod, setSelectedPeriod] = useState<Period>('30d');
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddAssessorModalOpen, setIsAddAssessorModalOpen] = useState(false);
    const [newAssessor, setNewAssessor] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [teamData, setTeamData] = useState<TeamMember[]>([]);

    const isAdmin = user?.role === 'admin' || user?.email?.includes('admin');

    useEffect(() => {
        if (isAdmin) {
            fetchTeamPerformance();
        }
    }, [selectedPeriod, isAdmin]);

    const fetchTeamPerformance = async () => {
        setLoading(true);
        try {
            // 1. Get all profiles
            const { data: profiles, error: pError } = await supabase
                .from('profiles')
                .select('*');

            if (pError) throw pError;

            // 2. Define date range based on period
            const now = new Date();
            let startDate = new Date();

            if (selectedPeriod === 'hoje') {
                startDate.setHours(0, 0, 0, 0);
            } else if (selectedPeriod === '7d') {
                startDate.setDate(now.getDate() - 7);
            } else if (selectedPeriod === '30d') {
                startDate.setDate(now.getDate() - 30);
            } else if (selectedPeriod === 'mes') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            } else if (selectedPeriod === 'anterior') {
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
                now.setTime(endDate.getTime());
            } else if (selectedPeriod === 'ano') {
                startDate = new Date(now.getFullYear(), 0, 1);
            }

            const startIso = startDate.toISOString();
            const endIso = now.toISOString();

            // 3. Fetch interactions and meetings for the period
            const [interactionsResp, meetingsResp] = await Promise.all([
                supabase.from('lead_interactions').select('*').gte('created_at', startIso).lte('created_at', endIso),
                supabase.from('meetings').select('*').gte('created_at', startIso).lte('created_at', endIso)
            ]);

            if (interactionsResp.error) throw interactionsResp.error;
            if (meetingsResp.error) throw meetingsResp.error;

            const allInteractions = interactionsResp.data || [];
            const allMeetings = meetingsResp.data || [];

            // 4. Group data by user
            const performance = profiles.map((profile, index) => {
                const userInteractions = allInteractions.filter(i => i.user_id === profile.id);
                const userMeetings = allMeetings.filter(m => m.user_id === profile.id);

                const calls = userInteractions.length;
                const effective = userInteractions.filter(i => !['busy', 'no_answer', 'failed'].includes(i.result)).length;
                const meetingsCount = userMeetings.length;

                const totalSeconds = userInteractions.reduce((acc, curr) => acc + parseDurationToSeconds(curr.duration || '0'), 0);
                const avgSeconds = calls > 0 ? Math.round(totalSeconds / calls) : 0;

                const conversion = calls > 0 ? Number(((meetingsCount / calls) * 100).toFixed(1)) : 0;

                return {
                    id: profile.id,
                    name: profile.full_name || 'Usuário Sem Nome',
                    avatar: profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'U')}&background=0D8ABC&color=fff`,
                    calls,
                    effective,
                    conversion,
                    avgDuration: formatSecondsToDuration(avgSeconds),
                    meetings: meetingsCount,
                    color: randomColorClasses[index % randomColorClasses.length],
                    totalSeconds: avgSeconds
                };
            });

            setTeamData(performance);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredTeam = useMemo(() => {
        return teamData
            .filter(member => member.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => b.conversion - a.conversion);
    }, [teamData, searchTerm]);

    const kpis = useMemo(() => {
        const totalCalls = teamData.reduce((acc, m) => acc + m.calls, 0);
        const totalEffective = teamData.reduce((acc, m) => acc + m.effective, 0);
        const totalMeetings = teamData.reduce((acc, m) => acc + m.meetings, 0);
        const contactRate = totalCalls > 0 ? ((totalEffective / totalCalls) * 100).toFixed(1) : '0';

        return { totalCalls, contactRate, totalMeetings };
    }, [teamData]);

    const topRank = [...teamData].sort((a, b) => b.conversion - a.conversion).slice(0, 3);

    if (!isAdmin) {
        return (
            <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark text-slate-900 dark:text-white h-full font-display">
                <div className="max-w-2xl mx-auto mt-12 bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                    <h1 className="text-2xl font-bold mb-2">Acesso restrito</h1>
                    <p className="text-slate-500 dark:text-slate-400">Esta área de analytics de equipe está disponível apenas para administradores.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark text-slate-900 dark:text-white h-full font-display">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Gestão de Equipe</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Dados reais de performance baseados em interações e reuniões.</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center bg-white dark:bg-surface-dark p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                        {(['hoje', '7d', '30d', 'mes', 'anterior', 'ano'] as Period[]).map((p) => (
                            <button
                                key={p}
                                onClick={() => setSelectedPeriod(p)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${selectedPeriod === p
                                        ? 'bg-primary text-white shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                            >
                                {p === 'hoje' ? 'Hoje' : p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : p === 'mes' ? 'Este Mês' : p === 'anterior' ? 'Mês Anterior' : 'Este Ano'}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm">
                            <Download size={16} />
                            Exportar Relatório
                        </button>
                        {isAdmin && (
                            <button
                                onClick={() => setIsAddAssessorModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors shadow-sm"
                            >
                                <Plus size={16} />
                                Novo Assessor
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-surface-dark rounded-xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
                            <Phone size={24} />
                        </div>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Total da Equipe (Ligações)</p>
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
                        {loading ? <Loader2 className="animate-spin" /> : kpis.totalCalls}
                    </h3>
                </div>

                <div className="bg-white dark:bg-surface-dark rounded-xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-500">
                            <Users size={24} />
                        </div>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Taxa de Contato Média</p>
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
                        {loading ? <Loader2 className="animate-spin" /> : `${kpis.contactRate}%`}
                    </h3>
                </div>

                <div className="bg-white dark:bg-surface-dark rounded-xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-amber-500/10 rounded-lg text-amber-500">
                            <Calendar size={24} />
                        </div>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Total de Reuniões Marcadas</p>
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
                        {loading ? <Loader2 className="animate-spin" /> : kpis.totalMeetings}
                    </h3>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-8">
                {/* Performance Table */}
                <div className="xl:col-span-3 bg-white dark:bg-surface-dark rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Performance por Assessor</h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Filtrar assessores..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-64 transition-all"
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50">
                                    <th className="px-6 py-4">Assessor</th>
                                    <th className="px-6 py-4">Total Ligações</th>
                                    <th className="px-6 py-4">Contatos Efetivos</th>
                                    <th className="px-6 py-4">Conversão (Meet/Calls)</th>
                                    <th className="px-6 py-4">Duração Média</th>
                                    <th className="px-6 py-4">Reuniões</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">
                                            <Loader2 className="animate-spin inline mr-2" /> Carregando dados da equipe...
                                        </td>
                                    </tr>
                                ) : filteredTeam.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">
                                            Nenhum dado encontrado para este período.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTeam.map((member) => (
                                        <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <img src={member.avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
                                                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{member.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">{member.calls}</td>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">{member.effective}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-bold min-w-[45px] text-slate-900 dark:text-white">{member.conversion}%</span>
                                                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden max-w-[80px]">
                                                        <div className="h-full bg-primary" style={{ width: `${Math.min(member.conversion * 2, 100)}%` }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{member.avgDuration}</td>
                                            <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">{member.meetings}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Top Ranking */}
                <div className="xl:col-span-1 bg-white dark:bg-surface-dark rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Top 3 Assessores</h3>
                        <Trophy size={20} className="text-amber-500" />
                    </div>

                    <div className="space-y-4 flex-1">
                        {loading ? (
                            <div className="flex items-center justify-center py-10"><Loader2 className="animate-spin text-slate-300" /></div>
                        ) : topRank.length > 0 ? (
                            <>
                                {/* 1st Place */}
                                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-amber-500/30 relative">
                                    <div className="absolute -top-2 -right-2 bg-amber-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ring-4 ring-white dark:ring-surface-dark">1</div>
                                    <div className="flex flex-col items-center text-center">
                                        <div className="relative mb-3">
                                            <img src={topRank[0].avatar} className="w-16 h-16 rounded-full border-2 border-amber-500 p-0.5 object-cover" alt="" />
                                            <div className="absolute -bottom-1 -right-1 bg-amber-500 w-5 h-5 rounded-full flex items-center justify-center">
                                                <Trophy size={12} className="text-white" />
                                            </div>
                                        </div>
                                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{topRank[0].name}</h4>
                                        <p className="text-primary font-bold text-lg mt-1">{topRank[0].conversion}%</p>
                                        <p className="text-[10px] uppercase tracking-wider text-slate-500">Conversão</p>
                                    </div>
                                </div>

                                {/* 2nd & 3rd */}
                                <div className="space-y-3">
                                    {topRank.slice(1).map((member, idx) => (
                                        <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-3">
                                                <span className="text-slate-500 font-bold text-sm">{idx + 2}</span>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-900 dark:text-white">{member.name}</span>
                                                    <span className="text-[10px] text-slate-500">{member.conversion}% Conversão</span>
                                                </div>
                                            </div>
                                            <TrendingUp size={16} className="text-emerald-500" />
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <p className="text-xs text-slate-500 text-center py-10 italic">Nenhum dado para o ranking.</p>
                        )}
                    </div>

                    <button className="mt-6 w-full py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-primary hover:border-primary transition-all border-dashed">
                        Ver Ranking Completo
                    </button>
                </div>
            </div>

            {/* Best Time to Contact */}
            <div className="bg-white dark:bg-surface-dark rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-6">
                    <Clock size={20} className="text-primary" />
                    <h3 className="font-bold text-slate-900 dark:text-white">Melhor Horário para Contato</h3>
                </div>

                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">09:00 - 11:00</span>
                            <span className="text-sm font-bold text-emerald-500 dark:text-emerald-400">Alta Efetividade (72%)</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: '72%' }}></div>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">14:00 - 16:00</span>
                            <span className="text-sm font-bold text-amber-500 dark:text-amber-400">Média Efetividade (58%)</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500" style={{ width: '58%' }}></div>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">17:00 - 19:00</span>
                            <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Baixa Efetividade (31%)</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-slate-400 dark:bg-slate-600" style={{ width: '31%' }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Assessor Side Panel (Aba) */}
            {isAddAssessorModalOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsAddAssessorModalOpen(false)}></div>
                    <div className="absolute inset-y-0 right-0 max-w-full flex">
                        <div className="w-screen max-w-md transform transition-transform duration-300 ease-in-out">
                            <div className="h-full flex flex-col bg-white dark:bg-surface-dark shadow-2xl border-l border-slate-200 dark:border-slate-700">
                                <div className="px-6 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Novo Assessor</h3>
                                        <p className="text-xs text-slate-500 mt-1">Crie um novo acesso para sua equipe</p>
                                    </div>
                                    <button
                                        className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                                        onClick={() => setIsAddAssessorModalOpen(false)}
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Email Corporativo</label>
                                            <input
                                                type="email"
                                                value={newAssessor.email}
                                                onChange={(e) => setNewAssessor({ ...newAssessor, email: e.target.value })}
                                                placeholder="exemplo@empresa.com"
                                                className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-background-dark text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all py-3 px-4"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Senha Temporária</label>
                                            <input
                                                type="password"
                                                value={newAssessor.password}
                                                onChange={(e) => setNewAssessor({ ...newAssessor, password: e.target.value })}
                                                placeholder="••••••••"
                                                className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-background-dark text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all py-3 px-4"
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
                                        <p className="text-xs text-primary font-medium leading-relaxed">
                                            O novo assessor receberá um convite por email para completar o cadastro e definir sua senha definitiva.
                                        </p>
                                    </div>
                                </div>

                                <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                                    <button
                                        className="flex-1 px-6 py-3 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                        onClick={() => setIsAddAssessorModalOpen(false)}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        className="flex-[2] px-6 py-3 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary-dark shadow-lg shadow-primary/25 transition-all active:scale-[0.98]"
                                        onClick={() => {
                                            setIsAddAssessorModalOpen(false);
                                            setNewAssessor({ email: '', password: '' });
                                        }}
                                    >
                                        {saving ? <Loader2 className="animate-spin inline mr-2" /> : 'Criar Acesso'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
