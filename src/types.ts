export type PlanTier = 'free' | 'pro' | 'premium';

export type ExperienceLevel = 'Student' | 'Fresh Graduate' | '0-2 Years' | '2+ Years';

export interface UserProfile {
  userId: string;
  displayName: string;
  email: string;
  educationLevel: string;
  degree: string;
  branch: string;
  skills: string[];
  interests: string[];
  careerGoals: string;
  experienceLevel: ExperienceLevel;
  targetRole: string;
  plan: PlanTier;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CareerAnalysis {
  id: string;
  userId: string;
  targetInputSummary: string;
  recommendedPaths: string[];
  requiredSkills: string[];
  recommendedLanguages: string[];
  opportunities: string[];
  roadmapPreview: string;
  explanation: string;
  createdAt?: unknown;
}

export interface ResumeAnalysis {
  id: string;
  userId: string;
  fileName: string;
  targetRole: string;
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
  createdAt?: unknown;
}

export interface MissingSkillItem {
  skill: string;
  priority: 'High' | 'Medium' | 'Low';
  reason: string;
  recommendation: string;
}

export interface SkillGapReport {
  id: string;
  userId: string;
  targetRole: string;
  existingSkills: string[];
  missingSkills: MissingSkillItem[];
  matchPercentage: number;
  recommendations: string[];
  createdAt?: unknown;
}

export interface RoadmapTopic {
  id: string;
  title: string;
  description: string;
  estimatedHours: number;
}

export interface RoadmapResource {
  title: string;
  provider: string;
  url: string;
}

export interface LearningRoadmap {
  id: string;
  userId: string;
  targetRole: string;
  title: string;
  beginnerTopics: RoadmapTopic[];
  intermediateTopics: RoadmapTopic[];
  advancedTopics: RoadmapTopic[];
  weeklyTargets: string[];
  practicalProjects: string[];
  resources: RoadmapResource[];
  completedTopicIds: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface InterviewQuestionItem {
  id: string;
  category: 'Technical' | 'HR';
  question: string;
  idealAnswer: string;
  explanation: string;
  userAnswer?: string;
  score?: number;
  feedback?: string;
  improvementSuggestions?: string[];
}

export interface InterviewSession {
  id: string;
  userId: string;
  role: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  mode: 'Practice Q&A' | 'Mock Interview';
  questionCount: number;
  averageScore: number;
  summaryFeedback: string;
  questions: InterviewQuestionItem[];
  createdAt?: unknown;
}

export interface JobListing {
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

export interface SavedJob {
  id: string;
  userId: string;
  externalId: string;
  title: string;
  company: string;
  location: string;
  category: 'Internship' | 'Full-Time';
  experienceLevel: string;
  applyUrl: string;
  source: string;
  postedAt: string;
  createdAt?: unknown;
}

export type ActivityType =
  | 'career_advisor'
  | 'resume_analysis'
  | 'skill_gap'
  | 'roadmap'
  | 'interview'
  | 'job_saved'
  | 'profile_updated';

export interface UserActivity {
  id: string;
  userId: string;
  type: ActivityType;
  title: string;
  detail: string;
  createdAt?: unknown;
}

export type DashboardSection =
  | 'overview'
  | 'advisor'
  | 'resume'
  | 'skills'
  | 'roadmap'
  | 'interview'
  | 'jobs'
  | 'billing'
  | 'profile';
