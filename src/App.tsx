import React, { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { LeadsPage } from './pages/LeadsPage';
import { PerformancePage } from './pages/PerformancePage';
import { MeetingsPage } from './pages/MeetingsPage';
import { ImportLeadsPage } from './pages/ImportLeadsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AppView, IMAGES } from './constants';
import { supabase } from './lib/supabase';
import { User } from './types';

const DEFAULT_USER: User = {
  id: '',
  name: 'Usuário',
  email: '',
  role: '',
  phone: '',
  avatar: IMAGES.AVATAR_USER
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('login');
  const [leadsFilter, setLeadsFilter] = useState<string>('novos');
  const [user, setUser] = useState<User>(DEFAULT_USER);
  const [loadingSession, setLoadingSession] = useState(true);

  const mapUserSession = (session: Session | null): User => {
    if (!session) return DEFAULT_USER;
    
    return {
      id: session.user?.id || '',
      name: session.user?.user_metadata?.full_name || 'Usuário',
      email: session.user?.email || '',
      role: session.user?.user_metadata?.role || 'admin',
      phone: session.user?.user_metadata?.phone || '',
      avatar: session.user?.user_metadata?.avatar_url || IMAGES.AVATAR_USER
    };
  };

  const currentViewRef = React.useRef(currentView);
  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(mapUserSession(session));
        // Only redirect to dashboard if we are currently on the login or register page
        if (currentViewRef.current === 'login' || currentViewRef.current === 'register') {
          setCurrentView('performance');
        }
      } else {
        setCurrentView('login');
      }
      setLoadingSession(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        const newUser = mapUserSession(session);
        setUser(newUser);
        // Only redirect on login if coming from login or register
        if (currentViewRef.current === 'login' || currentViewRef.current === 'register') {
          setCurrentView('performance');
        }
      } else {
        setUser(DEFAULT_USER);
        setCurrentView('login');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleNavigateWithFilter = (view: AppView, filter: string) => {
    setCurrentView(view);
    setLeadsFilter(filter);
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
      setUser(DEFAULT_USER);
      setCurrentView('login');
  };

  const renderView = () => {
    switch (currentView) {
      case 'leads':
        return <LeadsPage key={`leads-${leadsFilter}-${user.id}`} initialFilter={leadsFilter} user={user} />;
      case 'performance':
        return <PerformancePage onNavigateLeads={handleNavigateWithFilter} user={user} />;
      case 'analytics':
        return <AnalyticsPage user={user} />;
      case 'meetings':
        return <MeetingsPage user={user} />;
      case 'import':
        return <ImportLeadsPage onNavigate={setCurrentView} user={user} />;
      case 'settings':
        return <SettingsPage user={user} onUpdateUser={setUser} />;
      default:
        return <LeadsPage initialFilter={leadsFilter} user={user} />;
    }
  };

  if (loadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#101822] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (currentView === 'login') {
    return <LoginPage onNavigate={setCurrentView} />;
  }

  if (currentView === 'register') {
    return <RegisterPage onNavigate={setCurrentView} />;
  }

  return (
    <div className="flex h-screen bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 font-display">
      <Sidebar 
        user={user}
        currentView={currentView} 
        onChangeView={(view) => {
          if (view === 'leads') {
            setLeadsFilter('novos');
          }
          setCurrentView(view);
        }} 
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-hidden relative h-full">
        {renderView()}
      </main>
    </div>
  );
};

export default App;
