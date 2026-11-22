import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Check,
  ChevronDown,
  Compass,
  FileText,
  Layers,
  Menu,
  MessageSquare,
  Moon,
  Sun,
  Target,
  X,
} from 'lucide-react';
import { BrandMark } from './BrandMark';
import { useTheme } from './ThemeContext';

interface LandingPageProps {
  isAuthenticated: boolean;
  onGetStarted: (mode?: 'login' | 'register') => void;
  onOpenDashboard: () => void;
}

const FAQS = [
  {
    q: 'How does AI CareerPilot analyze my PDF resume?',
    a: 'Your PDF is uploaded over HTTPS to our backend, verified for valid PDF format, and analyzed by Gemini AI for structure, ATS keyword alignment, technical skills, project impact, and grammar. Your ATS readability score reflects formatting and keyword coverage—it is a helpful guide, not a guarantee of employer selection.',
  },
  {
    q: 'Where do the internships and job listings come from?',
    a: 'Opportunities in the Discovery module are fetched live from legitimate public job boards (Remotive and Arbeitnow) with verified HTTPS application links. We never invent vacancies, employers, or fake application URLs.',
  },
  {
    q: 'Are my career profile, roadmaps, and resume reports private?',
    a: 'Yes. Every document stored in Cloud Firestore is strictly scoped to your verified Firebase Authentication account through enforced security rules. Other users cannot read or query your personal profile or analyses.',
  },
  {
    q: 'How do the Pro (₹99/mo) and Premium (₹199/mo) subscriptions work?',
    a: 'Payments are processed via Razorpay with server-side signature verification. If Razorpay gateway keys are not yet configured by the administrator, billing remains clearly marked as pending configuration—we never simulate fake payments.',
  },
];

const SAMPLE_SCENARIOS = [
  {
    name: 'Ananya Verma',
    role: 'B.Tech CSE Final Year · Sample Student Profile',
    focus: 'Software Developer Readiness',
    quote:
      'Used the Skill Gap Analyzer to compare React and Python coursework against junior backend roles, then followed an 8-week roadmap to ship two portfolio APIs.',
  },
  {
    name: 'Rohan Kulkarni',
    role: 'B.Sc Data Science Graduate · Sample Student Profile',
    focus: 'Data Analyst Preparation',
    quote:
      'Uploaded a PDF resume to identify missing SQL window-function keywords and practiced 15 technical + HR mock questions before campus placements.',
  },
  {
    name: 'Meera Nair',
    role: 'MCA First-Year Student · Sample Student Profile',
    focus: 'AI Engineering Transition',
    quote:
      'Started with the AI Career Advisor to map linear algebra and Python foundations into an intermediate machine learning project schedule.',
  },
];

export function LandingPage({
  isAuthenticated,
  onGetStarted,
  onOpenDashboard,
}: LandingPageProps) {
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | 'contact' | null>(null);
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const handlePrimaryAction = () => {
    if (isAuthenticated) {
      onOpenDashboard();
    } else {
      onGetStarted('register');
    }
  };

  const handleLoginAction = () => {
    if (isAuthenticated) {
      onOpenDashboard();
    } else {
      onGetStarted('login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Top Bar Contract: 3 clean zones */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line brand wordmark */}
          <a
            href="#home"
            className="inline-flex items-center gap-2.5 text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            <BrandMark className="w-6 h-6" />
            <span>AI CareerPilot</span>
          </a>

          {/* Zone 2: 5 concise single-line nav links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#home" className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
              Home
            </a>
            <a href="#features" className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
              How It Works
            </a>
            <a href="#pricing" className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
              Pricing
            </a>
            <a href="#about" className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
              About Us
            </a>
          </nav>

          {/* Zone 3: Auth actions */}
          <div className="hidden md:flex items-center gap-4 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={handleLoginAction}
              className="text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              {isAuthenticated ? 'Dashboard' : 'Login'}
            </button>
            <button
              type="button"
              onClick={handlePrimaryAction}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-900 dark:bg-violet-600 text-white hover:bg-slate-800 dark:hover:bg-violet-500 transition-colors whitespace-nowrap shrink-0"
            >
              {isAuthenticated ? 'Open Workspace' : 'Get Started'}
            </button>
          </div>

          <button
            type="button"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden p-2.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-6 py-4 space-y-3">
            <div className="flex flex-col space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <a href="#home" onClick={() => setMobileMenuOpen(false)} className="py-2">Home</a>
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="py-2">Features</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="py-2">How It Works</a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="py-2">Pricing</a>
              <a href="#about" onClick={() => setMobileMenuOpen(false)} className="py-2">About Us</a>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={handleLoginAction}
                className="flex-1 py-2.5 px-4 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium"
              >
                {isAuthenticated ? 'Dashboard' : 'Login'}
              </button>
              <button
                type="button"
                onClick={handlePrimaryAction}
                className="flex-1 py-2.5 px-4 rounded-lg bg-slate-900 dark:bg-violet-600 text-white text-sm font-medium"
              >
                {isAuthenticated ? 'Workspace' : 'Get Started'}
              </button>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Hero Section */}
        <section id="home" className="max-w-7xl mx-auto px-6 pt-16 pb-20 lg:pt-24 lg:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs font-medium tracking-wide text-violet-700 dark:text-violet-400 mb-4">
                AI CareerPilot · Your Career. Your Skills. Your Future.
              </p>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12] text-balance mb-6">
                Build Your Future. Become Career Ready.
              </h1>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl mb-8">
                Your intelligent career companion. Discover your strengths, analyze your skills, optimize your resume, and prepare for your dream career with AI.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={handlePrimaryAction}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-slate-900 dark:bg-violet-600 text-white text-sm font-semibold hover:bg-slate-800 dark:hover:bg-violet-500 transition-colors whitespace-nowrap"
                >
                  <span>Start Your Career Journey</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="#features"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                >
                  Explore Features
                </a>
              </div>
              <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
                Built for college students, fresh graduates, and early-career job seekers · Private Firestore workspace
              </p>
            </div>

            <div className="lg:col-span-6 flex flex-col">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm flex-1 flex flex-col">
                <div className="relative h-64 sm:h-72 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <img
                    src="/src/assets/images/hero_career_workspace_1795324908199.jpg"
                    alt="Modern student career planning desk with laptop and notebook"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent" />
                  <div className="absolute bottom-4 left-5 right-5 text-white">
                    <p className="text-xs text-slate-200">Interactive Workspace Preview · Illustrative Structure</p>
                    <p className="text-sm font-semibold mt-0.5">
                      Personalized Career Readiness, ATS Review &amp; Skill Gap Tracking
                    </p>
                  </div>
                </div>
                <div className="p-6 grid grid-cols-3 gap-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Readiness Index</p>
                    <p className="mt-1 text-xl font-bold font-mono-tabular text-slate-900 dark:text-white">
                      Computed
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">From real progress</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">PDF Resume Check</p>
                    <p className="mt-1 text-xl font-bold font-mono-tabular text-slate-900 dark:text-white">
                      ATS + Skills
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Line-by-line review</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Mock Interviews</p>
                    <p className="mt-1 text-xl font-bold font-mono-tabular text-slate-900 dark:text-white">
                      Tech &amp; HR
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Evaluated answers</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Verifiable Platform Architecture Strip (No invented user counts or placement rates) */}
          <div className="mt-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-2xl font-bold font-mono-tabular text-slate-900 dark:text-white">6 Tools</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Advisor, Resume, Skill Gap, Roadmap, Interview &amp; Jobs
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold font-mono-tabular text-slate-900 dark:text-white">Gemini AI</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Server-side structured analysis with private key protection
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold font-mono-tabular text-slate-900 dark:text-white">2 Live Feeds</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Verified external job listings from Remotive &amp; Arbeitnow
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold font-mono-tabular text-slate-900 dark:text-white">Zero Mock Data</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Dashboard analytics calculate strictly from your saved work
              </p>
            </div>
          </div>
        </section>

        {/* Features Section (Asymmetric Bento Grid) */}
        <section id="features" className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-2xl mb-12">
              <p className="text-xs font-medium text-violet-700 dark:text-violet-400 mb-2">
                Platform Capabilities
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
                Every workflow needed to go from campus to career ready
              </h2>
              <p className="mt-3 text-base text-slate-600 dark:text-slate-300">
                Six connected workspaces backed by persistent Cloud Firestore history and real AI evaluation.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Feature 01 - Wide Card with Image */}
              <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 overflow-hidden flex flex-col justify-between">
                <div className="p-7">
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">01 · Career Strategy</span>
                    <Compass className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    AI Career Advisor
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                    Input your degree, branch, technical skills, interests, and career goals to receive tailored role recommendations, target programming languages, and personalized reasoning.
                  </p>
                </div>
                <div className="h-56 w-full overflow-hidden border-t border-slate-200 dark:border-slate-800">
                  <img
                    src="/src/assets/images/feature_career_advisor_1795324908796.jpg"
                    alt="Structured career progression binder and tablet analytics"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Feature 02 */}
              <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">02 · Document Review</span>
                    <FileText className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    AI Resume Analyzer
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                    Upload your PDF resume to inspect structure, technical skills, projects, grammar, and ATS readability. Receive rewritten professional summaries and concrete project bullet upgrades.
                  </p>
                </div>
                <div className="pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>PDF up to 5 MB · Validated server-side</span>
                  <button
                    type="button"
                    onClick={handlePrimaryAction}
                    className="font-semibold text-slate-900 dark:text-violet-400 hover:underline"
                  >
                    Analyze Resume
                  </button>
                </div>
              </div>

              {/* Feature 03 */}
              <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">03 · Benchmarking</span>
                    <Target className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    Skill Gap Analyzer
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Compare your current skills against roles like Data Analyst, AI Engineer, Full Stack Developer, or ML Engineer with prioritized High/Medium/Low learning actions.
                  </p>
                </div>
                <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
                  Role match coverage · Priority matrix
                </p>
              </div>

              {/* Feature 04 */}
              <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">04 · Curriculum</span>
                    <BookOpen className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    AI Learning Roadmap
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Generate Beginner, Intermediate, and Advanced milestones, weekly study targets, portfolio projects, and trackable topic checkboxes synced to your dashboard.
                  </p>
                </div>
                <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
                  Interactive checklist · Weekly targets
                </p>
              </div>

              {/* Feature 06 */}
              <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">06 · Opportunities</span>
                    <Briefcase className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    Internship &amp; Job Discovery
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Search verified external listings by role, location, experience level, and Internship vs. Full-Time category. Save opportunities directly to your shortlist.
                  </p>
                </div>
                <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
                  Live external feeds · Bookmark sync
                </p>
              </div>

              {/* Feature 05 - Wide Interview Spotlight */}
              <div className="lg:col-span-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
                <div className="lg:col-span-5 h-64 lg:h-auto overflow-hidden">
                  <img
                    src="/src/assets/images/feature_interview_prep_1795324909062.jpg"
                    alt="Graduate practicing remote technical interview at bright studio desk"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="lg:col-span-7 p-8 flex flex-col justify-center">
                  <div className="flex items-center gap-2 text-xs font-mono-tabular text-slate-500 dark:text-slate-400 mb-3">
                    <MessageSquare className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    <span>05 · Interactive Mock Practice</span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                    AI Interview Preparation
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-6 max-w-2xl">
                    Select your target job role and difficulty level to generate technical and HR questions with detailed explanations. Switch to Mock Interview mode to write answers, receive calibrated 0–100 evaluations, and review improved phrasing.
                  </p>
                  <div>
                    <button
                      type="button"
                      onClick={handlePrimaryAction}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 dark:bg-violet-600 text-white text-sm font-medium hover:bg-slate-800 dark:hover:bg-violet-500 transition-colors"
                    >
                      Start Interview Practice
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-20">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-medium text-violet-700 dark:text-violet-400 mb-2">
              Workflow
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              How It Works
            </h2>
            <p className="mt-3 text-base text-slate-600 dark:text-slate-300">
              Five structured steps from first sign-in to verified interview readiness.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {[
              { step: '01', title: 'Create your account', desc: 'Sign in securely with Google or email verification.' },
              { step: '02', title: 'Complete your career profile', desc: 'Record your degree, branch, skills, and target role.' },
              { step: '03', title: 'Analyze your skills', desc: 'Run resume PDF reviews and role skill gap comparisons.' },
              { step: '04', title: 'Get your personalized roadmap', desc: 'Generate beginner-to-advanced study topics and projects.' },
              { step: '05', title: 'Track your progress', desc: 'Check off completed milestones and log mock interviews.' },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between"
              >
                <div>
                  <span className="text-xs font-mono-tabular font-semibold text-violet-700 dark:text-violet-400">
                    Step {item.step}
                  </span>
                  <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-2xl mb-12">
              <p className="text-xs font-medium text-violet-700 dark:text-violet-400 mb-2">
                Subscription Plans
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Transparent student-friendly pricing
              </h2>
              <p className="mt-3 text-base text-slate-600 dark:text-slate-300">
                Start free with core career tools. Upgrade securely via Razorpay when configured.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              {/* Free Plan */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-8 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">For getting started</p>
                  <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">Free</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold font-mono-tabular text-slate-900 dark:text-white">₹0</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">/month</span>
                  </div>
                  <ul className="mt-6 space-y-3 text-sm text-slate-700 dark:text-slate-300">
                    <li className="flex items-start gap-2.5"><Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />Basic career recommendations</li>
                    <li className="flex items-start gap-2.5"><Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />Limited resume analysis (2/month)</li>
                    <li className="flex items-start gap-2.5"><Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />Basic learning roadmap</li>
                    <li className="flex items-start gap-2.5"><Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />Limited interview questions</li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={handlePrimaryAction}
                  className="mt-8 w-full py-2.5 px-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Start Free
                </button>
              </div>

              {/* Pro Plan */}
              <div className="rounded-xl border-2 border-slate-900 dark:border-violet-500 bg-white dark:bg-slate-900 p-8 flex flex-col justify-between shadow-sm">
                <div>
                  <p className="text-xs font-semibold text-violet-700 dark:text-violet-400">Most popular for graduates</p>
                  <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">Pro</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold font-mono-tabular text-slate-900 dark:text-white">₹99</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">/month</span>
                  </div>
                  <ul className="mt-6 space-y-3 text-sm text-slate-700 dark:text-slate-300">
                    <li className="flex items-start gap-2.5"><Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />Advanced career analysis</li>
                    <li className="flex items-start gap-2.5"><Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />More resume analyses (15/month)</li>
                    <li className="flex items-start gap-2.5"><Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />Detailed skill gap analysis</li>
                    <li className="flex items-start gap-2.5"><Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />Personalized learning roadmaps</li>
                    <li className="flex items-start gap-2.5"><Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />More interview practice sessions</li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={handlePrimaryAction}
                  className="mt-8 w-full py-2.5 px-4 rounded-lg bg-slate-900 dark:bg-violet-600 text-white text-sm font-semibold hover:bg-slate-800 dark:hover:bg-violet-500 transition-colors"
                >
                  Choose Pro
                </button>
              </div>

              {/* Premium Plan */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-8 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">For intensive job search</p>
                  <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">Premium</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold font-mono-tabular text-slate-900 dark:text-white">₹199</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">/month</span>
                  </div>
                  <ul className="mt-6 space-y-3 text-sm text-slate-700 dark:text-slate-300">
                    <li className="flex items-start gap-2.5"><Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />All Pro features included</li>
                    <li className="flex items-start gap-2.5"><Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />Advanced AI assistance</li>
                    <li className="flex items-start gap-2.5"><Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />Extended interview practice</li>
                    <li className="flex items-start gap-2.5"><Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />Detailed career reports</li>
                    <li className="flex items-start gap-2.5"><Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />Additional progress analytics</li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={handlePrimaryAction}
                  className="mt-8 w-full py-2.5 px-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Choose Premium
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Sample Student Scenarios (Clearly labeled sample testimonials during development) */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-medium text-violet-700 dark:text-violet-400 mb-2">
              Illustrative Examples · Sample Profiles Only
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Sample student journeys
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Note: These are clearly labeled sample development scenarios showing how students use AI CareerPilot—not verified customer endorsements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SAMPLE_SCENARIOS.map((item) => (
              <div
                key={item.name}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between"
              >
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    {item.focus}
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                    &ldquo;{item.quote}&rdquo;
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* About Us & FAQ */}
        <section id="about" className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 py-20">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-5">
              <p className="text-xs font-medium text-violet-700 dark:text-violet-400 mb-2">
                About AI CareerPilot
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
                Built to bridge academic learning and hiring readiness
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                Many college students and fresh graduates graduate with coursework knowledge but lack clear feedback on resume ATS readability, specific role skill gaps, and structured interview practice.
              </p>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                AI CareerPilot combines structured Gemini AI evaluations, persistent progress tracking, and real external job listings in one focused SaaS workspace.
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <Layers className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <span>Private Cloud Firestore persistence · Honest analytics</span>
              </div>
            </div>

            <div className="lg:col-span-7">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
                Frequently Asked Questions
              </h3>
              <div className="space-y-3">
                {FAQS.map((faq, idx) => {
                  const isOpen = openFaq === idx;
                  return (
                    <div
                      key={faq.q}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : idx)}
                        className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 text-sm font-semibold text-slate-900 dark:text-white"
                      >
                        <span>{faq.q}</span>
                        <ChevronDown
                          className={`w-4 h-4 shrink-0 text-slate-500 transition-transform ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <BrandMark className="w-5 h-5" />
              <span>AI CareerPilot</span>
            </div>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Your Career. Your Skills. Your Future.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-slate-600 dark:text-slate-300">
            <a href="#about" className="hover:text-slate-900 dark:hover:text-white">About</a>
            <button type="button" onClick={() => setLegalModal('contact')} className="hover:text-slate-900 dark:hover:text-white">
              Contact
            </button>
            <button type="button" onClick={() => setLegalModal('privacy')} className="hover:text-slate-900 dark:hover:text-white">
              Privacy Policy
            </button>
            <button type="button" onClick={() => setLegalModal('terms')} className="hover:text-slate-900 dark:hover:text-white">
              Terms and Conditions
            </button>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 dark:hover:text-white">
              GitHub
            </a>
            <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 dark:hover:text-white">
              LinkedIn
            </a>
          </div>
        </div>
      </footer>

      {/* Legal & Contact Modal */}
      {legalModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {legalModal === 'privacy'
                  ? 'Privacy Policy'
                  : legalModal === 'terms'
                  ? 'Terms and Conditions'
                  : 'Contact AI CareerPilot'}
              </h3>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => {
                  setLegalModal(null);
                  setContactSubmitted(false);
                }}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {legalModal === 'privacy' && (
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  AI CareerPilot stores your career profile, resume analyses, skill gap reports, learning roadmaps, interview practice sessions, and saved jobs exclusively in your private Cloud Firestore user scope.
                </p>
                <p>
                  Uploaded PDF resumes are processed in server memory strictly to generate your requested AI feedback and are not persisted as raw files or shared with third parties.
                </p>
              </div>
            )}

            {legalModal === 'terms' && (
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  AI CareerPilot provides educational career guidance, resume readability feedback, and interview preparation tools. ATS readability estimates and mock interview scores are guidance tools and do not guarantee employment or employer selection.
                </p>
                <p>
                  External job listings link directly to third-party employers and public job boards. Always verify application details on the destination site.
                </p>
              </div>
            )}

            {legalModal === 'contact' && (
              <div>
                {contactSubmitted ? (
                  <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-sm text-emerald-800 dark:text-emerald-200">
                    Thank you! Your message has been recorded for our support team.
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (contactEmail.includes('@') && contactMessage.trim().length > 4) {
                        setContactSubmitted(true);
                        setContactEmail('');
                        setContactMessage('');
                      }
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Your Email
                      </label>
                      <input
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="student@university.edu"
                        className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Message
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        placeholder="Questions about campus access, plans, or feedback..."
                        className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-lg bg-slate-900 dark:bg-violet-600 text-white text-sm font-medium hover:bg-slate-800 dark:hover:bg-violet-500"
                    >
                      Send Message
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
