import React, { useMemo } from 'react';
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Compass,
  FileText,
  MessageSquare,
  Target,
  UserCheck,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { DashboardSection } from '../types';

interface OverviewDashboardProps {
  onNavigate: (section: DashboardSection) => void;
}

function toDateObj(ts: unknown): Date | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts === 'object' && ts !== null && 'toDate' in ts && typeof (ts as { toDate: () => Date }).toDate === 'function') {
    return (ts as { toDate: () => Date }).toDate();
  }
  if (typeof ts === 'string' || typeof ts === 'number') {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function OverviewDashboard({ onNavigate }: OverviewDashboardProps) {
  const {
    profile,
    careerAnalyses,
    resumeAnalyses,
    skillGapReports,
    learningRoadmaps,
    interviewSessions,
    savedJobs,
    activities,
  } = useAuth();

  const latestResume = resumeAnalyses[0] || null;
  const latestCareer = careerAnalyses[0] || null;
  const latestSkillGap = skillGapReports[0] || null;
  const activeRoadmap = learningRoadmaps[0] || null;
  const latestInterview = interviewSessions[0] || null;

  const profileCompleteness = useMemo(() => {
    if (!profile) return 0;
    const checks = [
      Boolean(profile.displayName),
      Boolean(profile.educationLevel),
      Boolean(profile.degree),
      Boolean(profile.targetRole),
      profile.skills.length > 0,
      Boolean(profile.careerGoals),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [profile]);

  const roadmapProgress = useMemo(() => {
    if (!activeRoadmap) return 0;
    const total =
      activeRoadmap.beginnerTopics.length +
      activeRoadmap.intermediateTopics.length +
      activeRoadmap.advancedTopics.length;
    if (total === 0) return 0;
    return Math.round((activeRoadmap.completedTopicIds.length / total) * 100);
  }, [activeRoadmap]);

  // Transparent Career Readiness Score computed exclusively from actual user records
  const readinessBreakdown = useMemo(() => {
    const profilePart = Math.round(profileCompleteness * 0.2);
    const resumePart = latestResume
      ? Math.round(((latestResume.structureScore + latestResume.atsReadabilityScore) / 2) * 0.25)
      : 0;
    const skillPart = latestSkillGap ? Math.round(latestSkillGap.matchPercentage * 0.2) : 0;
    const roadmapPart = Math.round(roadmapProgress * 0.2);
    const interviewPart = latestInterview ? Math.round(latestInterview.averageScore * 0.15) : 0;
    const total = profilePart + resumePart + skillPart + roadmapPart + interviewPart;
    return {
      total,
      profilePart,
      resumePart,
      skillPart,
      roadmapPart,
      interviewPart,
    };
  }, [profileCompleteness, latestResume, latestSkillGap, roadmapProgress, latestInterview]);

  // Real 7-day activity counts computed from Firestore activities timestamps
  const weeklyChart = useMemo(() => {
    const days: { label: string; dateKey: string; count: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      days.push({ label, dateKey: key, count: 0 });
    }
    for (const act of activities) {
      const d = toDateObj(act.createdAt);
      if (!d) continue;
      const key = d.toISOString().slice(0, 10);
      const bucket = days.find((b) => b.dateKey === key);
      if (bucket) bucket.count += 1;
    }
    const maxCount = Math.max(1, ...days.map((d) => d.count));
    return { days, maxCount };
  }, [activities]);

  const quickTools: Array<{
    section: DashboardSection;
    title: string;
    desc: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { section: 'advisor', title: 'AI Career Advisor', desc: 'Get personalized career paths', icon: Compass },
    { section: 'resume', title: 'AI Resume Analyzer', desc: 'Upload PDF for ATS review', icon: FileText },
    { section: 'skills', title: 'Skill Gap Analyzer', desc: 'Benchmark against target roles', icon: Target },
    { section: 'roadmap', title: 'Learning Roadmap', desc: 'Track weekly study milestones', icon: BookOpen },
    { section: 'interview', title: 'Interview Prep', desc: 'Practice & score mock answers', icon: MessageSquare },
    { section: 'jobs', title: 'Jobs & Internships', desc: 'Browse verified live listings', icon: Briefcase },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <p className="text-xs font-medium text-violet-700 dark:text-violet-400 mb-1">
            Personal Career Workspace · {profile?.plan?.toUpperCase() || 'FREE'} Plan
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome back, {profile?.displayName || 'Student'}
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
            Target Role: <strong className="text-slate-900 dark:text-white">{profile?.targetRole || 'Not set yet'}</strong> · Experience: {profile?.experienceLevel || 'Student'} · Profile Completeness: <span className="font-mono-tabular font-semibold">{profileCompleteness}%</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <UserCheck className="w-4 h-4" />
            Update Profile
          </button>
          <button
            type="button"
            onClick={() => onNavigate('resume')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 dark:bg-violet-600 text-white text-sm font-medium hover:bg-slate-800 dark:hover:bg-violet-500 transition-colors"
          >
            Analyze Resume
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (Strictly computed from user's saved data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Career Readiness Score</p>
          <p className="mt-2 text-3xl font-extrabold font-mono-tabular text-slate-900 dark:text-white">
            {readinessBreakdown.total}<span className="text-base font-medium text-slate-400">/100</span>
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Computed from profile, resume, skill gap, roadmap &amp; interview records
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Resume Analysis Status</p>
          <p className="mt-2 text-3xl font-extrabold font-mono-tabular text-slate-900 dark:text-white">
            {latestResume ? `${latestResume.atsReadabilityScore}/100` : 'Pending'}
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 truncate">
            {latestResume ? `Latest: ${latestResume.fileName}` : 'Upload a PDF to evaluate readability'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Roadmap Progress</p>
          <p className="mt-2 text-3xl font-extrabold font-mono-tabular text-slate-900 dark:text-white">
            {roadmapProgress}%
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 truncate">
            {activeRoadmap
              ? `${activeRoadmap.completedTopicIds.length} topics completed in ${activeRoadmap.targetRole}`
              : 'No roadmap generated yet'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Saved Opportunities</p>
          <p className="mt-2 text-3xl font-extrabold font-mono-tabular text-slate-900 dark:text-white">
            {savedJobs.length}
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {interviewSessions.length} interview sessions completed
          </p>
        </div>
      </div>

      {/* Middle Row: Weekly Progress Chart & Recommended Paths */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Weekly Activity Progress
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real logged actions across your career tools over the past 7 days
              </p>
            </div>
            <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
              {activities.length} total logs
            </span>
          </div>

          <div className="h-44 flex items-end justify-between gap-3 pt-4">
            {weeklyChart.days.map((day) => {
              const heightPct = Math.round((day.count / weeklyChart.maxCount) * 100);
              return (
                <div key={day.dateKey} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
                    {day.count}
                  </span>
                  <div className="w-full max-w-[40px] h-28 bg-slate-100 dark:bg-slate-800 rounded-md flex items-end overflow-hidden">
                    <div
                      style={{ height: `${day.count === 0 ? 4 : Math.max(14, heightPct)}%` }}
                      className={`w-full rounded-t-md transition-all ${
                        day.count > 0
                          ? 'bg-slate-900 dark:bg-violet-500'
                          : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    />
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{day.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Recommended Career Paths
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('advisor')}
                className="text-xs font-semibold text-violet-700 dark:text-violet-400 hover:underline"
              >
                Open Advisor
              </button>
            </div>

            {latestCareer ? (
              <div className="space-y-3">
                {latestCareer.recommendedPaths.slice(0, 4).map((pathTitle, idx) => (
                  <div
                    key={pathTitle}
                    className="py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0 flex items-center justify-between gap-3"
                  >
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      0{idx + 1}. {pathTitle}
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigate('roadmap')}
                      className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white shrink-0"
                    >
                      Roadmap
                    </button>
                  </div>
                ))}
                <p className="text-xs text-slate-500 dark:text-slate-400 pt-2">
                  Key Languages: {latestCareer.recommendedLanguages.slice(0, 4).join(' · ')}
                </p>
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                  Run the AI Career Advisor to receive personalized career path recommendations tailored to your degree and skills.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('advisor')}
                  className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-violet-600 text-white text-xs font-medium"
                >
                  Run Career Advisor
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Access AI Tools + Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
            Quick Access to AI Tools
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.section}
                  type="button"
                  onClick={() => onNavigate(tool.section)}
                  className="text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{tool.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{tool.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
            Recent Activity
          </h2>
          {activities.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              No recorded activities yet. Complete your profile or run your first AI analysis to begin tracking progress.
            </div>
          ) : (
            <div className="space-y-3">
              {activities.slice(0, 6).map((act) => {
                const d = toDateObj(act.createdAt);
                return (
                  <div
                    key={act.id}
                    className="pb-3 border-b border-slate-100 dark:border-slate-800 last:border-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {act.title}
                      </p>
                      <span className="text-xs font-mono-tabular text-slate-400 shrink-0">
                        {d ? d.toLocaleDateString() : 'Just now'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {act.detail}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
