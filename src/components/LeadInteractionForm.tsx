import React, { useState, useEffect } from 'react';
import { Timer, Calendar, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Lead, LeadInteraction, User } from '../types';

interface LeadInteractionFormProps {
    lead: Lead | null;
    onClose: () => void;
    onSaveSuccess?: () => void;
    user: User;
}

export const LeadInteractionForm: React.FC<LeadInteractionFormProps> = ({ lead, onClose, onSaveSuccess, user }) => {
    const [callResult, setCallResult] = useState('');
    const [callDuration, setCallDuration] = useState('');
    const [notes, setNotes] = useState('');
    const [scheduleNextStep, setScheduleNextStep] = useState(false);
    const [nextDate, setNextDate] = useState('');
    const [nextTime, setNextTime] = useState('');
    const [saving, setSaving] = useState(false);
    const [interactions, setInteractions] = useState<LeadInteraction[]>([]);

    useEffect(() => {
        if (lead) {
            fetchInteractions();
            // Reset form when lead changes
            setCallResult('');
            setCallDuration('');
            setNotes('');
            setScheduleNextStep(false);
            setNextDate('');
            setNextTime('');
        }
    }, [lead]);

    const fetchInteractions = async () => {
        if (!lead) return;
        const { data, error } = await supabase
            .from('lead_interactions')
            .select('*')
            .eq('user_id', user.id)
            .eq('lead_id', lead.id)
            .order('created_at', { ascending: false });
        
        if (!error && data) {
            setInteractions(data);
        }
    };

    if (!lead) return null;

    const toggleId = `toggle-${lead.id}`;

    const handleSave = async () => {
        if (!callResult) {
            alert('Por favor, selecione o resultado da ligação.');
            return;
        }

        if (scheduleNextStep && (!nextDate || !nextTime)) {
            alert('Por favor, preencha a data e a hora do agendamento.');
            return;
        }
        setSaving(true);
        try {
            // 1. Log the interaction
            const { error: logError } = await supabase
                .from('lead_interactions')
                .insert([{
                    user_id: user.id,
                    lead_id: lead.id,
                    result: callResult,
                    duration: callDuration,
                    notes: notes,
                    next_step_at: scheduleNextStep ? `${nextDate}T${nextTime}:00` : null
                }]);

            if (logError) throw logError;

            // 1.1 Create a meeting if scheduled
            if (scheduleNextStep) {
                await supabase
                    .from('meetings')
                    .insert([{
                        user_id: user.id,
                        lead_id: lead.id,
                        lead_name: lead.name,
                        lead_company: lead.company,
                        date: nextDate,
                        time: `${nextTime}:00`,
                        status: 'Pendente',
                        link_type: 'none',
                        link_url: 'Aguardando definição',
                        description: notes
                    }]);
            }

            // 2. Update Lead status and last interaction
            const leadUpdate: any = {
                last_interaction_at: new Date().toISOString()
            };

            // Map UI result to DB status
            if (callResult === 'interest' || callResult === 'appointment_confirmed') {
                leadUpdate.status = 'contacted';
            } else if (callResult === 'no_interest') {
                leadUpdate.status = 'archived'; // Or whatever your "don't show" status is
            } else {
                leadUpdate.status = callResult; // Use the value directly for busy, callback, etc.
            }

            const { error: leadError } = await supabase
                .from('leads')
                .update(leadUpdate)
                .eq('id', lead.id);

            if (leadError) throw leadError;

            if (onSaveSuccess) onSaveSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving interaction:', error);
            alert('Erro ao salvar atendimento: ' + (error.message || 'Erro desconhecido.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="w-[440px] bg-white dark:bg-surface-dark border-l border-slate-200 dark:border-slate-700 flex flex-col shadow-xl z-20 animate-in slide-in-from-right duration-300">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="uppercase tracking-wider text-xs font-bold text-primary">Em Atendimento</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">#LEAD-{String(lead.id).slice(0, 4).toUpperCase()}</span>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                        <X size={18} />
                    </button>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{lead.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Última interação: {lead.last_interaction_at ? new Date(lead.last_interaction_at).toLocaleString('pt-BR') : 'Nenhuma registrada'}
                </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                        Resultado da Ligação <span className="text-red-500">*</span>
                    </label>
                    <select 
                        value={callResult}
                        onChange={(e) => setCallResult(e.target.value)}
                        className="block w-full pl-3 pr-10 py-3 text-base border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-lg shadow-sm text-slate-900 dark:text-white"
                    >
                        <option value="" disabled>Selecione um resultado...</option>
                        <option value="interest">Contato Realizado - Interesse</option>
                        <option value="no_interest">Contato Realizado - Sem Interesse</option>
                        <option value="callback">Pediu Retorno</option>
                        <option value="busy">Ocupado / Não Atendeu</option>
                        <option value="invalid_number">Número Inválido</option>
                        <option value="appointment_confirmed">Agendamento Confirmado</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                        Duração da Ligação
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Timer className="text-slate-400" size={18} />
                        </div>
                        <input 
                            type="text" 
                            value={callDuration}
                            onChange={(e) => setCallDuration(e.target.value)}
                            placeholder="Ex: 5m 30s"
                            className="block w-full pl-10 pr-3 py-3 text-base border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-lg shadow-sm text-slate-900 dark:text-white"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                        Histórico de Contatos
                    </label>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700 max-h-40 overflow-y-auto">
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                            <span>Tentativas Realizadas</span>
                            <span className="font-bold text-primary">{interactions.length} vezes</span>
                        </div>
                        <div className="space-y-1.5">
                            {interactions.length > 0 ? interactions.map((inter) => (
                                <div key={inter.id} className="flex flex-col gap-0.5 text-xs border-b border-slate-100 dark:border-slate-700 pb-1.5 mb-1.5 last:border-0 last:pb-0 last:mb-0">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                                            <span>{new Date(inter.created_at).toLocaleString('pt-BR')}</span>
                                        </div>
                                        <span className="text-primary font-bold">{inter.result}</span>
                                    </div>
                                    {inter.notes && <p className="text-slate-500 pl-3.5 italic">"{inter.notes}"</p>}
                                </div>
                            )) : (
                                <p className="text-xs text-slate-400 text-center py-2 italic font-mono uppercase">Sem histórico registrado</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                        Observações da conversa
                    </label>
                    <textarea 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-3" 
                        rows={6} 
                        placeholder="Descreva os pontos principais da conversa, objeções ou interesses..."
                    ></textarea>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2">
                            <Calendar className="text-primary" size={18} />
                            Agendar Próximo Passo?
                        </span>
                        <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                            <input 
                                type="checkbox" 
                                id={toggleId} 
                                checked={scheduleNextStep}
                                onChange={(e) => setScheduleNextStep(e.target.checked)}
                                className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer border-slate-300 peer checked:right-0 checked:border-primary" 
                            />
                            <label htmlFor={toggleId} className="toggle-label block overflow-hidden h-5 rounded-full bg-slate-300 cursor-pointer peer-checked:bg-primary"></label>
                        </div>
                    </div>
                    
                    {scheduleNextStep && (
                        <div className="grid grid-cols-2 gap-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Data</label>
                                <input 
                                    type="date" 
                                    value={nextDate}
                                    onChange={(e) => setNextDate(e.target.value)}
                                    className="block w-full border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white" 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Hora</label>
                                <input 
                                    type="time" 
                                    value={nextTime}
                                    onChange={(e) => setNextTime(e.target.value)}
                                    className="block w-full border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white" 
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dark mt-auto">
                <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Save size={18} />
                    {saving ? 'Salvando...' : 'Salvar Status'}
                </button>
            </div>
        </div>
    );
};
