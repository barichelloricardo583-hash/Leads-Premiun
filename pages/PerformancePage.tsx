import React, { useState, useEffect, useCallback } from 'react';
import { Phone, CheckCircle, UserPlus, Timer, MoreHorizontal, TrendingUp, Calendar, X, Info } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, XAxis, Tooltip, CartesianGrid, LabelList } from 'recharts';
import { AppView } from '../constants';
import { supabase } from '../lib/supabase';

type Period = 'hoje' | 'semana' | 'mes';

interface PerformancePageProps {
    onNavigateLeads?: (view: AppView, filter: string) => void;
}

export const PerformancePage: React.FC<PerformancePageProps> = ({ onNavigateLeads }) => {
    const [selectedPeriod, setSelectedPeriod] = useState<Period>('hoje');
    const [showDistributionDetails, setShowDistributionDetails] = useState(false);
    const [loading, setLoading] = useState(true);

    const [kpiData, setKpiData] = useState({
        calls: 0,
        callsTrend: '0%',
        successRate: '0%',
        successWidth: '0%',
        leads: 0,
        leadsTrend: '0',
        avgTime: '0m 0s',
        timeTrend: '0s',
        timeTrendColor: 'text-slate-500',
        timeTrendBg: 'bg-slate-50',
        timeTrendIcon: <TrendingUp size={12} className="mr-1" />,
        barData: [] as any[],
        pieData: [] as any[]
    });

    const [recentInteractions, setRecentInteractions] = useState<any[]>([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const now = new Date();
            let startDate = new Date();

            if (selectedPeriod === 'hoje') {
                startDate.setHours(0, 0, 0, 0);
            } else if (selectedPeriod === 'semana') {
                startDate.setDate(now.getDate() - 7);
            } else if (selectedPeriod === 'mes') {
                startDate.setMonth(now.getMonth() - 1);
            }

            // 1. Fetch Interactions
            const { data: interactions, error: intError } = await supabase
                .from('lead_interactions')
                .select('*, leads(name, status)')
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: false });

            if (intError) throw intError;

            // 2. Fetch Interested Leads (interest OR contacted)
            const { count: qualifiedCount, error: leadError } = await supabase
                .from('leads')
                .select('*', { count: 'exact', head: true })
                .or('status.eq.interest,status.eq.contacted');

            if (leadError) throw leadError;

            // 3. Process data for charts and KPIs
            const totalCalls = interactions?.length || 0;
            const positiveInteractions = interactions?.filter(i =>
                i.result === 'interest' || i.result === 'appointment_confirmed'
            ).length || 0;

            const successRate = totalCalls > 0 ? (positiveInteractions / totalCalls) * 100 : 0;

            // Bar Data - Last 7 days in chronological order
            const dayOrder = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
            const barMap: Record<string, { calls: number; dayIndex: number }> = {};
            interactions?.forEach(i => {
                const d = new Date(i.created_at);
                const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
                const dayIndex = d.getDay(); // 0=dom, 1=seg...
                if (!barMap[dayName]) barMap[dayName] = { calls: 0, dayIndex };
                barMap[dayName].calls += 1;
            });
            const barData = Object.entries(barMap)
                .sort((a, b) => a[1].dayIndex - b[1].dayIndex)
                .map(([name, val]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), calls: val.calls }));
            void dayOrder;

            // Pie Data
            const pieMap: Record<string, number> = {};
            interactions?.forEach(i => {
                const label = i.result === 'interest' ? 'Interesse' :
                    i.result === 'no_interest' ? 'Sem Interesse' :
                        i.result === 'appointment_confirmed' ? 'Agendado' :
                            i.result === 'callback' ? 'Retorno' :
                                i.result === 'busy' ? 'Ocupado' : 'Outros';
                pieMap[label] = (pieMap[label] || 0) + 1;
            });

            const COLORS = ['#136dec', '#94a3b8', '#e2e8f0', '#F59E0B', '#EF4444', '#10B981'];
            const pieData = Object.entries(pieMap).map(([name, val], idx) => ({
                name,
                value: Math.round((val / totalCalls) * 100),
                color: COLORS[idx % COLORS.length]
            }));

            // Calculate average duration from interactions
            const parseDurationToSeconds = (dur: string | null | undefined): number => {
                if (!dur) return 0;
                // Format: "2m 30s" or "150" (seconds) or "2:30"
                const mMatch = dur.match(/(\d+)m/);
                const sMatch = dur.match(/(\d+)s/);
                if (mMatch || sMatch) {
                    return (parseInt(mMatch?.[1] || '0') * 60) + parseInt(sMatch?.[1] || '0');
                }
                const colonMatch = dur.match(/^(\d+):(\d+)$/);
                if (colonMatch) {
                    return parseInt(colonMatch[1]) * 60 + parseInt(colonMatch[2]);
                }
                const num = parseInt(dur);
                return isNaN(num) ? 0 : num;
            };

            const durationsInSecs = interactions
                ?.map(i => parseDurationToSeconds(i.duration))
                .filter(d => d > 0) || [];

            const avgSecs = durationsInSecs.length > 0
                ? Math.round(durationsInSecs.reduce((a, b) => a + b, 0) / durationsInSecs.length)
                : 0;

            const avgTimeStr = avgSecs > 0
                ? `${Math.floor(avgSecs / 60)}m ${avgSecs % 60}s`
                : '—';

            setKpiData({
                calls: totalCalls,
                callsTrend: '+100% novo', // Simplified trend
                successRate: `${successRate.toFixed(1)}%`,
                successWidth: `${successRate}%`,
                leads: qualifiedCount || 0,
                leadsTrend: '+0',
                avgTime: avgTimeStr,
                timeTrend: avgSecs > 0 ? `${avgSecs}s total` : 'Sem dados',
                timeTrendColor: avgSecs > 0 ? 'text-blue-600' : 'text-slate-500',
                timeTrendBg: avgSecs > 0 ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-slate-50 dark:bg-slate-900/30',
                timeTrendIcon: <TrendingUp size={12} className="mr-1" />,
                barData: barData.length > 0 ? barData : [{ name: 'N/A', calls: 0 }],
                pieData: pieData.length > 0 ? pieData : [{ name: 'Sem dados', value: 100, color: '#e2e8f0' }]
            });

            setRecentInteractions(interactions?.slice(0, 5) || []);

        } catch (err) {
            console.error('Dashboard error:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedPeriod]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const data = kpiData;

    return (
        <div className="flex-1 overflow-y-auto p-8 bg-background-light dark:bg-background-dark h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Meu Desempenho</h1>
                </div>
                <div className="flex items-center gap-2 bg-white dark:bg-surface-dark p-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                    <button
                        onClick={() => setSelectedPeriod('hoje')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${selectedPeriod === 'hoje' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                        Hoje
                    </button>
                    <button
                        onClick={() => setSelectedPeriod('semana')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${selectedPeriod === 'semana' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                        Semana
                    </button>
                    <button
                        onClick={() => setSelectedPeriod('mes')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${selectedPeriod === 'mes' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                        Mês
                    </button>
                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                    <button className="px-2 py-1.5 text-slate-500 hover:text-primary transition-colors">
                        <Calendar size={18} />
                    </button>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Calls */}
                <div
                    onClick={() => onNavigateLeads?.('leads', 'hoje')}
                    className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 flex flex-col justify-between hover:translate-y-[-2px] transition-transform duration-300 cursor-pointer group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors">Total de Ligações</span>
                        <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-all">
                            <Phone size={20} />
                        </div>
                    </div>
                    <div>
                        <span className="text-3xl font-bold text-slate-900 dark:text-white">{data.calls}</span>
                        <div className="flex items-center mt-1 text-green-600 text-xs font-medium bg-green-50 dark:bg-green-900/30 w-fit px-1.5 py-0.5 rounded">
                            <TrendingUp size={12} className="mr-1" />
                            {data.callsTrend}
                        </div>
                    </div>
                </div>

                {/* Success Rate */}
                <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 flex flex-col justify-between hover:translate-y-[-2px] transition-transform duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Taxa de Sucesso</span>
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <CheckCircle size={20} />
                        </div>
                    </div>
                    <div>
                        <span className="text-3xl font-bold text-slate-900 dark:text-white">{data.successRate}</span>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
                            <div className="bg-primary h-1.5 rounded-full" style={{ width: data.successWidth }}></div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Meta: 15%</p>
                    </div>
                </div>

                {/* Interested Leads */}
                <div
                    onClick={() => onNavigateLeads?.('leads', 'interest')}
                    className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 flex flex-col justify-between hover:translate-y-[-2px] transition-transform duration-300 cursor-pointer group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors">Leads Interessados</span>
                        <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-all">
                            <UserPlus size={20} />
                        </div>
                    </div>
                    <div>
                        <span className="text-3xl font-bold text-slate-900 dark:text-white">{data.leads}</span>
                        <div className="flex items-center mt-1 text-green-600 text-xs font-medium bg-green-50 dark:bg-green-900/30 w-fit px-1.5 py-0.5 rounded">
                            <TrendingUp size={12} className="mr-1" />
                            {data.leadsTrend}
                        </div>
                    </div>
                </div>

                {/* Avg Time */}
                <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 flex flex-col justify-between hover:translate-y-[-2px] transition-transform duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Tempo Médio</span>
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Timer size={20} />
                        </div>
                    </div>
                    <div>
                        <span className="text-3xl font-bold text-slate-900 dark:text-white">{data.avgTime}</span>
                        <div className={`flex items-center mt-1 ${data.timeTrendColor} text-xs font-medium ${data.timeTrendBg} w-fit px-1.5 py-0.5 rounded`}>
                            {data.timeTrendIcon}
                            {data.timeTrend}
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Bar Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Ligações por Dia</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Volume de chamadas nos últimos 7 dias</p>
                        </div>
                        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                            <MoreHorizontal size={20} />
                        </button>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.barData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="calls" fill="#136dec" radius={[4, 4, 0, 0]} barSize={40}>
                                    <LabelList dataKey="calls" position="top" style={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} offset={10} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Donut Chart */}
                <div className="lg:col-span-1 bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Distribuição</h3>
                        <button
                            onClick={() => setShowDistributionDetails(true)}
                            className="text-xs text-primary font-medium hover:underline"
                        >
                            Ver Detalhes
                        </button>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center relative min-h-[200px]">
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={data.pieData}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={0}
                                    dataKey="value"
                                >
                                    {data.pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-bold text-slate-900 dark:text-white">{data.calls}</span>
                            <span className="text-xs text-slate-500 uppercase tracking-wide">Total</span>
                        </div>
                    </div>
                    <div className="mt-6 space-y-3">
                        {data.pieData.map((item, index) => (
                            <div key={index} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                    <span className="text-sm text-slate-600 dark:text-slate-300">{item.name}</span>
                                </div>
                                <span className="text-sm font-semibold text-slate-800 dark:text-white">{item.value}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="mt-8 bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Últimas Interações</h3>
                    <button
                        onClick={() => onNavigateLeads?.('leads', 'atendidos')}
                        className="text-sm text-primary font-medium hover:underline"
                    >
                        Ver todas
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-3">Lead</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Duração</th>
                                <th className="px-6 py-3">Resultado</th>
                                <th className="px-6 py-3 text-right">Horário</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic">
                                        Carregando interações...
                                    </td>
                                </tr>
                            ) : recentInteractions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic">
                                        Nenhuma interação registrada neste período.
                                    </td>
                                </tr>
                            ) : recentInteractions.map((inter: any) => (
                                <tr key={inter.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                        {inter.leads?.name || 'Lead s/ nome'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded ${inter.leads?.status === 'converted' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                            }`}>
                                            {inter.leads?.status || 'Prospecção'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">{inter.duration || '0m'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`flex items-center gap-1 font-medium ${inter.result === 'interest' || inter.result === 'appointment_confirmed' ? 'text-green-600' : 'text-slate-500'
                                            }`}>
                                            {inter.result === 'interest' ? <CheckCircle size={14} /> : <Phone size={14} />}
                                            {inter.result === 'interest' ? 'Interesse' :
                                                inter.result === 'appointment_confirmed' ? 'Agendado' :
                                                    inter.result === 'no_interest' ? 'Sem Interesse' : 'Contatado'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-500">
                                        {new Date(inter.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Distribution Details Modal */}
            {showDistributionDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowDistributionDetails(false)}></div>
                    <div className="relative bg-white dark:bg-surface-dark rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700 animate-fade-in-up">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Info size={20} className="text-primary" />
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Detalhes da Distribuição</h3>
                            </div>
                            <button
                                onClick={() => setShowDistributionDetails(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-3 gap-4">
                                {data.pieData.map((item, index) => (
                                    <div key={index} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <p className="text-xs text-slate-500 mb-1">{item.name}</p>
                                        <p className="text-xl font-bold text-slate-900 dark:text-white">{Math.round((item.value / 100) * data.calls)}</p>
                                        <p className="text-[10px] font-medium text-slate-400 mt-1">{item.value}% do total</p>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Análise Comparativa</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600 dark:text-slate-400">Taxa de Atendimento</span>
                                        <span className="font-semibold text-emerald-500">+4.2% vs semana anterior</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600 dark:text-slate-400">Incidência de Caixa Postal</span>
                                        <span className="font-semibold text-rose-500">+1.5% vs semana anterior</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600 dark:text-slate-400">Leads sem Resposta</span>
                                        <span className="font-semibold text-emerald-500">-2.8% vs semana anterior</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                    <span className="font-bold text-primary">Insight:</span> A maior parte das chamadas sem resposta ocorre entre 17h e 19h. Recomendamos priorizar as ligações no período da manhã para aumentar a taxa de conexão.
                                </p>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                            <button
                                onClick={() => setShowDistributionDetails(false)}
                                className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
