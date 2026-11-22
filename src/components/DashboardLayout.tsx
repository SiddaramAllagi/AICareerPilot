import React, { useState } from 'react';
import {
  BookOpen,
  Briefcase,
  Compass,
  CreditCard,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Sun,
  Target,
  User,
  X,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { BrandMark } from './BrandMark';
import { useTheme } from './ThemeContext';
import { DashboardSection } from '../types';

interface DashboardLayoutProps {
  activeSection: DashboardSection;
  onSelectSection: (section: DashboardSection) => void;
  onBackToLanding: () => void;
  children: React.ReactNode;
}

const NAV_ITEMS: Array<{
  id: DashboardSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'advisor', label: 'AI Career Advisor', icon: Compass },
  { id: 'resume', label: 'Resume Analyzer', icon: FileText },
  { id: 'skills', label: 'Skill Gap Analyzer', icon: Target },
  { id: 'roadmap', label: 'Learning Roadmap', icon: BookOpen },
  { id: 'interview', label: 'Interview Prep', icon: MessageSquare },
  { id: 'jobs', label: 'Jobs & Internships', icon: Briefcase },
  { id: 'billing', label: 'Plans & Billing', icon: CreditCard },
  { id: 'profile', label: 'Career Profile', icon: User },
];

export function DashboardLayout({
  activeSection,
  onSelectSection,
  onBackToLanding,
  children,
}: DashboardLayoutProps) {
  const { profile, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeLabel = NAV_ITEMS.find((n) => n.id === activeSection)?.label || 'Dashboard';

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="h-16 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToLanding}
          className="inline-flex items-center gap-2.5 text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap"
        >
          <BrandMark className="w-6 h-6" />
          <span>AI CareerPilot</span>
        </button>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-500"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectSection(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                active
                  ? 'bg-slate-900 text-white dark:bg-violet-600 dark:text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
        <div className="text-xs">
          <p className="font-semibold text-slate-900 dark:text-white truncate">
            {profile?.displayName || user?.displayName || 'Student'}
          </p>
          <p className="text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBackToLanding}
            className="flex-1 py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" />
            Home
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="flex-1 py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 inline-flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 h-screen">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full border-r border-slate-200 dark:border-slate-800 z-10">
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
              Workspace <span className="mx-1.5">/</span>
              <span className="font-semibold text-slate-900 dark:text-white">{activeLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => onSelectSection('profile')}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              {profile?.plan?.toUpperCase() || 'FREE'} Plan
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
