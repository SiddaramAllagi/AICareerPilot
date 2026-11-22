import React, { useEffect, useState } from 'react';
import { BookOpen, CheckSquare, ExternalLink, Loader2, Square } from 'lucide-react';
import { useAuth } from './AuthContext';
import { apiPostJson } from '../lib/api';
import { saveLearningRoadmap, toggleRoadmapTopic } from '../lib/firestoreService';
import { LearningRoadmap, RoadmapResource, RoadmapTopic } from '../types';

interface RoadmapApiResponse {
  title: string;
  beginnerTopics: RoadmapTopic[];
  intermediateTopics: RoadmapTopic[];
  advancedTopics: RoadmapTopic[];
  weeklyTargets: string[];
  practicalProjects: string[];
  resources: RoadmapResource[];
}

export function LearningRoadmapView() {
  const { user, profile, learningRoadmaps } = useAuth();
  const [targetRole, setTargetRole] = useState(profile?.targetRole || 'Full Stack Developer');
  const [weeklyHours, setWeeklyHours] = useState(12);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.targetRole) {
      setTargetRole((prev) => prev || profile.targetRole);
    }
  }, [profile]);

  const activeRoadmap: LearningRoadmap | null =
    learningRoadmaps.find((r) => r.id === selectedId) || learningRoadmaps[0] || null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setLoading(true);
    try {
      const result = await apiPostJson<RoadmapApiResponse>('/api/ai/learning-roadmap', {
        targetRole: targetRole.trim(),
        currentSkills: profile?.skills || [],
        experienceLevel: profile?.experienceLevel || 'Student',
        weeklyHours,
      });

      const id = await saveLearningRoadmap(user.uid, {
        targetRole: targetRole.trim(),
        title: result.title || `${targetRole.trim()} Roadmap`,
        beginnerTopics: result.beginnerTopics || [],
        intermediateTopics: result.intermediateTopics || [],
        advancedTopics: result.advancedTopics || [],
        weeklyTargets: result.weeklyTargets || [],
        practicalProjects: result.practicalProjects || [],
        resources: result.resources || [],
        completedTopicIds: [],
      });
      setSelectedId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate learning roadmap.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTopic = async (topicId: string) => {
    if (!activeRoadmap) return;
    setTogglingId(topicId);
    try {
      await toggleRoadmapTopic(activeRoadmap, topicId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update topic status.');
    } finally {
      setTogglingId(null);
    }
  };

  const totalTopics = activeRoadmap
    ? activeRoadmap.beginnerTopics.length +
      activeRoadmap.intermediateTopics.length +
      activeRoadmap.advancedTopics.length
    : 0;
  const completedCount = activeRoadmap ? activeRoadmap.completedTopicIds.length : 0;
  const progressPct = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;

  const renderTier = (label: string, topics: RoadmapTopic[]) => (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{label}</h3>
      <div className="space-y-2">
        {topics.map((topic) => {
          const isDone = activeRoadmap?.completedTopicIds.includes(topic.id) || false;
          return (
            <button
              key={topic.id}
              type="button"
              disabled={togglingId === topic.id}
              onClick={() => void handleToggleTopic(topic.id)}
              className={`w-full text-left rounded-lg border p-3.5 transition-colors flex items-start gap-3 ${
                isDone
                  ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              {isDone ? (
                <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-sm font-semibold ${
                      isDone
                        ? 'line-through text-slate-500 dark:text-slate-400'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {topic.title}
                  </span>
                  <span className="text-xs font-mono-tabular text-slate-500 shrink-0">
                    ~{topic.estimatedHours}h
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {topic.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          AI Learning Roadmap
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          Generate beginner-to-advanced study plans with weekly targets, practical projects, and topic completion tracking.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 space-y-5">
          <form
            onSubmit={handleGenerate}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
          >
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Create Personalized Roadmap
            </h2>

            {error && (
              <div className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Target Role
              </label>
              <input
                type="text"
                required
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g., Data Scientist"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Study Hours Per Week: <span className="font-mono-tabular font-semibold">{weeklyHours}h</span>
              </label>
              <input
                type="range"
                min={4}
                max={40}
                value={weeklyHours}
                onChange={(e) => setWeeklyHours(Number(e.target.value))}
                className="w-full accent-slate-900 dark:accent-violet-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-slate-900 dark:bg-violet-600 text-white text-sm font-medium hover:bg-slate-800 dark:hover:bg-violet-500 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
              {loading ? 'Building Roadmap...' : 'Generate Roadmap'}
            </button>
          </form>

          {learningRoadmaps.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
                Saved Roadmaps ({learningRoadmaps.length})
              </h3>
              <div className="space-y-2">
                {learningRoadmaps.map((map) => (
                  <button
                    key={map.id}
                    type="button"
                    onClick={() => setSelectedId(map.id)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-lg border text-xs transition-colors ${
                      activeRoadmap?.id === map.id
                        ? 'border-slate-900 dark:border-violet-500 bg-slate-50 dark:bg-slate-800 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <p className="truncate text-slate-900 dark:text-white">{map.title}</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5 font-mono-tabular">
                      {map.completedTopicIds.length} completed
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-8">
          {activeRoadmap ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-xs font-medium text-violet-700 dark:text-violet-400">
                    {activeRoadmap.targetRole}
                  </p>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                    {activeRoadmap.title}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Completion Progress</p>
                  <p className="text-2xl font-extrabold font-mono-tabular text-slate-900 dark:text-white">
                    {progressPct}% ({completedCount}/{totalTopics})
                  </p>
                </div>
              </div>

              <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  style={{ width: `${progressPct}%` }}
                  className="h-full bg-emerald-600 dark:bg-violet-500 transition-all"
                />
              </div>

              {renderTier('01. Beginner Foundation', activeRoadmap.beginnerTopics)}
              {renderTier('02. Intermediate Application', activeRoadmap.intermediateTopics)}
              {renderTier('03. Advanced Mastery', activeRoadmap.advancedTopics)}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                    Weekly Learning Targets
                  </h3>
                  <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                    {activeRoadmap.weeklyTargets.map((w) => (
                      <li key={w}>· {w}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                    Practical Portfolio Projects
                  </h3>
                  <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                    {activeRoadmap.practicalProjects.map((p) => (
                      <li key={p}>· {p}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                  Recommended Resources
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeRoadmap.resources.map((resItem) => (
                    <a
                      key={resItem.title}
                      href={resItem.url.startsWith('https://') ? resItem.url : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {resItem.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {resItem.provider}
                        </p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
              <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                No learning roadmap created yet
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Enter your target role and weekly study availability to generate a structured, trackable curriculum.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
