import React, { useEffect, useState } from 'react';
import { Compass, Loader2 } from 'lucide-react';
import { useAuth } from './AuthContext';
import { apiPostJson } from '../lib/api';
import { saveCareerAnalysis } from '../lib/firestoreService';
import { CareerAnalysis, ExperienceLevel } from '../types';

interface AdvisorApiResponse {
  recommendedPaths: string[];
  requiredSkills: string[];
  recommendedLanguages: string[];
  opportunities: string[];
  roadmapPreview: string;
  explanation: string;
}

export function CareerAdvisorView() {
  const { user, profile, careerAnalyses } = useAuth();
  const [educationLevel, setEducationLevel] = useState('');
  const [degree, setDegree] = useState('');
  const [branch, setBranch] = useState('');
  const [skillsText, setSkillsText] = useState('');
  const [interestsText, setInterestsText] = useState('');
  const [careerGoals, setCareerGoals] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('Student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<CareerAnalysis | null>(null);

  useEffect(() => {
    if (profile) {
      setEducationLevel((prev) => prev || profile.educationLevel || 'Undergraduate');
      setDegree((prev) => prev || profile.degree || '');
      setBranch((prev) => prev || profile.branch || '');
      setSkillsText((prev) => prev || profile.skills.join(', '));
      setInterestsText((prev) => prev || profile.interests.join(', '));
      setCareerGoals((prev) => prev || profile.careerGoals || '');
      setExperienceLevel(profile.experienceLevel || 'Student');
    }
  }, [profile]);

  useEffect(() => {
    if (!selectedReport && careerAnalyses.length > 0) {
      setSelectedReport(careerAnalyses[0]);
    }
  }, [careerAnalyses, selectedReport]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setLoading(true);

    const skills = skillsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const interests = interestsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const result = await apiPostJson<AdvisorApiResponse>('/api/ai/career-advisor', {
        educationLevel,
        degree,
        branch,
        skills,
        interests,
        careerGoals,
        experienceLevel,
      });

      const summary = `${degree} ${branch ? `(${branch})` : ''} · ${experienceLevel}`;
      const newId = await saveCareerAnalysis(user.uid, {
        targetInputSummary: summary,
        recommendedPaths: result.recommendedPaths || [],
        requiredSkills: result.requiredSkills || [],
        recommendedLanguages: result.recommendedLanguages || [],
        opportunities: result.opportunities || [],
        roadmapPreview: result.roadmapPreview || '',
        explanation: result.explanation || '',
      });

      setSelectedReport({
        id: newId,
        userId: user.uid,
        targetInputSummary: summary,
        ...result,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to run AI Career Advisor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          AI Career Advisor
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          Receive personalized career paths, required technical skills, language recommendations, and tailored explanations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleAnalyze}
          className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
        >
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Your Academic &amp; Skill Profile
          </h2>

          {error && (
            <div className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Educational Qualification
            </label>
            <input
              type="text"
              required
              value={educationLevel}
              onChange={(e) => setEducationLevel(e.target.value)}
              placeholder="e.g., Bachelor's Final Year, Graduate"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Degree
              </label>
              <input
                type="text"
                required
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                placeholder="e.g., B.Tech"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Branch
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="e.g., Computer Science"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Experience Level
            </label>
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <option value="Student">Student</option>
              <option value="Fresh Graduate">Fresh Graduate</option>
              <option value="0-2 Years">0-2 Years</option>
              <option value="2+ Years">2+ Years</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Technical Skills (comma separated)
            </label>
            <input
              type="text"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              placeholder="Python, SQL, HTML/CSS, Git"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Interests (comma separated)
            </label>
            <input
              type="text"
              value={interestsText}
              onChange={(e) => setInterestsText(e.target.value)}
              placeholder="Machine Learning, Backend Systems, Analytics"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Career Goals
            </label>
            <textarea
              rows={3}
              required
              value={careerGoals}
              onChange={(e) => setCareerGoals(e.target.value)}
              placeholder="Describe what kind of engineering, data, or product role you want within 6-12 months..."
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-slate-900 dark:bg-violet-600 text-white text-sm font-medium hover:bg-slate-800 dark:hover:bg-violet-500 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Compass className="w-4 h-4" />}
            {loading ? 'Analyzing Career Profile...' : 'Generate Career Guidance'}
          </button>
        </form>

        <div className="lg:col-span-7 space-y-6">
          {selectedReport ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6">
              <div>
                <p className="text-xs text-violet-700 dark:text-violet-400 font-medium">
                  Personalized Career Guidance · {selectedReport.targetInputSummary}
                </p>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  Recommended Career Paths
                </h2>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedReport.recommendedPaths.map((pathName, idx) => (
                    <div
                      key={pathName}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3.5 text-sm font-semibold text-slate-900 dark:text-white"
                    >
                      0{idx + 1}. {pathName}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                  Personalized Explanation
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {selectedReport.explanation}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                    Required Technical Skills
                  </h3>
                  <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                    {selectedReport.requiredSkills.map((s) => (
                      <li key={s}>· {s}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                    Recommended Languages
                  </h3>
                  <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                    {selectedReport.recommendedLanguages.map((lang) => (
                      <li key={lang}>· {lang}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                  Career Opportunities &amp; Entry Roles
                </h3>
                <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                  {selectedReport.opportunities.map((opp) => (
                    <li key={opp}>· {opp}</li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                  Beginner-to-Advanced Roadmap Overview
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {selectedReport.roadmapPreview}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">
              <Compass className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                No career analysis generated yet
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Fill in your academic details, current skills, and career goals on the left to generate a personalized analysis.
              </p>
            </div>
          )}

          {careerAnalyses.length > 1 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
                Previous Career Analyses ({careerAnalyses.length})
              </h3>
              <div className="space-y-2">
                {careerAnalyses.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedReport(item)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-lg border text-xs transition-colors ${
                      selectedReport?.id === item.id
                        ? 'border-slate-900 dark:border-violet-500 bg-slate-50 dark:bg-slate-800 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {item.targetInputSummary} · {item.recommendedPaths.slice(0, 2).join(', ')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
