import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Plus, Calendar, CheckCircle, Clock, RefreshCw, MoreVertical, X, Edit2, RotateCcw, Trash2, Loader2 } from 'lucide-react';
import { IMAGES } from '../constants';
import { supabase } from '../lib/supabase';
import { Lead, User } from '../types';

interface Meeting {
    id: string;
    date: string;
    time: string;
    lead_name: string;
    lead_company: string;
    status: string;
    link_url: string;
    link_type: string;
    lead_id?: string;
    description?: string;
    result_notes?: string;
    actual_outcome?: string;
    google_event_id?: string;
}

interface MeetingsPageProps {
    user: User;
}

export const MeetingsPage: React.FC<MeetingsPageProps> = ({ user }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
    const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
    const [timeFilter, setTimeFilter] = useState<'hoje' | 'semana' | 'todas'>('todas');
    const [openMenuIdx, setOpenMenuIdx] = useState<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuIdx(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    
    // Form state
    const [selectedLeadId, setSelectedLeadId] = useState('');
    const [newDate, setNewDate] = useState('');
    const [newTime, setNewTime] = useState('');
    const [linkType, setLinkType] = useState('google');
    const [customLink, setCustomLink] = useState('');
    const [description, setDescription] = useState('');

    // Finalize state
    const [finishOutcome, setFinishOutcome] = useState('Realizada');
    const [finishNotes, setFinishNotes] = useState('');

    // Edit Link State
    const [isEditLinkModalOpen, setIsEditLinkModalOpen] = useState(false);
    const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
    const [editLinkType, setEditLinkType] = useState<'google' | 'zoom' | 'manual'>('google');
    const [editCustomLink, setEditCustomLink] = useState('');

    // Google OAuth State
    const [tokenClient, setTokenClient] = useState<any>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);

    useEffect(() => {
        // Load Google API scripts
        const script1 = document.createElement('script');
        script1.src = "https://accounts.google.com/gsi/client";
        script1.async = true;
        script1.defer = true;
        document.body.appendChild(script1);

        const script2 = document.createElement('script');
        script2.src = "https://apis.google.com/js/api.js";
        script2.async = true;
        script2.defer = true;
        document.body.appendChild(script2);

        script1.onload = () => {
            const client = (window as any).google.accounts.oauth2.initTokenClient({
                client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/calendar.events',
                callback: (tokenResponse: any) => {
                    if (tokenResponse.error !== undefined) {
                      throw (tokenResponse);
                    }
                    setAccessToken(tokenResponse.access_token);
                },
            });
            setTokenClient(client);
        };

        return () => {
            document.body.removeChild(script1);
            document.body.removeChild(script2);
        };
    }, []);

    const requestPermission = () => {
        if (tokenClient) {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        }
    };

    const syncToGoogle = async (meeting: Meeting) => {
        if (!accessToken) {
            requestPermission();
            return null; // Return null if needing permission first
        }

        const event = {
            'summary': `Reunião: ${meeting.lead_name}`,
            'description': meeting.description || 'Pauta da reunião agendada via CRM.',
            'start': {
                'dateTime': `${meeting.date}T${meeting.time}`,
                'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            'end': {
                'dateTime': `${meeting.date}T${(parseInt(meeting.time.split(':')[0]) + 1).toString().padStart(2, '0')}:${meeting.time.split(':')[1]}:00`,
                'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            'location': meeting.link_url
        };

        try {
            const method = meeting.google_event_id ? 'PATCH' : 'POST';
            const url = meeting.google_event_id 
                ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${meeting.google_event_id}`
                : 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(event)
            });

            const data = await response.json();
            if (data.id) {
                // Update meetinig with event id
                await supabase
                    .from('meetings')
                    .update({ google_event_id: data.id })
                    .eq('id', meeting.id);
                return data.id;
            }
        } catch (error) {
            console.error('Error syncing to Google:', error);
        }
        return null;
    };

    const deleteFromGoogle = async (googleEventId: string) => {
        if (!accessToken) return;
        try {
            await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
        } catch (error) {
            console.error('Error deleting from Google:', error);
        }
    };

    useEffect(() => {
        loadPageData();
    }, [timeFilter]);

    const loadPageData = async () => {
        setLoading(true);
        setFetchError(null);
        try {
            if (!user.id) return;

            // Run both in parallel using the user from props
            await Promise.all([
                fetchMeetings(user.id),
                fetchLeads(user.id)
            ]);
        } catch (error: any) {
            console.error('Error loading page data:', error);
            setFetchError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchMeetings = async (userId: string) => {
        try {
            const now = new Date();
            const todayStr = now.toLocaleDateString('en-CA');
            let query = supabase
                .from('meetings')
                .select('*')
                .eq('user_id', userId)
                .order('date', { ascending: true })
                .order('time', { ascending: true });

            if (timeFilter === 'hoje') {
                query = query.eq('date', todayStr);
            } else if (timeFilter === 'semana') {
                const nextWeek = new Date(now);
                nextWeek.setDate(now.getDate() + 7);
                const nextWeekStr = nextWeek.toLocaleDateString('en-CA');
                
                query = query.gte('date', todayStr)
                             .lte('date', nextWeekStr);
            }

            const { data, error } = await query;
            if (error) throw error;
            if (data) setMeetings(data);
        } catch (error: any) {
            console.error('Error fetching meetings:', error);
            throw error;
        }
    };

    const fetchLeads = async (userId: string) => {
        try {
            const { data: leadsData } = await supabase
                .from('leads')
                .select('id, name, company')
                .eq('user_id', userId)
                .order('name');
            
            if (!leadsData) return;

            const leadIds = leadsData.map(l => l.id);
            const { data: interactions } = await supabase
                .from('lead_interactions')
                .select('lead_id, result')
                .in('lead_id', leadIds);

            const answeredLeadIds = new Set(
                interactions
                    ?.filter(i => !['busy', 'no_answer', 'failed'].includes(i.result))
                    .map(i => i.lead_id)
            );

            const filtered = leadsData.filter(lead => answeredLeadIds.has(lead.id));
            setLeads(filtered as any);
        } catch (error: any) {
            console.error('Error fetching leads:', error);
            throw error;
        }
    };

    const handleCreateMeeting = async () => {
        if (!selectedLeadId || !newDate || !newTime) {
            alert('Preencha os campos obrigatórios.');
            return;
        }

        setSaving(true);
        try {
            const selectedLead = leads.find(l => l.id === selectedLeadId);
            
            if (!user.id) throw new Error('Usuário não autenticado');

            const { data: newMeeting, error } = await supabase
                .from('meetings')
                .insert([{
                    user_id: user.id,
                    lead_id: selectedLeadId,
                    lead_name: selectedLead?.name || 'Lead s/ nome',
                    lead_company: selectedLead?.company || '',
                    date: newDate,
                    time: `${newTime}:00`,
                    status: 'Pendente',
                    link_type: linkType,
                    link_url: linkType === 'google' ? 'meet.google.com/new' : 
                              linkType === 'zoom' ? 'zoom.us/new' : customLink,
                    description: description
                }])
                .select()
                .single();

            if (error) throw error;

            if (newMeeting) {
                syncToGoogle(newMeeting);
            }

            if (error) throw error;

            setIsModalOpen(false);
            loadPageData();
            resetForm();
        } catch (error: any) {
            alert('Erro ao agendar: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const resetForm = () => {
        setSelectedLeadId('');
        setNewDate('');
        setNewTime('');
        setLinkType('google');
        setCustomLink('');
        setDescription('');
    };

    const handleCancelMeeting = async (id: string) => {
        if (!confirm('Deseja realmente cancelar esta reunião?')) return;
        
        const meeting = meetings.find(m => m.id === id);
        if (meeting?.google_event_id && accessToken) {
            deleteFromGoogle(meeting.google_event_id);
        }

        const { error } = await supabase
            .from('meetings')
            .update({ status: 'Cancelada' })
            .eq('id', id);

        if (!error) loadPageData();
    };

    const handleConfirmMeeting = async (id: string) => {
        const { error } = await supabase
            .from('meetings')
            .update({ status: 'Confirmada' })
            .eq('id', id);

        if (!error) {
            loadPageData();
            const meeting = meetings.find(m => m.id === id);
            if (meeting) syncToGoogle(meeting);
        }
        setOpenMenuIdx(null);
    };

    const handleFinishMeeting = (meeting: Meeting) => {
        setSelectedMeeting(meeting);
        setFinishOutcome('Realizada');
        setFinishNotes(meeting.description || '');
        setIsFinishModalOpen(true);
        setOpenMenuIdx(null);
    };

    const handleSaveMeetingResult = async () => {
        if (!selectedMeeting) return;
        
        setSaving(true);
        try {
            const { error } = await supabase
                .from('meetings')
                .update({ 
                    status: finishOutcome === 'Realizada' ? 'Concluída' : 'Não Compareceu',
                    actual_outcome: finishOutcome,
                    result_notes: finishNotes
                })
                .eq('id', selectedMeeting.id);

            if (error) throw error;
            setIsFinishModalOpen(false);
            loadPageData();
        } catch (error: any) {
            alert('Erro ao salvar resultado: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleEditLink = (meeting: Meeting) => {
        setEditingMeeting(meeting);
        setEditLinkType(meeting.link_type as any || 'google');
        setEditCustomLink(meeting.link_url === 'Aguardando definição' ? '' : meeting.link_url);
        setIsEditLinkModalOpen(true);
        setOpenMenuIdx(null);
    };

    const handleSaveLink = async () => {
        if (!editingMeeting) return;
        
        setSaving(true);
        try {
            const finalLink = editLinkType === 'google' ? 'meet.google.com/new' : 
                             editLinkType === 'zoom' ? 'zoom.us/new' : editCustomLink;

            const { error } = await supabase
                .from('meetings')
                .update({ 
                    link_type: editLinkType,
                    link_url: finalLink || 'Aguardando definição'
                })
                .eq('id', editingMeeting.id);

            if (error) throw error;
            setIsEditLinkModalOpen(false);
            loadPageData();
        } catch (error: any) {
            alert('Erro ao salvar link: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const filteredMeetings = [...meetings].sort((a, b) => {
        const order: Record<string, number> = {
            'Confirmada': 1,
            'Pendente': 2,
            'Cancelada': 3,
            'Concluída': 4
        };
        
        // Primeiro por status
        const statusDiff = (order[a.status] || 99) - (order[b.status] || 99);
        if (statusDiff !== 0) return statusDiff;
        
        // Se status for igual, por data e hora (mais próximas primeiro)
        const dateA = new Date(`${a.date}T${a.time}`).getTime();
        const dateB = new Date(`${b.date}T${b.time}`).getTime();
        return dateA - dateB;
    });

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-background-light dark:bg-background-dark">
            <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-surface-dark border-b border-slate-200 dark:border-slate-700 shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Reuniões Agendadas</h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative hidden sm:block">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input type="text" placeholder="Buscar lead..." className="pl-10 pr-4 py-2 w-64 rounded-lg bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-primary focus:border-primary dark:text-white placeholder-slate-400 transition-all" />
                    </div>
                    <button className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary transition-colors relative">
                        <Bell size={20} />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-surface-dark"></span>
                    </button>
                    <button onClick={() => setIsModalOpen(true)} className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95">
                        <Plus size={18} />
                        <span className="hidden sm:inline">Nova Reunião</span>
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-primary/10 text-primary">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Hoje</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {meetings.filter(m => m.date === new Date().toLocaleDateString('en-CA')).length}
                            </p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-500">
                            <CheckCircle size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Confirmadas</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {meetings.filter(m => m.status === 'Confirmada').length}
                            </p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-surface-dark p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-amber-500/10 text-amber-500">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Pendentes</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {meetings.filter(m => m.status === 'Pendente').length}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={accessToken ? () => loadPageData() : requestPermission}
                        className={`bg-white dark:bg-surface-dark p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between cursor-pointer hover:border-primary/50 transition-colors group ${accessToken ? 'border-primary/50 ring-1 ring-primary/10' : ''}`}
                    >
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Sincronização</p>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                                {accessToken ? 'Agenda Conectada' : 'Google Calendar'}
                            </p>
                        </div>
                        <RefreshCw size={20} className={`${accessToken ? 'text-blue-500' : 'text-green-500'} ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                    </button>
                </div>

                <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="font-semibold text-slate-800 dark:text-white">Próximos Compromissos</h2>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setTimeFilter('hoje')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${timeFilter === 'hoje' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-primary'}`}
                            >
                                Hoje
                            </button>
                            <button 
                                onClick={() => setTimeFilter('semana')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${timeFilter === 'semana' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-primary'}`}
                            >
                                Esta Semana
                            </button>
                            <button 
                                onClick={() => setTimeFilter('todas')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${timeFilter === 'todas' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-primary'}`}
                            >
                                Todas
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-700">
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Data & Hora</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Lead</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Link da Reunião</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <Loader2 className="animate-spin text-primary" size={24} />
                                                <span className="text-sm text-slate-500">Carregando compromissos...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredMeetings.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center text-slate-500 italic">
                                            Nenhuma reunião encontrada para este período.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredMeetings.map((meeting, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className={`text-sm font-bold ${meeting.status === 'Cancelada' ? 'text-slate-500 line-through' : 'text-primary'}`}>
                                                    {new Date(meeting.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                                </span>
                                                <span className="text-xs text-slate-500 dark:text-slate-400">{meeting.time.slice(0, 5)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-primary/10 text-primary`}>
                                                    {meeting.lead_name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900 dark:text-white">{meeting.lead_name}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{meeting.lead_company}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                                meeting.status === 'Confirmada' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' :
                                                meeting.status === 'Pendente' ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20' :
                                                'bg-slate-100 text-slate-800 dark:bg-slate-500/10 dark:text-slate-400 border-slate-200 dark:border-slate-500/20'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                                    meeting.status === 'Confirmada' ? 'bg-emerald-500' :
                                                    meeting.status === 'Pendente' ? 'bg-amber-500 animate-pulse' :
                                                    'bg-slate-500'
                                                }`}></span>
                                                {meeting.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {meeting.link_type === 'google' && (
                                                <a href={meeting.link_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                                                    <img src={IMAGES.MEET_ICON} alt="Meet" className="w-4 h-4" />
                                                    {meeting.link_url}
                                                </a>
                                            )}
                                            {meeting.link_type === 'zoom' && (
                                                <a href={meeting.link_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                                                    <img src={IMAGES.ZOOM_ICON} alt="Zoom" className="h-3" />
                                                    {meeting.link_url}
                                                </a>
                                            )}
                                            {meeting.link_type === 'none' && (
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-sm ${meeting.status === 'Cancelada' ? 'text-slate-400 line-through' : 'text-slate-400 italic'}`}>
                                                        {meeting.link_url}
                                                    </span>
                                                    {meeting.status !== 'Cancelada' && meeting.status !== 'Concluída' && (
                                                        <button 
                                                            onClick={() => handleEditLink(meeting)}
                                                            className="p-1 rounded-md text-primary hover:bg-primary/10 transition-colors"
                                                            title="Adicionar Link"
                                                        >
                                                            <Plus size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right relative">
                                            <button 
                                                onClick={() => setOpenMenuIdx(openMenuIdx === idx ? null : idx)}
                                                className={`p-1.5 rounded-lg transition-colors ${openMenuIdx === idx ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                            >
                                                <MoreVertical size={18} />
                                            </button>

                                            {openMenuIdx === idx && (
                                                <div 
                                                    ref={menuRef}
                                                    className="absolute right-6 top-12 w-56 bg-white dark:bg-surface-dark rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-20 animate-in fade-in zoom-in duration-100 origin-top-right"
                                                >
                                                    {meeting.status === 'Pendente' && (
                                                        <button 
                                                            onClick={() => handleConfirmMeeting(meeting.id)}
                                                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                                                        >
                                                            <CheckCircle size={14} />
                                                            Confirmar Reunião
                                                        </button>
                                                    )}
                                                    {meeting.status !== 'Concluída' && meeting.status !== 'Cancelada' && (
                                                        <>
                                                            <button 
                                                                onClick={() => handleFinishMeeting(meeting)}
                                                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-primary hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                                            >
                                                                <Calendar size={14} />
                                                                Finalizar Reunião
                                                            </button>
                                                            <button 
                                                                onClick={() => handleEditLink(meeting)}
                                                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                                            >
                                                                <Edit2 size={14} />
                                                                Editar Link da Chamada
                                                            </button>
                                                        </>
                                                    )}
                                                    <div className="my-1 border-t border-slate-100 dark:border-slate-800"></div>
                                                    <button 
                                                        onClick={() => handleCancelMeeting(meeting.id)}
                                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                        Cancelar Reunião
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative bg-white dark:bg-surface-dark rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-slate-200 dark:border-slate-700 animate-fade-in-up">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Marcar Nova Reunião</h3>
                            <button className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300" onClick={() => setIsModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Lead</label>
                                <select 
                                    value={selectedLeadId}
                                    onChange={(e) => setSelectedLeadId(e.target.value)}
                                    className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-background-dark text-slate-900 dark:text-white focus:ring-primary focus:border-primary shadow-sm py-2.5"
                                >
                                    <option value="">Selecione um lead...</option>
                                    {leads.map(lead => (
                                        <option key={lead.id} value={lead.id}>{lead.name} {lead.company ? `- ${lead.company}` : ''}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data</label>
                                    <input 
                                        type="date" 
                                        value={newDate}
                                        onChange={(e) => setNewDate(e.target.value)}
                                        className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-background-dark text-slate-900 dark:text-white focus:ring-primary focus:border-primary shadow-sm py-2 px-3" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hora</label>
                                    <input 
                                        type="time" 
                                        value={newTime}
                                        onChange={(e) => setNewTime(e.target.value)}
                                        className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-background-dark text-slate-900 dark:text-white focus:ring-primary focus:border-primary shadow-sm py-2 px-3" 
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tipo de Reunião</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center">
                                        <input 
                                            type="radio" 
                                            name="type" 
                                            checked={linkType === 'google'} 
                                            onChange={() => setLinkType('google')}
                                            className="text-primary focus:ring-primary bg-background-dark border-slate-700" 
                                        />
                                        <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">Google Meet</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input 
                                            type="radio" 
                                            name="type" 
                                            checked={linkType === 'zoom'} 
                                            onChange={() => setLinkType('zoom')}
                                            className="text-primary focus:ring-primary bg-background-dark border-slate-700" 
                                        />
                                        <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">Zoom</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input 
                                            type="radio" 
                                            name="type" 
                                            checked={linkType === 'custom'} 
                                            onChange={() => setLinkType('custom')}
                                            className="text-primary focus:ring-primary bg-background-dark border-slate-700" 
                                        />
                                        <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">Outro (Manual)</span>
                                    </label>
                                </div>
                                {linkType === 'custom' && (
                                    <input 
                                        type="text"
                                        value={customLink}
                                        onChange={(e) => setCustomLink(e.target.value)}
                                        placeholder="Cole o link da reunião aqui..."
                                        className="mt-2 w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-background-dark text-slate-900 dark:text-white focus:ring-primary focus:border-primary shadow-sm py-2 px-3 text-sm"
                                    />
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição / Pauta</label>
                                <textarea 
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-background-dark text-slate-900 dark:text-white focus:ring-primary focus:border-primary shadow-sm py-2 px-3 placeholder-slate-400" 
                                    rows={3} 
                                    placeholder="Pauta da reunião..."
                                ></textarea>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                            <button className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                            <button 
                                onClick={handleCreateMeeting}
                                disabled={saving}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-dark shadow-md shadow-primary/20 transition-colors disabled:opacity-50"
                            >
                                {saving ? 'Agendando...' : 'Agendar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal de Finalização */}
            {isFinishModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsFinishModalOpen(false)}></div>
                    <div className="relative bg-white dark:bg-surface-dark rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-slate-200 dark:border-slate-700 animate-fade-in-up">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Finalizar Reunião</h3>
                                <p className="text-xs text-slate-500">{selectedMeeting?.lead_name}</p>
                            </div>
                            <button className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300" onClick={() => setIsFinishModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">O que aconteceu?</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => setFinishOutcome('Realizada')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${finishOutcome === 'Realizada' ? 'bg-primary/10 border-primary text-primary' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                                    >
                                        Realizada
                                    </button>
                                    <button 
                                        onClick={() => setFinishOutcome('Não Compareceu')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${finishOutcome === 'Não Compareceu' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                                    >
                                        Não Compareceu
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notas da Reunião</label>
                                <textarea 
                                    value={finishNotes}
                                    onChange={(e) => setFinishNotes(e.target.value)}
                                    className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-background-dark text-slate-900 dark:text-white focus:ring-primary focus:border-primary shadow-sm py-2 px-3" 
                                    rows={5} 
                                    placeholder="Resumo do que foi conversado..."
                                ></textarea>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                            <button className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" onClick={() => setIsFinishModalOpen(false)}>Cancelar</button>
                            <button 
                                onClick={handleSaveMeetingResult}
                                disabled={saving}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-dark shadow-md shadow-primary/20 transition-colors disabled:opacity-50"
                            >
                                {saving ? 'Salvando...' : 'Salvar Resultado'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal de Editar Link */}
            {isEditLinkModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsEditLinkModalOpen(false)}></div>
                    <div className="relative bg-white dark:bg-surface-dark rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-slate-200 dark:border-slate-700 animate-fade-in-up">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Definir Link da Chamada</h3>
                                <p className="text-xs text-slate-500">{editingMeeting?.lead_name}</p>
                            </div>
                            <button className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300" onClick={() => setIsEditLinkModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tipo de Link</label>
                                <div className="grid grid-cols-3 gap-3">
                                    <button 
                                        onClick={() => setEditLinkType('google')}
                                        className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-2 ${editLinkType === 'google' ? 'bg-primary/10 border-primary text-primary' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                                    >
                                        <img src={IMAGES.MEET_ICON} alt="" className="w-3 h-3" />
                                        Meet
                                    </button>
                                    <button 
                                        onClick={() => setEditLinkType('zoom')}
                                        className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-2 ${editLinkType === 'zoom' ? 'bg-primary/10 border-primary text-primary' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                                    >
                                        <img src={IMAGES.ZOOM_ICON} alt="" className="h-2" />
                                        Zoom
                                    </button>
                                    <button 
                                        onClick={() => setEditLinkType('manual')}
                                        className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-2 ${editLinkType === 'manual' ? 'bg-primary/10 border-primary text-primary' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                                    >
                                        <MoreVertical size={12} />
                                        Manual
                                    </button>
                                </div>
                            </div>
                            {(editLinkType === 'manual' || editLinkType === 'google' || editLinkType === 'zoom') && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        {editLinkType === 'manual' ? 'Link Personalizado' : 'Link de Acesso'}
                                    </label>
                                    <input 
                                        type="text" 
                                        value={editCustomLink}
                                        onChange={(e) => setEditCustomLink(e.target.value)}
                                        placeholder={editLinkType === 'manual' ? "https://..." : "Opcional: link específico"}
                                        className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-background-dark text-slate-900 dark:text-white focus:ring-primary focus:border-primary shadow-sm py-2 px-3 text-sm" 
                                    />
                                    {editLinkType !== 'manual' && !editCustomLink && (
                                        <p className="mt-1 text-[10px] text-slate-500 italic">
                                            Se vazio, usará o link padrão de criação de nova sala.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                            <button className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" onClick={() => setIsEditLinkModalOpen(false)}>Cancelar</button>
                            <button 
                                onClick={handleSaveLink}
                                disabled={saving}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-dark shadow-md shadow-primary/20 transition-colors disabled:opacity-50"
                            >
                                {saving ? 'Salvando...' : 'Atualizar Link'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
