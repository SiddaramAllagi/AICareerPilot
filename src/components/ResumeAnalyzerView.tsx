import React, { useEffect, useState } from 'react';
import { FileText, Info, Loader2, Upload } from 'lucide-react';
import { useAuth } from './AuthContext';
import { apiPostFormData } from '../lib/api';
import { saveResumeAnalysis } from '../lib/firestoreService';
import { ResumeAnalysis } from '../types';

interface ResumeApiResponse {
  structureScore: number;
  atsReadabilityScore: number;
  extractedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  improvements: string[];
  professionalSummary: string;
  projectSuggestions: string[];
  atsFeedback: string;
  grammarNotes: string[];
}

export function ResumeAnalyzerView() {
  const { user, profile, resumeAnalyses } = useAuth();
  const [targetRole, setTargetRole] = useState(profile?.targetRole || 'Software Developer');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ResumeAnalysis | null>(null);

  useEffect(() => {
    if (profile?.targetRole) {
      setTargetRole((prev) => prev || profile.targetRole);
    }
  }, [profile]);

  useEffect(() => {
    if (!selectedReport && resumeAnalyses.length > 0) {
      setSelectedReport(resumeAnalyses[0]);
    }
  }, [resumeAnalyses, selectedReport]);

  const handleFileChange = (incoming: File | null) => {
    setError(null);
    if (!incoming) {
      setFile(null);
      return;
    }
    if (incoming.type !== 'application/pdf' && !incoming.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF file (.pdf).');
      return;
    }
    if (incoming.size > 5 * 1024 * 1024) {
      setError('File size must be under 5 MB.');
      return;
    }
    setFile(incoming);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !file) {
      setError('Please select a PDF resume to analyze.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('targetRole', targetRole.trim() || 'Software Developer');

      const result = await apiPostFormData<ResumeApiResponse>('/api/ai/resume-analyzer', formData);
      const id = await saveResumeAnalysis(user.uid, {
        fileName: file.name,
        targetRole: targetRole.trim() || 'Software Developer',
        ...result,
      });

      setSelectedReport({
        id,
        userId: user.uid,
        fileName: file.name,
        targetRole: targetRole.trim() || 'Software Developer',
        ...result,
      });
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze PDF resume.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          AI Resume Analyzer
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          Upload your PDF resume for structure, technical skills, projects, grammar, and ATS readability feedback.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 space-y-5">
          <form
            onSubmit={handleAnalyze}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5"
          >
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Upload Resume (PDF)
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
                placeholder="e.g., Full Stack Developer"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <label className="block cursor-pointer rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-6 text-center hover:border-slate-400 dark:hover:border-slate-500 transition-colors">
              <Upload className="w-6 h-6 text-slate-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {file ? file.name : 'Click to select PDF resume'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {file
                  ? `${(file.size / 1024).toFixed(0)} KB · Ready to analyze`
                  : 'PDF only · Max 5 MB · Validated on server'}
              </p>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>

            <button
              type="submit"
              disabled={loading || !file}
              className="w-full py-2.5 px-4 rounded-lg bg-slate-900 dark:bg-violet-600 text-white text-sm font-medium hover:bg-slate-800 dark:hover:bg-violet-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {loading ? 'Evaluating PDF Resume...' : 'Analyze PDF Resume'}
            </button>

            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3 flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                ATS readability scores measure formatting clarity and role keyword alignment. They do not guarantee employer shortlisting or hiring.
              </span>
            </div>
          </form>

          {resumeAnalyses.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
                Saved Resume Reviews ({resumeAnalyses.length})
              </h3>
              <div className="space-y-2">
                {resumeAnalyses.map((item) => (
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
                    <p className="truncate text-slate-900 dark:text-white">{item.fileName}</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5 font-mono-tabular">
                      {item.targetRole} · ATS {item.atsReadabilityScore}/100
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-8">
          {selectedReport ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-xs text-violet-700 dark:text-violet-400 font-medium">
                    {selectedReport.fileName} · Target: {selectedReport.targetRole}
                  </p>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    Resume Evaluation Report
                  </h2>
                </div>

                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Structure Score</p>
                    <p className="text-2xl font-extrabold font-mono-tabular text-slate-900 dark:text-white">
                      {selectedReport.structureScore}/100
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">ATS Readability</p>
                    <p className="text-2xl font-extrabold font-mono-tabular text-violet-700 dark:text-violet-400">
                      {selectedReport.atsReadabilityScore}/100
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                  Suggested Professional Summary
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
                  {selectedReport.professionalSummary}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                    Detected Technical Skills
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {selectedReport.extractedSkills.length > 0
                      ? selectedReport.extractedSkills.join(' · ')
                      : 'None clearly listed'}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                    Missing Recommended Skills
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
                    {selectedReport.missingSkills.length > 0
                      ? selectedReport.missingSkills.join(' · ')
                      : 'Core skills align well'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                    Resume Strengths
                  </h3>
                  <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    {selectedReport.strengths.map((s) => (
                      <li key={s}>· {s}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                    Priority Improvements
                  </h3>
                  <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    {selectedReport.improvements.map((imp) => (
                      <li key={imp}>· {imp}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                  Project Bullet Improvement Suggestions
                </h3>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  {selectedReport.projectSuggestions.map((proj) => (
                    <li key={proj}>· {proj}</li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                    ATS Compatibility Feedback
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {selectedReport.atsFeedback}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                    Grammar &amp; Clarity Notes
                  </h3>
                  <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                    {selectedReport.grammarNotes.map((g) => (
                      <li key={g}>· {g}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
              <FileText className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Upload a PDF resume to inspect ATS readability
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Your uploaded PDF is parsed securely on the server and evaluated across formatting, skills, projects, and clarity.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
