import React, { useEffect, useState } from 'react';
import { ArrowRight, Loader2, Target } from 'lucide-react';
import { useAuth } from './AuthContext';
import { apiPostJson } from '../lib/api';
import { saveSkillGapReport } from '../lib/firestoreService';
import { DashboardSection, MissingSkillItem, SkillGapReport } from '../types';

const PRESET_ROLES = [
  'Data Analyst',
  'Data Scientist',
  'AI Engineer',
  'Software Developer',
  'Full Stack Developer',
  'Machine Learning Engineer',
];

interface SkillGapApiResponse {
  existingSkills: string[];
  missingSkills: MissingSkillItem[];
  matchPercentage: number;
  recommendations: string[];
}

export function SkillGapView({ onNavigate }: { onNavigate: (section: DashboardSection) => void }) {
  const { user, profile, skillGapReports } = useAuth();
  const [targetRole, setTargetRole] = useState(profile?.targetRole || 'Software Developer');
  const [skillsText, setSkillsText] = useState(profile?.skills?.join(', ') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<SkillGapReport | null>(null);

  useEffect(() => {
    if (profile) {
      setTargetRole((prev) => prev || profile.targetRole || 'Software Developer');
      setSkillsText((prev) => prev || profile.skills.join(', '));
    }
  }, [profile]);

  useEffect(() => {
    if (!selectedReport && skillGapReports.length > 0) {
      setSelectedReport(skillGapReports[0]);
    }
  }, [skillGapReports, selectedReport]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setLoading(true);

    const existingSkills = skillsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const result = await apiPostJson<SkillGapApiResponse>('/api/ai/skill-gap', {
        targetRole: targetRole.trim(),
        existingSkills,
      });

      const id = await saveSkillGapReport(user.uid, {
        targetRole: targetRole.trim(),
        ...result,
      });

      setSelectedReport({
        id,
        userId: user.uid,
        targetRole: targetRole.trim(),
        ...result,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to run Skill Gap analysis.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Skill Gap Analyzer
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          Compare your current skills against industry expectations for your target role.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleAnalyze}
          className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5"
        >
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Benchmark Configuration
          </h2>

          {error && (
            <div className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
              Quick Role Presets
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setTargetRole(role)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    targetRole === role
                      ? 'bg-slate-900 dark:bg-violet-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Target Job Role
            </label>
            <input
              type="text"
              required
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g., AI Engineer"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Your Current Skills (comma separated)
            </label>
            <textarea
              rows={4}
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              placeholder="Python, SQL, Pandas, React, Git"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-slate-900 dark:bg-violet-600 text-white text-sm font-medium hover:bg-slate-800 dark:hover:bg-violet-500 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
            {loading ? 'Comparing Skills...' : 'Analyze Skill Gaps'}
          </button>
        </form>

        <div className="lg:col-span-8 space-y-6">
          {selectedReport ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-xs text-violet-700 dark:text-violet-400 font-medium">
                    Target Benchmark
                  </p>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                    {selectedReport.targetRole}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Skill Match Coverage</p>
                  <p className="text-3xl font-extrabold font-mono-tabular text-slate-900 dark:text-white">
                    {selectedReport.matchPercentage}%
                  </p>
                </div>
              </div>

              {/* Coverage Bar */}
              <div>
                <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    style={{ width: `${selectedReport.matchPercentage}%` }}
                    className="h-full bg-slate-900 dark:bg-violet-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                  Matching Existing Skills
                </h3>
                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                  {selectedReport.existingSkills.length > 0
                    ? selectedReport.existingSkills.join(' · ')
                    : 'No direct matching skills listed yet'}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
                  Missing Skills &amp; Priority Matrix
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                        <th className="py-2 pr-4 font-medium">Skill</th>
                        <th className="py-2 pr-4 font-medium">Priority</th>
                        <th className="py-2 font-medium">Why It Matters &amp; Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedReport.missingSkills.map((item) => (
                        <tr key={item.skill}>
                          <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-white align-top whitespace-nowrap">
                            {item.skill}
                          </td>
                          <td className="py-3 pr-4 align-top whitespace-nowrap">
                            <span
                              className={`text-xs font-semibold ${
                                item.priority === 'High'
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : item.priority === 'Medium'
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {item.priority}
                            </span>
                          </td>
                          <td className="py-3 text-slate-600 dark:text-slate-300 align-top">
                            <p>{item.reason}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Next step: {item.recommendation}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                    Key Recommendations
                  </h3>
                  <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    {selectedReport.recommendations.slice(0, 3).map((rec) => (
                      <li key={rec}>· {rec}</li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('roadmap')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 dark:bg-violet-600 text-white text-xs font-medium shrink-0"
                >
                  Build Learning Roadmap
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
              <Target className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Select a role to benchmark your skills
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Compare your existing toolkit against role expectations and uncover high-priority learning gaps.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
