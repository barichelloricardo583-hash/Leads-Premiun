import React, { useState, useEffect, useCallback } from 'react';
import { Search, Bell, MapPin, Phone, AlertTriangle, CheckCircle, Lock, Calendar, Save, X, Timer, RefreshCcw, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Lead, User } from '../types';
import { getStateFromPhone } from '../utils/phoneUtils';
import { LeadInteractionForm } from '../components/LeadInteractionForm';

interface LeadsPageProps {
    initialFilter?: string;
    user: User;
}

export const LeadsPage: React.FC<LeadsPageProps> = ({ initialFilter, user }) => {
    const [selectedLeadId, setSelectedLeadId] = useState('');
    const [filter, setFilter] = useState<'todos' | 'novos' | 'retornos' | 'nao-atendidos' | 'nao-ligados' | 'hoje' | 'atendidos' | 'interest'>((initialFilter as any) || 'todos');
    const [searchTerm, setSearchTerm] = useState('');

    // Supabase State
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Advanced filters
    const [selectedState, setSelectedState] = useState('');
    const [selectedCampaign, setSelectedCampaign] = useState('');
    const [selectedEquity, setSelectedEquity] = useState('');

    useEffect(() => {
        if (initialFilter) {
            setFilter(initialFilter as any);
        }
    }, [initialFilter]);

    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setLoading(false);
                return;
            }

            let { data, error } = await supabase
                .from('leads')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            // Fetch interaction data per lead
            const { data: interactions } = await supabase
                .from('lead_interactions')
                .select('lead_id, result')
                .eq('user_id', user.id);

            // Build maps for total calls and successful answers
            const interactionCount: Record<string, number> = {};
            const hasSuccessfulAnswer: Record<string, boolean> = {};

            interactions?.forEach((i: any) => {
                interactionCount[i.lead_id] = (interactionCount[i.lead_id] || 0) + 1;
                
                // Define successful answer results
                const isAnswer = ['interest', 'no_interest', 'callback', 'appointment_confirmed'].includes(i.result);
                if (isAnswer) {
                    hasSuccessfulAnswer[i.lead_id] = true;
                }
            });

            if (error) {
                const msg = error.message === 'TypeError: Failed to fetch'
                    ? 'Erro de rede. Verifique seu Ad-blocker.'
                    : error.message;
                console.error('Fetch error:', error);
            } else {
                const formattedLeads = (data || []).map((l: any) => ({
                    id: l.id,
                    initials: (l.name || 'L').substring(0, 2).toUpperCase(),
                    name: l.name,
                    location: l.company || 'Não informado',
                    calls: interactionCount[l.id] || 0,
                    phone: l.phone || 'S/N',
                    equity: l.value ? `R$ ${parseFloat(l.value).toLocaleString('pt-BR')}` : 'R$ 0',
                    status: l.status || 'new',
                    last_interaction_at: l.last_interaction_at,
                    has_answer: hasSuccessfulAnswer[l.id] || false,
                    type: l.status === 'new' ? 'novos' : l.status,
                    color: l.status === 'new' ? 'indigo' : 'slate'
                }));
                setLeads(formattedLeads);
            }
        } catch (err) {
            console.error('Unexpected error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    // Leads fetch is now dynamic


    const states = Array.from(new Set(leads.map(l => getStateFromPhone(l.phone)).filter(Boolean))).sort();
    const campaigns = Array.from(new Set(leads.map(l => l.location).filter(l => l && l !== 'Não informado'))).sort();
    const equities = Array.from(new Set(leads.map(l => l.equity))).sort();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filteredLeads = leads.filter(lead => {
        let matchesFilter = true;

        if (filter === 'todos') {
            matchesFilter = true;
        } else if (filter === 'novos') {
            matchesFilter = lead.status === 'new';
        } else if (filter === 'hoje') {
            // Leads que tiveram interação hoje
            const lastInt = lead.last_interaction_at ? new Date(lead.last_interaction_at) : null;
            matchesFilter = lastInt !== null && lastInt >= today;
        } else if (filter === 'retornos') {
            // Leads já contatados mais de uma vez
            matchesFilter = lead.calls > 1;
        } else if (filter === 'nao-atendidos') {
            // Leads que foram chamados mas não atenderam (checkbox transformado em botão)
            matchesFilter = lead.calls > 0 && !lead.has_answer;
        } else if (filter === 'nao-ligados') {
            // Leads novos sem nenhuma interação ou status 'new' com calls = 0
            matchesFilter = lead.status === 'new' && lead.calls === 0;
        } else if (filter === 'atendidos') {
            // Leads que de fato atenderam (tiveram uma conversa)
            matchesFilter = lead.has_answer;
        } else if (filter === 'interest') {
            matchesFilter = lead.status === 'interest' || lead.status === 'contacted';
        } else if (filter === 'appointment_confirmed') {
            matchesFilter = lead.status === 'appointment_confirmed';
        } else {
            matchesFilter = lead.type === filter || lead.status === filter;
        }

        // Advanced filters
        const leadState = getStateFromPhone(lead.phone);
        const matchesState = !selectedState || leadState === selectedState;
        const matchesCampaign = !selectedCampaign || lead.location === selectedCampaign;
        const matchesEquity = !selectedEquity || lead.equity === selectedEquity;

        const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.phone.includes(searchTerm) ||
            lead.location.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesFilter && matchesState && matchesCampaign && matchesEquity && matchesSearch;
    });

    const getColorClasses = (color: string) => {
        const map: any = {
            indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
            emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
            orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
            slate: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
        };
        return map[color] || map.slate;
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
            {/* Top Bar */}
            <header className="h-16 flex items-center justify-between px-8 bg-white dark:bg-surface-dark border-b border-slate-200 dark:border-slate-700 shrink-0">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Fila de Prospecção</h2>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar lead..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary w-64 transition-all outline-none"
                        />
                    </div>
                    <button
                        onClick={fetchLeads}
                        disabled={loading}
                        className={`p-2 text-slate-400 hover:text-primary transition-colors ${loading ? 'animate-spin' : ''}`}
                        title="Atualizar lista"
                    >
                        <RefreshCcw size={20} />
                    </button>
                    <button className="relative p-2 text-slate-400 hover:text-primary transition-colors">
                        <Bell size={20} />
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500"></span>
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Lead List */}
                <div className="flex-1 overflow-y-auto p-6 bg-background-light dark:bg-background-dark">
                    <div className="flex flex-col gap-4 mb-6">
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            <button
                                onClick={() => setFilter('todos')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all whitespace-nowrap ${filter === 'todos' ? 'bg-primary text-white shadow-sm shadow-primary/30' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => setFilter('novos')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all whitespace-nowrap ${filter === 'novos' ? 'bg-primary text-white shadow-sm shadow-primary/30' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                            >
                                Novos
                            </button>
                            <button
                                onClick={() => setFilter('nao-ligados')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all whitespace-nowrap ${filter === 'nao-ligados' ? 'bg-primary text-white shadow-sm shadow-primary/30' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                            >
                                Não Ligados
                            </button>
                            <button
                                onClick={() => setFilter('nao-atendidos')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all whitespace-nowrap ${filter === 'nao-atendidos' ? 'bg-primary text-white shadow-sm shadow-primary/30' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                            >
                                Ligados/Não Atendidos
                            </button>
                            <button
                                onClick={() => setFilter('atendidos')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all whitespace-nowrap ${filter === 'atendidos' ? 'bg-primary text-white shadow-sm shadow-primary/30' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                            >
                                Atendidos
                            </button>
                            <button
                                onClick={() => setFilter('interest')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all whitespace-nowrap ${filter === 'interest' ? 'bg-primary text-white shadow-sm shadow-primary/30' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                            >
                                Interessados
                            </button>
                            <button
                                onClick={() => setFilter('retornos')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all whitespace-nowrap ${filter === 'retornos' ? 'bg-primary text-white shadow-sm shadow-primary/30' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                            >
                                Retorno
                            </button>
                            <button
                                onClick={() => setFilter('hoje')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all whitespace-nowrap ${filter === 'hoje' ? 'bg-primary text-white shadow-sm shadow-primary/30' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                            >
                                Ligados Hoje
                            </button>
                        </div>

                        {/* Advanced Filters Row */}
                        <div className="flex flex-wrap items-center gap-3 p-3 bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filtros:</span>
                            </div>
                            <select
                                value={selectedState}
                                onChange={(e) => setSelectedState(e.target.value)}
                                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary"
                            >
                                <option value="">Estado</option>
                                {states.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select
                                value={selectedCampaign}
                                onChange={(e) => setSelectedCampaign(e.target.value)}
                                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary"
                            >
                                <option value="">Origem/Campanha</option>
                                {campaigns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <select
                                value={selectedEquity}
                                onChange={(e) => setSelectedEquity(e.target.value)}
                                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary"
                            >
                                <option value="">Patrimônio</option>
                                {equities.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                            </select>
                            {(selectedState || selectedCampaign || selectedEquity) && (
                                <button
                                    onClick={() => {
                                        setSelectedState('');
                                        setSelectedCampaign('');
                                        setSelectedEquity('');
                                    }}
                                    className="text-xs text-red-500 font-medium hover:underline ml-auto"
                                >
                                    Limpar
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-surface-dark rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="text-slate-500 dark:text-slate-400 font-medium">Carregando seus leads...</p>
                            </div>
                        ) : filteredLeads.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-surface-dark rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                    <Users className="text-slate-400" size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Nenhum lead encontrado</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs text-center mt-2">
                                    Use o botão "Importar" para adicionar sua base de contatos.
                                </p>
                            </div>
                        ) : (
                            filteredLeads.map(lead => (
                                <div
                                    key={lead.id}
                                    onClick={() => setSelectedLeadId(lead.id)}
                                    className={`group relative bg-white dark:bg-surface-dark rounded-xl p-5 border-2 shadow-sm transition-all hover:shadow-md cursor-pointer ${selectedLeadId === lead.id ? 'border-primary' : 'border-transparent hover:border-primary/50'}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg ${getColorClasses(lead.color)}`}>
                                                {lead.initials}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900 dark:text-white text-lg">{lead.name}</h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                                    <MapPin size={12} /> {lead.location}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            {lead.status === 'warning' && (
                                                <span className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold px-2.5 py-1 rounded-md border border-red-100 dark:border-red-900/30 flex items-center gap-1">
                                                    <AlertTriangle size={12} /> {lead.calls} ligações
                                                </span>
                                            )}
                                            {lead.status === 'normal' && (
                                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-medium px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                                                    {lead.calls} ligações
                                                </span>
                                            )}
                                            {lead.status === 'converted' && (
                                                <span className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-bold px-2.5 py-1 rounded-md border border-green-100 dark:border-green-900/30 flex items-center gap-1">
                                                    <CheckCircle size={12} /> Convertido
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                                        <div className="grid grid-cols-2 gap-8">
                                            <div>
                                                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Telefone</p>
                                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{lead.phone}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Patrimônio Est.</p>
                                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{lead.equity}</p>
                                            </div>
                                        </div>
                                        {lead.status === 'converted' ? (
                                            <button disabled className="flex items-center gap-2 bg-slate-100 text-slate-400 px-5 py-2.5 rounded-lg font-medium cursor-not-allowed">
                                                <Lock size={16} /> Ligar
                                            </button>
                                        ) : (
                                            <button className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors ${selectedLeadId === lead.id ? 'bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/20' : 'bg-primary/10 hover:bg-primary hover:text-white text-primary'}`}>
                                                <Phone size={16} /> Ligar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Panel: Interaction Form */}
                {selectedLeadId && (
                    <LeadInteractionForm
                        lead={leads.find(l => l.id === selectedLeadId)}
                        onClose={() => setSelectedLeadId('')}
                        onSaveSuccess={fetchLeads}
                        user={user}
                    />
                )}
            </div>
        </div>
    );
};
