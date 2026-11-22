import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { createCleanId, db, handleFirestoreError, OperationType } from './firebase';
import {
  ActivityType,
  CareerAnalysis,
  InterviewSession,
  JobListing,
  LearningRoadmap,
  ResumeAnalysis,
  SavedJob,
  SkillGapReport,
  UserActivity,
  UserProfile,
} from '../types';

function clampStr(val: string | undefined | null, max: number, fallback = ''): string {
  const clean = (val ?? fallback).trim();
  return clean.slice(0, max);
}

function clampList(arr: string[] | undefined | null, maxItems: number, maxLen = 120): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((item) => clampStr(item, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

export async function getOrCreateUserProfile(
  uid: string,
  displayName: string,
  email: string
): Promise<UserProfile> {
  const path = `users/${uid}`;
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }

    const initialProfile = {
      userId: uid,
      displayName: clampStr(displayName || email.split('@')[0] || 'Student', 120, 'Student'),
      email: clampStr(email, 200),
      educationLevel: '',
      degree: '',
      branch: '',
      skills: [] as string[],
      interests: [] as string[],
      careerGoals: '',
      experienceLevel: 'Student' as const,
      targetRole: 'Software Developer',
      plan: 'free' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, initialProfile);
    const created = await getDoc(ref);
    return created.data() as UserProfile;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<
    Pick<
      UserProfile,
      | 'displayName'
      | 'email'
      | 'educationLevel'
      | 'degree'
      | 'branch'
      | 'skills'
      | 'interests'
      | 'careerGoals'
      | 'experienceLevel'
      | 'targetRole'
    >
  >
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error('User profile does not exist.');
    }
    const current = snap.data() as UserProfile;
    await updateDoc(ref, {
      displayName: clampStr(updates.displayName ?? current.displayName, 120, 'Student'),
      email: clampStr(updates.email ?? current.email, 200),
      educationLevel: clampStr(updates.educationLevel ?? current.educationLevel, 120),
      degree: clampStr(updates.degree ?? current.degree, 120),
      branch: clampStr(updates.branch ?? current.branch, 120),
      skills: clampList(updates.skills ?? current.skills, 40, 80),
      interests: clampList(updates.interests ?? current.interests, 20, 80),
      careerGoals: clampStr(updates.careerGoals ?? current.careerGoals, 1000),
      experienceLevel: updates.experienceLevel ?? current.experienceLevel,
      targetRole: clampStr(updates.targetRole ?? current.targetRole, 120),
      updatedAt: serverTimestamp(),
    });
    await logUserActivity(uid, 'profile_updated', 'Career profile updated', `Target role: ${updates.targetRole ?? current.targetRole}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function logUserActivity(
  uid: string,
  type: ActivityType,
  title: string,
  detail: string
): Promise<void> {
  const id = createCleanId('act');
  const path = `activities/${id}`;
  try {
    await setDoc(doc(db, 'activities', id), {
      id,
      userId: uid,
      type,
      title: clampStr(title, 200, 'Activity'),
      detail: clampStr(detail, 400, 'Completed'),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function saveCareerAnalysis(
  uid: string,
  payload: Omit<CareerAnalysis, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  const id = createCleanId('adv');
  const path = `careerAnalyses/${id}`;
  try {
    await setDoc(doc(db, 'careerAnalyses', id), {
      id,
      userId: uid,
      targetInputSummary: clampStr(payload.targetInputSummary, 600, 'Career analysis'),
      recommendedPaths: clampList(payload.recommendedPaths, 10, 140),
      requiredSkills: clampList(payload.requiredSkills, 25, 100),
      recommendedLanguages: clampList(payload.recommendedLanguages, 15, 80),
      opportunities: clampList(payload.opportunities, 12, 160),
      roadmapPreview: clampStr(payload.roadmapPreview, 4000, 'Roadmap preview generated'),
      explanation: clampStr(payload.explanation, 4000, 'Analysis completed'),
      createdAt: serverTimestamp(),
    });
    await logUserActivity(
      uid,
      'career_advisor',
      'Ran AI Career Advisor',
      `Recommended: ${payload.recommendedPaths.slice(0, 2).join(', ') || 'Career paths'}`
    );
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function saveResumeAnalysis(
  uid: string,
  payload: Omit<ResumeAnalysis, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  const id = createCleanId('res');
  const path = `resumeAnalyses/${id}`;
  try {
    await setDoc(doc(db, 'resumeAnalyses', id), {
      id,
      userId: uid,
      fileName: clampStr(payload.fileName, 200, 'resume.pdf'),
      targetRole: clampStr(payload.targetRole, 120, 'Software Developer'),
      structureScore: Math.min(100, Math.max(0, Math.round(Number(payload.structureScore) || 0))),
      atsReadabilityScore: Math.min(100, Math.max(0, Math.round(Number(payload.atsReadabilityScore) || 0))),
      extractedSkills: clampList(payload.extractedSkills, 40, 80),
      missingSkills: clampList(payload.missingSkills, 25, 80),
      strengths: clampList(payload.strengths, 15, 300),
      improvements: clampList(payload.improvements, 20, 300),
      professionalSummary: clampStr(payload.professionalSummary, 2000, 'Summary generated'),
      projectSuggestions: clampList(payload.projectSuggestions, 10, 400),
      atsFeedback: clampStr(payload.atsFeedback, 2000, 'ATS feedback generated'),
      grammarNotes: clampList(payload.grammarNotes, 15, 300),
      createdAt: serverTimestamp(),
    });
    await logUserActivity(
      uid,
      'resume_analysis',
      `Analyzed resume (${payload.fileName})`,
      `Target: ${payload.targetRole} · ATS Readability: ${Math.round(payload.atsReadabilityScore)}/100`
    );
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function saveSkillGapReport(
  uid: string,
  payload: Omit<SkillGapReport, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  const id = createCleanId('gap');
  const path = `skillGapReports/${id}`;
  try {
    await setDoc(doc(db, 'skillGapReports', id), {
      id,
      userId: uid,
      targetRole: clampStr(payload.targetRole, 120, 'Target Role'),
      existingSkills: clampList(payload.existingSkills, 40, 80),
      missingSkills: (payload.missingSkills || []).slice(0, 30).map((item) => ({
        skill: clampStr(item.skill, 100, 'Skill'),
        priority: item.priority === 'High' || item.priority === 'Medium' || item.priority === 'Low' ? item.priority : 'Medium',
        reason: clampStr(item.reason, 400, 'Required for role'),
        recommendation: clampStr(item.recommendation, 400, 'Practice via projects'),
      })),
      matchPercentage: Math.min(100, Math.max(0, Math.round(Number(payload.matchPercentage) || 0))),
      recommendations: clampList(payload.recommendations, 15, 350),
      createdAt: serverTimestamp(),
    });
    await logUserActivity(
      uid,
      'skill_gap',
      `Skill Gap Analysis: ${payload.targetRole}`,
      `Coverage: ${Math.round(payload.matchPercentage)}% · Missing skills identified: ${payload.missingSkills.length}`
    );
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function saveLearningRoadmap(
  uid: string,
  payload: Omit<LearningRoadmap, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = createCleanId('map');
  const path = `learningRoadmaps/${id}`;
  const sanitizeTopics = (topics: LearningRoadmap['beginnerTopics']) =>
    (topics || []).slice(0, 20).map((t, idx) => ({
      id: clampStr(t.id || `topic_${idx}`, 80),
      title: clampStr(t.title, 140, 'Topic'),
      description: clampStr(t.description, 400, 'Study topic'),
      estimatedHours: Math.max(1, Math.min(200, Math.round(Number(t.estimatedHours) || 4))),
    }));

  try {
    await setDoc(doc(db, 'learningRoadmaps', id), {
      id,
      userId: uid,
      targetRole: clampStr(payload.targetRole, 120, 'Software Developer'),
      title: clampStr(payload.title, 180, `${payload.targetRole} Roadmap`),
      beginnerTopics: sanitizeTopics(payload.beginnerTopics),
      intermediateTopics: sanitizeTopics(payload.intermediateTopics),
      advancedTopics: sanitizeTopics(payload.advancedTopics),
      weeklyTargets: clampList(payload.weeklyTargets, 16, 260),
      practicalProjects: clampList(payload.practicalProjects, 12, 320),
      resources: (payload.resources || []).slice(0, 20).map((r) => ({
        title: clampStr(r.title, 140, 'Resource'),
        provider: clampStr(r.provider, 100, 'Official Docs'),
        url: clampStr(r.url, 300, 'https://developer.mozilla.org'),
      })),
      completedTopicIds: clampList(payload.completedTopicIds, 60, 80),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await logUserActivity(
      uid,
      'roadmap',
      `Created Learning Roadmap: ${payload.targetRole}`,
      payload.title
    );
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function toggleRoadmapTopic(
  roadmap: LearningRoadmap,
  topicId: string
): Promise<void> {
  const path = `learningRoadmaps/${roadmap.id}`;
  try {
    const exists = roadmap.completedTopicIds.includes(topicId);
    const updatedCompleted = exists
      ? roadmap.completedTopicIds.filter((id) => id !== topicId)
      : [...roadmap.completedTopicIds, topicId].slice(0, 60);
    await updateDoc(doc(db, 'learningRoadmaps', roadmap.id), {
      completedTopicIds: updatedCompleted,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function saveInterviewSession(
  uid: string,
  payload: Omit<InterviewSession, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  const id = createCleanId('int');
  const path = `interviewSessions/${id}`;
  try {
    await setDoc(doc(db, 'interviewSessions', id), {
      id,
      userId: uid,
      role: clampStr(payload.role, 120, 'Software Developer'),
      difficulty: payload.difficulty,
      mode: payload.mode,
      questionCount: Math.min(15, Math.max(1, payload.questions.length || payload.questionCount)),
      averageScore: Math.min(100, Math.max(0, Math.round(Number(payload.averageScore) || 0))),
      summaryFeedback: clampStr(payload.summaryFeedback, 2000, 'Session completed'),
      questions: (payload.questions || []).slice(0, 15).map((q, idx) => ({
        id: clampStr(q.id || `q_${idx}`, 60),
        category: q.category === 'HR' ? 'HR' : 'Technical',
        question: clampStr(q.question, 600),
        idealAnswer: clampStr(q.idealAnswer, 1200),
        explanation: clampStr(q.explanation, 800),
        userAnswer: clampStr(q.userAnswer, 2000),
        score: typeof q.score === 'number' ? Math.min(100, Math.max(0, Math.round(q.score))) : 0,
        feedback: clampStr(q.feedback, 800),
        improvementSuggestions: clampList(q.improvementSuggestions || [], 6, 240),
      })),
      createdAt: serverTimestamp(),
    });
    await logUserActivity(
      uid,
      'interview',
      `${payload.mode}: ${payload.role}`,
      `Difficulty: ${payload.difficulty} · Avg score: ${Math.round(payload.averageScore)}/100`
    );
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function saveJobOpportunity(uid: string, job: JobListing): Promise<string> {
  const id = createCleanId('job');
  const path = `savedJobs/${id}`;
  try {
    await setDoc(doc(db, 'savedJobs', id), {
      id,
      userId: uid,
      externalId: clampStr(job.externalId, 200),
      title: clampStr(job.title, 200),
      company: clampStr(job.company, 160),
      location: clampStr(job.location, 160),
      category: job.category === 'Internship' ? 'Internship' : 'Full-Time',
      experienceLevel: clampStr(job.experienceLevel, 80, 'Entry Level'),
      applyUrl: job.applyUrl.startsWith('https://') ? clampStr(job.applyUrl, 500) : 'https://remotive.com',
      source: clampStr(job.source, 80, 'Public Board'),
      postedAt: clampStr(job.postedAt, 80, 'Recent'),
      createdAt: serverTimestamp(),
    });
    await logUserActivity(uid, 'job_saved', `Saved ${job.title}`, `${job.company} · ${job.location}`);
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function removeSavedJob(savedJobId: string): Promise<void> {
  const path = `savedJobs/${savedJobId}`;
  try {
    await deleteDoc(doc(db, 'savedJobs', savedJobId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export function subscribeUserCollection<T>(
  collectionName: string,
  uid: string,
  onData: (items: T[]) => void
): Unsubscribe {
  const q = query(
    collection(db, collectionName),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as T);
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, collectionName);
    }
  );
}
