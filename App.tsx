import React, { useState } from 'react';
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

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('login');
  const [leadsFilter, setLeadsFilter] = useState<string>('novos');
  const [user, setUser] = useState({
    name: 'Carregando...',
    email: '',
    role: '',
    phone: '',
    avatar: IMAGES.AVATAR_USER
  });
  const [loadingSession, setLoadingSession] = useState(true);

  const mapUserSession = (session: any) => ({
    name: session?.user?.user_metadata?.full_name || 'Usuário',
    email: session?.user?.email || '',
    role: session?.user?.user_metadata?.role || 'admin',
    phone: session?.user?.user_metadata?.phone || '',
    avatar: session?.user?.user_metadata?.avatar_url || IMAGES.AVATAR_USER
  });

  React.useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(mapUserSession(session));
        setCurrentView('leads');
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
        setUser(mapUserSession(session));
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
      setCurrentView('login');
  };

  const renderView = () => {
    switch (currentView) {
      case 'leads':
        return <LeadsPage key={`leads-${leadsFilter}`} initialFilter={leadsFilter} />;
      case 'performance':
        return <PerformancePage onNavigateLeads={handleNavigateWithFilter} />;
      case 'analytics':
        return <AnalyticsPage user={user} />;
      case 'meetings':
        return <MeetingsPage />;
      case 'import':
        return <ImportLeadsPage onNavigate={setCurrentView} />;
      case 'settings':
        return <SettingsPage user={user} onUpdateUser={setUser} />;
      default:
        return <LeadsPage initialFilter={leadsFilter} />;
    }
  };

  if (currentView === 'login') {
    return <LoginPage onNavigate={setCurrentView} />;
  }

  if (currentView === 'register') {
    return <RegisterPage onNavigate={setCurrentView} />;
  }

  if (loadingSession) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-[#101822] text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
      );
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
