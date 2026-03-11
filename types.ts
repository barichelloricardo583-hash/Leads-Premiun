export interface Lead {
    id: string;
    name: string;
    location: string;
    phone: string;
    equity: string;
    callsToday: number;
    initials: string;
    colorClass: string;
    status: 'new' | 'contacted' | 'converted' | 'callback' | 'busy' | 'invalid_number' | 'appointment_confirmed';
    company?: string;
    value?: string;
    last_interaction_at?: string | null;
    interactions?: LeadInteraction[];
}

export interface LeadInteraction {
    id: string;
    lead_id: string;
    created_at: string;
    result: string;
    duration?: string;
    notes?: string;
    next_step_at?: string | null;
}

export interface Meeting {
    id: string;
    date: string;
    time: string;
    leadName: string;
    leadCompany: string;
    status: 'Confirmada' | 'Pendente' | 'Cancelada';
    avatarUrl?: string;
    initials?: string;
    initialsColor?: string;
    linkType?: 'google' | 'zoom';
    linkUrl?: string;
}

export interface KPI {
    label: string;
    value: string;
    trend: string;
    trendUp: boolean;
    icon: string;
    subText?: string;
}
