import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { GoogleGenAI, Type } from '@google/genai';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';

// Load Firebase projectId safely from provisioned config
const firebaseConfigPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
let firebaseProjectId = '';
if (fs.existsSync(firebaseConfigPath)) {
  try {
    const rawConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    if (typeof rawConfig.projectId === 'string' && rawConfig.projectId !== 'remixed-project-id') {
      firebaseProjectId = rawConfig.projectId;
    }
  } catch (err) {
    console.error('Failed to parse firebase-applet-config.json:', err);
  }
}

const adminApp = firebaseProjectId
  ? getApps().length > 0
    ? getApp()
    : initializeApp({ projectId: firebaseProjectId })
  : null;

interface AuthenticatedRequest extends Request {
  user?: DecodedIdToken;
}

const PORT = Number(process.env.PORT || 3000);
const AI_MODEL = 'gemini-4-hydrogen';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function handleAiError(res: Response, err: unknown, context: string) {
  const message = err instanceof Error ? err.message : String(err);
  if (message === 'GEMINI_API_KEY_MISSING') {
    return res.status(503).json({
      error: 'Gemini API key is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets to enable live AI analysis.',
    });
  }
  if (message.includes('PERMISSION_DENIED') || message.includes('API_KEY_INVALID') || message.includes('403') || message.includes('400')) {
    return res.status(502).json({
      error: `AI service rejected the credentials while running ${context}. Please verify GEMINI_API_KEY in Settings > Secrets.`,
    });
  }
  if (message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
    return res.status(429).json({
      error: 'AI quota temporarily reached. Please wait a moment and try again.',
    });
  }
  console.error(`AI error in ${context}:`, err);
  return res.status(500).json({
    error: `Failed to complete ${context}. Please review your inputs and try again.`,
  });
}

// Authentication middleware (verifies Firebase ID token without requiring IAM)
async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!adminApp) {
    return res.status(503).json({ error: 'Firebase authentication is not configured on the server.' });
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please sign in to continue.' });
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token || token.length > 8192) {
    return res.status(401).json({ error: 'Invalid authentication token.' });
  }
  try {
    const decoded = await getAuth(adminApp).verifyIdToken(token);
    if (!decoded.email_verified) {
      return res.status(403).json({ error: 'Please verify your email address before using AI workspace tools.' });
    }
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }
}

// Sliding-window rate limiter for AI endpoints
const rateLimitStore = new Map<string, number[]>();
const RATE_WINDOW_MS = 10 * 60 * 1000;
const MAX_AI_REQUESTS_PER_WINDOW = 25;

function aiRateLimiter(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const key = req.user?.uid || req.ip || 'anonymous';
  const now = Date.now();
  const timestamps = (rateLimitStore.get(key) || []).filter((ts) => now - ts < RATE_WINDOW_MS);
  if (timestamps.length >= MAX_AI_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      error: 'Rate limit reached (25 AI requests per 10 minutes). Please wait briefly before running another analysis.',
    });
  }
  timestamps.push(now);
  rateLimitStore.set(key, timestamps);
  return next();
}

// Bounded string sanitization helpers
function cleanString(input: unknown, maxLen: number): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, maxLen);
}

function cleanStringArray(input: unknown, maxItems: number, maxItemLen: number): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, maxItemLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

function parseJsonSafe<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// Secure PDF upload handler (in-memory only, 5 MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf' && !file.originalname.toLowerCase().endsWith('.pdf')) {
      return cb(new Error('INVALID_FILE_TYPE'));
    }
    cb(null, true);
  },
});

// Cached legitimate job feeds (Remotive & Arbeitnow)
interface CachedJobRecord {
  externalId: string;
  title: string;
  company: string;
  location: string;
  category: 'Internship' | 'Full-Time';
  experienceLevel: string;
  applyUrl: string;
  source: string;
  postedAt: string;
  tags: string[];
}

let cachedJobs: { fetchedAt: number; items: CachedJobRecord[] } | null = null;
const JOB_CACHE_TTL_MS = 10 * 60 * 1000;

function isSafeHttpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

async function fetchExternalJobs(): Promise<CachedJobRecord[]> {
  if (cachedJobs && Date.now() - cachedJobs.fetchedAt < JOB_CACHE_TTL_MS) {
    return cachedJobs.items;
  }

  const results: CachedJobRecord[] = [];

  const [remotiveRes, arbeitnowRes] = await Promise.allSettled([
    fetch('https://remotive.com/api/remote-jobs?limit=40', {
      headers: { Accept: 'application/json', 'User-Agent': 'AI-CareerPilot/1.0' },
      signal: AbortSignal.timeout(8000),
    }),
    fetch('https://www.arbeitnow.com/api/job-board-api', {
      headers: { Accept: 'application/json', 'User-Agent': 'AI-CareerPilot/1.0' },
      signal: AbortSignal.timeout(8000),
    }),
  ]);

  if (remotiveRes.status === 'fulfilled' && remotiveRes.value.ok) {
    const data = (await remotiveRes.value.json()) as {
      jobs?: Array<{
        id: number;
        title: string;
        company_name: string;
        candidate_required_location?: string;
        job_type?: string;
        url: string;
        publication_date?: string;
        tags?: string[];
      }>;
    };
    for (const job of (data.jobs || []).slice(0, 35)) {
      if (!isSafeHttpsUrl(job.url)) continue;
      const lowerTitle = (job.title || '').toLowerCase();
      const lowerType = (job.job_type || '').toLowerCase();
      const isIntern = lowerTitle.includes('intern') || lowerType.includes('intern');
      const isEntry =
        isIntern ||
        lowerTitle.includes('junior') ||
        lowerTitle.includes('entry') ||
        lowerTitle.includes('graduate') ||
        lowerTitle.includes('associate');

      results.push({
        externalId: `remotive-${job.id}`,
        title: cleanString(job.title, 180),
        company: cleanString(job.company_name, 140),
        location: cleanString(job.candidate_required_location || 'Remote', 140),
        category: isIntern ? 'Internship' : 'Full-Time',
        experienceLevel: isIntern ? 'Internship' : isEntry ? 'Entry Level' : 'Mid / Open',
        applyUrl: job.url,
        source: 'Remotive',
        postedAt: cleanString(job.publication_date?.slice(0, 10) || 'Recent', 40),
        tags: cleanStringArray(job.tags || [], 6, 40),
      });
    }
  }

  if (arbeitnowRes.status === 'fulfilled' && arbeitnowRes.value.ok) {
    const data = (await arbeitnowRes.value.json()) as {
      data?: Array<{
        slug: string;
        title: string;
        company_name: string;
        location?: string;
        remote?: boolean;
        job_types?: string[];
        url: string;
        created_at?: number;
        tags?: string[];
      }>;
    };
    for (const job of (data.data || []).slice(0, 35)) {
      if (!isSafeHttpsUrl(job.url)) continue;
      const lowerTitle = (job.title || '').toLowerCase();
      const typesJoined = (job.job_types || []).join(' ').toLowerCase();
      const isIntern = lowerTitle.includes('intern') || lowerTitle.includes('werkstudent') || typesJoined.includes('intern');
      const isEntry =
        isIntern ||
        lowerTitle.includes('junior') ||
        lowerTitle.includes('entry') ||
        lowerTitle.includes('graduate');

      const postedDate = job.created_at
        ? new Date(job.created_at * 1000).toISOString().slice(0, 10)
        : 'Recent';

      results.push({
        externalId: `arbeitnow-${cleanString(job.slug, 120)}`,
        title: cleanString(job.title, 180),
        company: cleanString(job.company_name, 140),
        location: cleanString(job.remote ? `${job.location || 'Europe'} (Remote)` : job.location || 'Remote', 140),
        category: isIntern ? 'Internship' : 'Full-Time',
        experienceLevel: isIntern ? 'Internship' : isEntry ? 'Entry Level' : 'Mid / Open',
        applyUrl: job.url,
        source: 'Arbeitnow',
        postedAt: postedDate,
        tags: cleanStringArray(job.tags || [], 6, 40),
      });
    }
  }

  if (results.length > 0) {
    cachedJobs = { fetchedAt: Date.now(), items: results };
  }

  return results;
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));

  // Health & gateway status
  app.get('/api/health', (_req, res) => {
    const geminiConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
    const razorpayConfigured = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
    res.json({
      status: 'ok',
      geminiConfigured,
      razorpayConfigured,
      firebaseConfigured: Boolean(firebaseProjectId),
    });
  });

  // 1. AI Career Advisor
  app.post('/api/ai/career-advisor', requireAuth, aiRateLimiter, async (req: AuthenticatedRequest, res: Response) => {
    const educationLevel = cleanString(req.body?.educationLevel, 120);
    const degree = cleanString(req.body?.degree, 120);
    const branch = cleanString(req.body?.branch, 120);
    const skills = cleanStringArray(req.body?.skills, 40, 60);
    const interests = cleanStringArray(req.body?.interests, 20, 60);
    const careerGoals = cleanString(req.body?.careerGoals, 1000);
    const experienceLevel = cleanString(req.body?.experienceLevel, 60);

    if (!educationLevel || !degree || !careerGoals) {
      return res.status(400).json({
        error: 'Please provide your education level, degree, and career goals to generate recommendations.',
      });
    }

    try {
      const ai = getGeminiClient();
      const prompt = `Analyze this student/job-seeker profile and provide deeply personalized, realistic career guidance (never generic filler).
Profile:
- Education Level: ${educationLevel}
- Degree & Branch: ${degree}${branch ? ` (${branch})` : ''}
- Experience Level: ${experienceLevel || 'Student'}
- Current Technical Skills: ${skills.length ? skills.join(', ') : 'None listed yet'}
- Interests: ${interests.length ? interests.join(', ') : 'Exploring technology & product roles'}
- Career Goals: ${careerGoals}

Return structured career recommendations referencing their exact background, degree, and existing skills.`;

      const response = await ai.models.generateContent({
        model: AI_MODEL,
        contents: prompt,
        config: {
          systemInstruction:
            'You are a senior technical career advisor helping college students, graduates, and early-career job seekers. Provide concrete, realistic, personalized recommendations without hype.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendedPaths: { type: Type.ARRAY, items: { type: Type.STRING } },
              requiredSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendedLanguages: { type: Type.ARRAY, items: { type: Type.STRING } },
              opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
              roadmapPreview: { type: Type.STRING },
              explanation: { type: Type.STRING },
            },
            required: ['recommendedPaths', 'requiredSkills', 'recommendedLanguages', 'opportunities', 'roadmapPreview', 'explanation'],
          },
        },
      });

      const parsed = parseJsonSafe(response.text, null as null | Record<string, unknown>);
      if (!parsed) {
        return res.status(502).json({ error: 'Received an unexpected format from the AI service. Please try again.' });
      }
      return res.json(parsed);
    } catch (err) {
      return handleAiError(res, err, 'Career Advisor analysis');
    }
  });

  // 2. AI Resume Analyzer (PDF upload via Multer memoryStorage)
  app.post(
    '/api/ai/resume-analyzer',
    requireAuth,
    aiRateLimiter,
    (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      upload.single('resume')(req, res, (err) => {
        if (err) {
          if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'PDF file exceeds the 5 MB upload limit.' });
          }
          return res.status(400).json({ error: 'Please upload a valid PDF file (.pdf).' });
        }
        return next();
      });
    },
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.file) {
        return res.status(400).json({ error: 'Please attach a PDF resume to analyze.' });
      }

      // Validate %PDF- magic bytes
      const header = req.file.buffer.subarray(0, 5).toString('ascii');
      if (header !== '%PDF-') {
        return res.status(400).json({ error: 'Uploaded file is not a valid PDF document.' });
      }

      const targetRole = cleanString(req.body?.targetRole, 120) || 'Software Developer';

      try {
        const ai = getGeminiClient();
        const pdfPart = {
          inlineData: {
            mimeType: 'application/pdf',
            data: req.file.buffer.toString('base64'),
          },
        };
        const textPart = {
          text: `Evaluate this uploaded PDF resume for the target role: "${targetRole}".
Assess:
1. Resume structure & formatting clarity (structureScore: 0-100)
2. ATS keyword & machine readability estimate (atsReadabilityScore: 0-100; note this is formatting/keyword alignment, not a guarantee of hiring)
3. Extracted technical skills present in the resume
4. Important missing skills for ${targetRole}
5. Strengths found in education, projects, and experience
6. Concrete improvement suggestions
7. A stronger tailored professional summary
8. Actionable project bullet improvement suggestions
9. ATS readability feedback (headings, tables, columns, keyword alignment)
10. Grammar & clarity notes.`,
        };

        const response = await ai.models.generateContent({
          model: AI_MODEL,
          contents: { parts: [pdfPart, textPart] },
          config: {
            systemInstruction:
              'You are an experienced technical recruiter and ATS resume reviewer. Base every observation strictly on the uploaded PDF content. Do not invent experience or claim ATS scores guarantee interviews.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                structureScore: { type: Type.NUMBER },
                atsReadabilityScore: { type: Type.NUMBER },
                extractedSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
                missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
                professionalSummary: { type: Type.STRING },
                projectSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                atsFeedback: { type: Type.STRING },
                grammarNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: [
                'structureScore',
                'atsReadabilityScore',
                'extractedSkills',
                'missingSkills',
                'strengths',
                'improvements',
                'professionalSummary',
                'projectSuggestions',
                'atsFeedback',
                'grammarNotes',
              ],
            },
          },
        });

        const parsed = parseJsonSafe(response.text, null as null | Record<string, unknown>);
        if (!parsed) {
          return res.status(502).json({ error: 'Unable to parse resume evaluation output. Please try again.' });
        }
        return res.json(parsed);
      } catch (err) {
        return handleAiError(res, err, 'PDF Resume analysis');
      }
    }
  );

  // 3. Skill Gap Analyzer
  app.post('/api/ai/skill-gap', requireAuth, aiRateLimiter, async (req: AuthenticatedRequest, res: Response) => {
    const targetRole = cleanString(req.body?.targetRole, 120);
    const existingSkills = cleanStringArray(req.body?.existingSkills, 40, 60);

    if (!targetRole) {
      return res.status(400).json({ error: 'Please select or enter a target job role.' });
    }

    try {
      const ai = getGeminiClient();
      const prompt = `Perform a rigorous skill gap comparison for the target role: "${targetRole}".
Candidate's current skills: ${existingSkills.length ? existingSkills.join(', ') : 'None provided yet'}.
Return:
- existingSkills (skills from their list that apply directly to ${targetRole})
- missingSkills (list of objects with skill, priority ["High" | "Medium" | "Low"], reason, and concrete learning recommendation)
- matchPercentage (0-100 realistic skill coverage estimate)
- recommendations (actionable next steps to close high-priority gaps).`;

      const response = await ai.models.generateContent({
        model: AI_MODEL,
        contents: prompt,
        config: {
          systemInstruction: 'You are a technical hiring manager. Give accurate, prioritized skill gap feedback.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              existingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
              missingSkills: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    skill: { type: Type.STRING },
                    priority: { type: Type.STRING },
                    reason: { type: Type.STRING },
                    recommendation: { type: Type.STRING },
                  },
                  required: ['skill', 'priority', 'reason', 'recommendation'],
                },
              },
              matchPercentage: { type: Type.NUMBER },
              recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['existingSkills', 'missingSkills', 'matchPercentage', 'recommendations'],
          },
        },
      });

      const parsed = parseJsonSafe(response.text, null as null | Record<string, unknown>);
      if (!parsed) {
        return res.status(502).json({ error: 'Unable to parse skill gap analysis. Please try again.' });
      }
      return res.json(parsed);
    } catch (err) {
      return handleAiError(res, err, 'Skill Gap analysis');
    }
  });

  // 4. AI Learning Roadmap
  app.post('/api/ai/learning-roadmap', requireAuth, aiRateLimiter, async (req: AuthenticatedRequest, res: Response) => {
    const targetRole = cleanString(req.body?.targetRole, 120);
    const currentSkills = cleanStringArray(req.body?.currentSkills, 40, 60);
    const experienceLevel = cleanString(req.body?.experienceLevel, 60) || 'Student';
    const weeklyHours = Number(req.body?.weeklyHours) || 10;

    if (!targetRole) {
      return res.status(400).json({ error: 'Please specify a target role for your learning roadmap.' });
    }

    try {
      const ai = getGeminiClient();
      const prompt = `Build a personalized, structured learning roadmap for becoming job-ready as a "${targetRole}".
Current level: ${experienceLevel}. Existing skills: ${currentSkills.length ? currentSkills.join(', ') : 'Foundational'}. Study commitment: ~${Math.min(Math.max(weeklyHours, 2), 60)} hours/week.
Provide:
- title (concise roadmap title)
- beginnerTopics, intermediateTopics, advancedTopics (each 4-6 items with unique short id, title, description, estimatedHours)
- weeklyTargets (6-8 concrete weekly milestones)
- practicalProjects (3-5 portfolio project ideas with clear scope)
- resources (verified well-known documentation/free courses like MDN, Official Python Docs, fast.ai, CS50, freeCodeCamp, etc. with real https:// URLs).`;

      const topicSchema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            estimatedHours: { type: Type.NUMBER },
          },
          required: ['id', 'title', 'description', 'estimatedHours'],
        },
      };

      const response = await ai.models.generateContent({
        model: AI_MODEL,
        contents: prompt,
        config: {
          systemInstruction: 'You are a curriculum architect. Create structured, practical, industry-aligned learning roadmaps.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              beginnerTopics: topicSchema,
              intermediateTopics: topicSchema,
              advancedTopics: topicSchema,
              weeklyTargets: { type: Type.ARRAY, items: { type: Type.STRING } },
              practicalProjects: { type: Type.ARRAY, items: { type: Type.STRING } },
              resources: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    provider: { type: Type.STRING },
                    url: { type: Type.STRING },
                  },
                  required: ['title', 'provider', 'url'],
                },
              },
            },
            required: ['title', 'beginnerTopics', 'intermediateTopics', 'advancedTopics', 'weeklyTargets', 'practicalProjects', 'resources'],
          },
        },
      });

      const parsed = parseJsonSafe(response.text, null as null | Record<string, unknown>);
      if (!parsed) {
        return res.status(502).json({ error: 'Unable to parse learning roadmap. Please try again.' });
      }
      return res.json(parsed);
    } catch (err) {
      return handleAiError(res, err, 'Learning Roadmap generation');
    }
  });

  // 5A. AI Interview Questions Generator
  app.post('/api/ai/interview-generate', requireAuth, aiRateLimiter, async (req: AuthenticatedRequest, res: Response) => {
    const role = cleanString(req.body?.role, 120);
    const difficulty = cleanString(req.body?.difficulty, 40) || 'Intermediate';
    const questionType = cleanString(req.body?.questionType, 40) || 'Mixed';
    const count = Math.min(Math.max(Number(req.body?.count) || 5, 2), 10);

    if (!role) {
      return res.status(400).json({ error: 'Please specify a job role for interview practice.' });
    }

    try {
      const ai = getGeminiClient();
      const prompt = `Generate ${count} realistic ${difficulty}-level interview questions for a "${role}" candidate.
Focus category: ${questionType} (Technical, HR, or Mixed).
For each question return: id, category ("Technical" or "HR"), question, idealAnswer (clear structured model response), and explanation (why interviewers ask this and what strong answers demonstrate).`;

      const response = await ai.models.generateContent({
        model: AI_MODEL,
        contents: prompt,
        config: {
          systemInstruction: 'You are a senior interviewer preparing realistic technical and behavioral interview questions.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    category: { type: Type.STRING },
                    question: { type: Type.STRING },
                    idealAnswer: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                  },
                  required: ['id', 'category', 'question', 'idealAnswer', 'explanation'],
                },
              },
            },
            required: ['questions'],
          },
        },
      });

      const parsed = parseJsonSafe(response.text, null as null | Record<string, unknown>);
      if (!parsed) {
        return res.status(502).json({ error: 'Unable to generate interview questions. Please try again.' });
      }
      return res.json(parsed);
    } catch (err) {
      return handleAiError(res, err, 'Interview question generation');
    }
  });

  // 5B. AI Interview Answer Evaluator
  app.post('/api/ai/interview-evaluate', requireAuth, aiRateLimiter, async (req: AuthenticatedRequest, res: Response) => {
    const role = cleanString(req.body?.role, 120);
    const difficulty = cleanString(req.body?.difficulty, 40) || 'Intermediate';
    const question = cleanString(req.body?.question, 800);
    const userAnswer = cleanString(req.body?.userAnswer, 4000);

    if (!role || !question || !userAnswer) {
      return res.status(400).json({ error: 'Role, question, and your written answer are required for evaluation.' });
    }

    try {
      const ai = getGeminiClient();
      const prompt = `Evaluate this candidate's interview response.
Role: ${role} (${difficulty})
Question: ${question}
Candidate Answer: ${userAnswer}

Score honestly from 0 to 100 based on technical accuracy, clarity, structure (STAR for HR), and depth. Give constructive feedback, an improved version of their answer, and 2-4 concrete improvement suggestions.`;

      const response = await ai.models.generateContent({
        model: AI_MODEL,
        contents: prompt,
        config: {
          systemInstruction: 'You are a calibrated, constructive interview coach. Evaluate strictly on merit and clarity.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              feedback: { type: Type.STRING },
              improvedAnswer: { type: Type.STRING },
              improvementSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['score', 'feedback', 'improvedAnswer', 'improvementSuggestions'],
          },
        },
      });

      const parsed = parseJsonSafe(response.text, null as null | Record<string, unknown>);
      if (!parsed) {
        return res.status(502).json({ error: 'Unable to evaluate answer. Please try again.' });
      }
      return res.json(parsed);
    } catch (err) {
      return handleAiError(res, err, 'Mock interview evaluation');
    }
  });

  // 6. Real Legitimate External Job & Internship Discovery
  app.get('/api/jobs', async (req: Request, res: Response) => {
    try {
      const allJobs = await fetchExternalJobs();
      const q = cleanString(req.query.q, 100).toLowerCase();
      const location = cleanString(req.query.location, 100).toLowerCase();
      const category = cleanString(req.query.category, 40);
      const experience = cleanString(req.query.experience, 40);

      const filtered = allJobs.filter((job) => {
        if (q) {
          const hay = `${job.title} ${job.company} ${job.tags.join(' ')}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (location && !job.location.toLowerCase().includes(location)) {
          return false;
        }
        if (category && category !== 'All' && job.category !== category) {
          return false;
        }
        if (experience && experience !== 'All' && job.experienceLevel !== experience) {
          return false;
        }
        return true;
      });

      return res.json({
        jobs: filtered.slice(0, 40),
        totalAvailable: filtered.length,
        sources: ['Remotive Public API', 'Arbeitnow Job Board API'],
      });
    } catch (err) {
      console.error('Job fetch error:', err);
      return res.status(502).json({
        error: 'Unable to reach external job boards right now. Please try again shortly.',
        jobs: [],
      });
    }
  });

  // 7. Razorpay Payment Gateway Configuration & Verification
  app.get('/api/payments/config', (_req, res) => {
    const keyId = process.env.RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
    res.json({
      configured: Boolean(keyId && keySecret),
      keyId: keyId && keySecret ? keyId : null,
    });
  });

  app.post('/api/payments/create-order', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const keyId = process.env.RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
    if (!keyId || !keySecret) {
      return res.status(503).json({
        configured: false,
        error: 'Razorpay payment gateway is not configured on the server yet. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to enable live INR checkout.',
      });
    }

    const plan = cleanString(req.body?.plan, 20);
    if (plan !== 'pro' && plan !== 'premium') {
      return res.status(400).json({ error: 'Invalid subscription plan selected.' });
    }

    const amountPaise = plan === 'pro' ? 9900 : 19900;
    const authToken = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    try {
      const orderResp = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          receipt: `cp_${req.user!.uid.slice(0, 12)}_${Date.now()}`,
          notes: {
            plan,
            uid: req.user!.uid,
          },
        }),
      });

      if (!orderResp.ok) {
        return res.status(502).json({ error: 'Razorpay order creation failed. Please verify gateway credentials.' });
      }
      const order = (await orderResp.json()) as { id: string; amount: number; currency: string };
      return res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId,
      });
    } catch (err) {
      console.error('Razorpay order error:', err);
      return res.status(502).json({ error: 'Failed to communicate with Razorpay gateway.' });
    }
  });

  app.post('/api/payments/verify', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
    if (!keySecret) {
      return res.status(503).json({ error: 'Razorpay verification secret is not configured.' });
    }

    const orderId = cleanString(req.body?.razorpay_order_id, 120);
    const paymentId = cleanString(req.body?.razorpay_payment_id, 120);
    const signature = cleanString(req.body?.razorpay_signature, 200);
    const plan = cleanString(req.body?.plan, 20);

    if (!orderId || !paymentId || !signature || (plan !== 'pro' && plan !== 'premium')) {
      return res.status(400).json({ error: 'Incomplete payment verification payload.' });
    }

    const expected = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const expectedBuf = Buffer.from(expected, 'utf8');
    const actualBuf = Buffer.from(signature, 'utf8');
    if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
      return res.status(400).json({ error: 'Payment signature verification failed.' });
    }

    return res.json({
      verified: true,
      plan,
      orderId,
      paymentId,
    });
  });

  // Vite dev middleware or production static build
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI CareerPilot server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start AI CareerPilot server:', err);
  process.exit(1);
});
