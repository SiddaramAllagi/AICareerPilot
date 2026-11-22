import React, { useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, Loader2, MessageSquare, Send } from 'lucide-react';
import { useAuth } from './AuthContext';
import { apiPostJson } from '../lib/api';
import { saveInterviewSession } from '../lib/firestoreService';
import { InterviewQuestionItem } from '../types';

interface GenerateApiResp {
  questions: Array<{
    id: string;
    category: 'Technical' | 'HR';
    question: string;
    idealAnswer: string;
    explanation: string;
  }>;
}

interface EvaluateApiResp {
  score: number;
  feedback: string;
  improvedAnswer: string;
  improvementSuggestions: string[];
}

export function InterviewPrepView() {
  const { user, profile, interviewSessions } = useAuth();
  const [role, setRole] = useState(profile?.targetRole || 'Software Developer');
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [questionType, setQuestionType] = useState<'Mixed' | 'Technical' | 'HR'>('Mixed');
  const [mode, setMode] = useState<'Practice Q&A' | 'Mock Interview'>('Practice Q&A');
  const [questions, setQuestions] = useState<InterviewQuestionItem[]>([]);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.targetRole) {
      setRole((prev) => prev || profile.targetRole);
    }
  }, [profile]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setSessionSaved(false);
    try {
      const resp = await apiPostJson<GenerateApiResp>('/api/ai/interview-generate', {
        role: role.trim(),
        difficulty,
        questionType,
        count: mode === 'Mock Interview' ? 4 : 5,
      });
      setQuestions(resp.questions || []);
      setExpandedIds([]);
      setActiveIndex(0);
      setCurrentAnswer('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate interview questions.');
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluateAnswer = async () => {
    const activeQ = questions[activeIndex];
    if (!activeQ || !currentAnswer.trim()) {
      setError('Please write your response before submitting for evaluation.');
      return;
    }
    setError(null);
    setEvaluating(true);
    try {
      const evalResp = await apiPostJson<EvaluateApiResp>('/api/ai/interview-evaluate', {
        role: role.trim(),
        difficulty,
        question: activeQ.question,
        userAnswer: currentAnswer.trim(),
      });
      const updated = questions.map((item, idx) =>
        idx === activeIndex
          ? {
              ...item,
              userAnswer: currentAnswer.trim(),
              score: evalResp.score,
              feedback: evalResp.feedback,
              idealAnswer: evalResp.improvedAnswer || item.idealAnswer,
              improvementSuggestions: evalResp.improvementSuggestions || [],
            }
          : item
      );
      setQuestions(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to evaluate answer.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleSaveSession = async () => {
    if (!user || questions.length === 0) return;
    setSavingSession(true);
    setError(null);
    const scored = questions.filter((q) => typeof q.score === 'number');
    const avg =
      scored.length > 0
        ? Math.round(scored.reduce((acc, q) => acc + (q.score || 0), 0) / scored.length)
        : 0;
    try {
      await saveInterviewSession(user.uid, {
        role: role.trim(),
        difficulty,
        mode,
        questionCount: questions.length,
        averageScore: avg,
        summaryFeedback:
          scored.length > 0
            ? `Completed ${scored.length}/${questions.length} evaluated answers with an average score of ${avg}/100.`
            : `Reviewed ${questions.length} practice questions for ${role.trim()}.`,
        questions,
      });
      setSessionSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save session.');
    } finally {
      setSavingSession(false);
    }
  };

  const activeQuestion = questions[activeIndex];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          AI Interview Preparation
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          Generate role-specific Technical &amp; HR questions, study model explanations, and evaluate mock interview responses.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 space-y-5">
          <form
            onSubmit={handleGenerate}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
          >
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Session Setup
            </h2>

            {error && (
              <div className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Mode
              </label>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                {(['Practice Q&A', 'Mock Interview'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`py-2 px-2.5 text-xs font-medium rounded-md transition-colors ${
                      mode === m
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Job Role
              </label>
              <input
                type="text"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g., Backend Developer"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as 'Beginner' | 'Intermediate' | 'Advanced')}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Category
                </label>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value as 'Mixed' | 'Technical' | 'HR')}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="Mixed">Mixed</option>
                  <option value="Technical">Technical</option>
                  <option value="HR">HR</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-slate-900 dark:bg-violet-600 text-white text-sm font-medium hover:bg-slate-800 dark:hover:bg-violet-500 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
              {loading ? 'Preparing Questions...' : 'Start Session'}
            </button>
          </form>

          {interviewSessions.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
                Completed Sessions ({interviewSessions.length})
              </h3>
              <div className="space-y-2">
                {interviewSessions.slice(0, 5).map((sess) => (
                  <div
                    key={sess.id}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 text-xs"
                  >
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {sess.role} · {sess.difficulty}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5 font-mono-tabular">
                      {sess.mode} · Avg: {sess.averageScore}/100
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-8">
          {questions.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
              <MessageSquare className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Configure a role and start practicing
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Use Practice Q&amp;A to review Technical and HR answers, or Mock Interview to write and score your own responses.
              </p>
            </div>
          ) : mode === 'Practice Q&A' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {role} · {difficulty} Questions
                </h2>
                <button
                  type="button"
                  disabled={savingSession || sessionSaved}
                  onClick={() => void handleSaveSession()}
                  className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
                >
                  {sessionSaved ? 'Saved to History' : savingSession ? 'Saving...' : 'Save Session'}
                </button>
              </div>

              {questions.map((q, idx) => {
                const isOpen = expandedIds.includes(q.id);
                return (
                  <div
                    key={q.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedIds((prev) =>
                          prev.includes(q.id) ? prev.filter((id) => id !== q.id) : [...prev, q.id]
                        )
                      }
                      className="w-full text-left flex items-start justify-between gap-4"
                    >
                      <div>
                        <span className="text-xs font-mono-tabular text-violet-700 dark:text-violet-400">
                          0{idx + 1} · {q.category}
                        </span>
                        <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white mt-1">
                          {q.question}
                        </h3>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 shrink-0 text-slate-400 mt-1 transition-transform ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3 text-sm">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            Model Answer
                          </p>
                          <p className="text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                            {q.idealAnswer}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            Interviewer Rationale
                          </p>
                          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                            {q.explanation}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Mock Interview Interactive Runner */
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  {questions.map((q, idx) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        setActiveIndex(idx);
                        setCurrentAnswer(questions[idx]?.userAnswer || '');
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs font-mono-tabular font-medium transition-colors ${
                        activeIndex === idx
                          ? 'bg-slate-900 dark:bg-violet-600 text-white'
                          : typeof q.score === 'number'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Q{idx + 1}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={savingSession || sessionSaved}
                  onClick={() => void handleSaveSession()}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 inline-flex items-center gap-1.5"
                >
                  {sessionSaved && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  {sessionSaved ? 'Session Saved' : savingSession ? 'Saving...' : 'Save Mock Session'}
                </button>
              </div>

              {activeQuestion && (
                <div className="space-y-5">
                  <div>
                    <p className="text-xs font-mono-tabular text-violet-700 dark:text-violet-400">
                      Question {activeIndex + 1} of {questions.length} · {activeQuestion.category}
                    </p>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1.5">
                      {activeQuestion.question}
                    </h2>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Your Answer
                    </label>
                    <textarea
                      rows={5}
                      value={currentAnswer}
                      onChange={(e) => setCurrentAnswer(e.target.value)}
                      placeholder="Write a clear, structured answer using concrete examples or technical specifics..."
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={evaluating}
                    onClick={() => void handleEvaluateAnswer()}
                    className="px-5 py-2.5 rounded-lg bg-slate-900 dark:bg-violet-600 text-white text-sm font-medium hover:bg-slate-800 dark:hover:bg-violet-500 transition-colors disabled:opacity-60 inline-flex items-center gap-2"
                  >
                    {evaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {evaluating ? 'Evaluating Answer...' : 'Submit for AI Evaluation'}
                  </button>

                  {typeof activeQuestion.score === 'number' && (
                    <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          Evaluation Feedback
                        </h3>
                        <span className="text-lg font-extrabold font-mono-tabular text-violet-700 dark:text-violet-400">
                          {activeQuestion.score}/100
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {activeQuestion.feedback}
                      </p>
                      {activeQuestion.improvementSuggestions && activeQuestion.improvementSuggestions.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            Improvement Suggestions
                          </p>
                          <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                            {activeQuestion.improvementSuggestions.map((s) => (
                              <li key={s}>· {s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Stronger Model Phrasing
                        </p>
                        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3.5 border border-slate-200 dark:border-slate-800">
                          {activeQuestion.idealAnswer}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
