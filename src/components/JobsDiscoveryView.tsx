import React, { useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck, Briefcase, ExternalLink, Loader2, Search } from 'lucide-react';
import { useAuth } from './AuthContext';
import { apiGet } from '../lib/api';
import { removeSavedJob, saveJobOpportunity } from '../lib/firestoreService';
import { JobListing } from '../types';

interface JobsApiResponse {
  jobs: JobListing[];
  totalAvailable: number;
  sources: string[];
}

export function JobsDiscoveryView() {
  const { user, savedJobs } = useAuth();
  const [tab, setTab] = useState<'browse' | 'saved'>('browse');
  const [queryText, setQueryText] = useState('');
  const [locationText, setLocationText] = useState('');
  const [category, setCategory] = useState<'All' | 'Internship' | 'Full-Time'>('All');
  const [experience, setExperience] = useState<'All' | 'Internship' | 'Entry Level' | 'Mid / Open'>('All');
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);

  const loadJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (queryText.trim()) params.set('q', queryText.trim());
      if (locationText.trim()) params.set('location', locationText.trim());
      if (category !== 'All') params.set('category', category);
      if (experience !== 'All') params.set('experience', experience);

      const data = await apiGet<JobsApiResponse>(`/api/jobs?${params.toString()}`);
      setJobs(data.jobs || []);
      setSources(data.sources || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch job listings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadJobs();
  }, [category, experience]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void loadJobs();
  };

  const handleToggleSave = async (job: JobListing) => {
    if (!user) return;
    setBusyJobId(job.externalId);
    try {
      const existing = savedJobs.find((s) => s.externalId === job.externalId);
      if (existing) {
        await removeSavedJob(existing.id);
      } else {
        await saveJobOpportunity(user.uid, job);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update saved opportunity.');
    } finally {
      setBusyJobId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Internship &amp; Job Discovery
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Verified live listings from {sources.length > 0 ? sources.join(' & ') : 'public job boards'}. Apply directly on employer portals.
          </p>
        </div>

        <div className="inline-flex p-1 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setTab('browse')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === 'browse'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Live Listings ({jobs.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('saved')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === 'saved'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Saved ({savedJobs.length})
          </button>
        </div>
      </div>

      {tab === 'browse' && (
        <form
          onSubmit={handleSearch}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end"
        >
          <div className="lg:col-span-4">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Role or Keyword
            </label>
            <input
              type="text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="e.g., Software, Python, Analyst"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <div className="lg:col-span-3">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Location
            </label>
            <input
              type="text"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              placeholder="e.g., Remote, USA, Europe"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as 'All' | 'Internship' | 'Full-Time')}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <option value="All">All Types</option>
              <option value="Internship">Internship</option>
              <option value="Full-Time">Full-Time</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Experience
            </label>
            <select
              value={experience}
              onChange={(e) =>
                setExperience(e.target.value as 'All' | 'Internship' | 'Entry Level' | 'Mid / Open')
              }
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <option value="All">All Levels</option>
              <option value="Internship">Internship</option>
              <option value="Entry Level">Entry Level</option>
              <option value="Mid / Open">Mid / Open</option>
            </select>
          </div>

          <div className="lg:col-span-1">
            <button
              type="submit"
              className="w-full py-2 px-3 rounded-lg bg-slate-900 dark:bg-violet-600 text-white text-sm font-medium hover:bg-slate-800 dark:hover:bg-violet-500 flex items-center justify-center"
              aria-label="Search jobs"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-4 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {tab === 'browse' ? (
        loading ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-500 mx-auto mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Loading live verified job &amp; internship listings...
            </p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
            <Briefcase className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              No matching opportunities found
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Try broadening your keyword, location, or category filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {jobs.map((job) => {
              const isSaved = savedJobs.some((s) => s.externalId === job.externalId);
              return (
                <div
                  key={job.externalId}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {job.category} · {job.experienceLevel} · {job.source}
                      </p>
                      <span className="text-xs font-mono-tabular text-slate-400 shrink-0">
                        {job.postedAt}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                      {job.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                      {job.company} · {job.location}
                    </p>
                    {job.tags.length > 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 truncate">
                        {job.tags.join(' · ')}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      disabled={busyJobId === job.externalId}
                      onClick={() => void handleToggleSave(job)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    >
                      {isSaved ? (
                        <BookmarkCheck className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                      ) : (
                        <Bookmark className="w-4 h-4" />
                      )}
                      {isSaved ? 'Saved' : 'Save Opportunity'}
                    </button>

                    <a
                      href={job.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-violet-600 text-white text-xs font-medium hover:bg-slate-800 dark:hover:bg-violet-500 transition-colors"
                    >
                      Apply Externally
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : savedJobs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
          <Bookmark className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            No saved opportunities yet
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Bookmark listings from the Live Listings tab to organize your applications.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedJobs.map((saved) => (
            <div
              key={saved.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between gap-4"
            >
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {saved.category} · {saved.experienceLevel} · {saved.source}
                </p>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                  {saved.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                  {saved.company} · {saved.location}
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => void removeSavedJob(saved.id)}
                  className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline"
                >
                  Remove
                </button>
                <a
                  href={saved.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-violet-600 text-white text-xs font-medium"
                >
                  Apply Externally
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
