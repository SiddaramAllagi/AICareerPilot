import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './components/AuthContext';
import { AuthView } from './components/AuthView';
import { BillingView } from './components/BillingView';
import { CareerAdvisorView } from './components/CareerAdvisorView';
import { DashboardLayout } from './components/DashboardLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { InterviewPrepView } from './components/InterviewPrepView';
import { JobsDiscoveryView } from './components/JobsDiscoveryView';
import { LandingPage } from './components/LandingPage';
import { LearningRoadmapView } from './components/LearningRoadmapView';
import { OverviewDashboard } from './components/OverviewDashboard';
import { ProfileView } from './components/ProfileView';
import { ResumeAnalyzerView } from './components/ResumeAnalyzerView';
import { SkillGapView } from './components/SkillGapView';
import { ThemeProvider } from './components/ThemeContext';
import { DashboardSection } from './types';

function AppRouter() {
  const { user, loading, emailVerified } = useAuth();
  const [view, setView] = useState<'landing' | 'auth' | 'dashboard'>('landing');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [section, setSection] = useState<DashboardSection>('overview');

  useEffect(() => {
    if (!loading && user && emailVerified && view === 'auth') {
      setView('dashboard');
    }
    if (!loading && !user && view === 'dashboard') {
      setView('auth');
    }
  }, [loading, user, emailVerified, view]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
      </div>
    );
  }

  if (view === 'auth' || (user && !emailVerified && view === 'dashboard')) {
    return (
      <AuthView
        initialMode={authMode}
        onBackToHome={() => setView('landing')}
      />
    );
  }

  if (view === 'dashboard' && user && emailVerified) {
    return (
      <DashboardLayout
        activeSection={section}
        onSelectSection={setSection}
        onBackToLanding={() => setView('landing')}
      >
        {section === 'overview' && <OverviewDashboard onNavigate={setSection} />}
        {section === 'advisor' && <CareerAdvisorView />}
        {section === 'resume' && <ResumeAnalyzerView />}
        {section === 'skills' && <SkillGapView onNavigate={setSection} />}
        {section === 'roadmap' && <LearningRoadmapView />}
        {section === 'interview' && <InterviewPrepView />}
        {section === 'jobs' && <JobsDiscoveryView />}
        {section === 'billing' && <BillingView />}
        {section === 'profile' && <ProfileView />}
      </DashboardLayout>
    );
  }

  return (
    <LandingPage
      isAuthenticated={Boolean(user && emailVerified)}
      onGetStarted={(mode = 'register') => {
        if (user && emailVerified) {
          setView('dashboard');
        } else {
          setAuthMode(mode);
          setView('auth');
        }
      }}
      onOpenDashboard={() => {
        if (user && emailVerified) {
          setView('dashboard');
        } else {
          setAuthMode('login');
          setView('auth');
        }
      }}
    />
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
