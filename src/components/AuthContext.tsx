import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import { getOrCreateUserProfile, subscribeUserCollection } from '../lib/firestoreService';
import {
  CareerAnalysis,
  InterviewSession,
  LearningRoadmap,
  ResumeAnalysis,
  SavedJob,
  SkillGapReport,
  UserActivity,
  UserProfile,
} from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  emailVerified: boolean;
  profile: UserProfile | null;
  careerAnalyses: CareerAnalysis[];
  resumeAnalyses: ResumeAnalysis[];
  skillGapReports: SkillGapReport[];
  learningRoadmaps: LearningRoadmap[];
  interviewSessions: InterviewSession[];
  savedJobs: SavedJob[];
  activities: UserActivity[];
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (displayName: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  refreshVerification: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [careerAnalyses, setCareerAnalyses] = useState<CareerAnalysis[]>([]);
  const [resumeAnalyses, setResumeAnalyses] = useState<ResumeAnalysis[]>([]);
  const [skillGapReports, setSkillGapReports] = useState<SkillGapReport[]>([]);
  const [learningRoadmaps, setLearningRoadmaps] = useState<LearningRoadmap[]>([]);
  const [interviewSessions, setInterviewSessions] = useState<InterviewSession[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [activities, setActivities] = useState<UserActivity[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setEmailVerified(Boolean(firebaseUser?.emailVerified));
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user || !emailVerified) {
      setProfile(null);
      setCareerAnalyses([]);
      setResumeAnalyses([]);
      setSkillGapReports([]);
      setLearningRoadmaps([]);
      setInterviewSessions([]);
      setSavedJobs([]);
      setActivities([]);
      return;
    }

    let cancelled = false;
    void getOrCreateUserProfile(
      user.uid,
      user.displayName || user.email?.split('@')[0] || 'Student',
      user.email || ''
    ).then((createdProfile) => {
      if (!cancelled) {
        setProfile(createdProfile);
      }
    });

    const profilePath = `users/${user.uid}`;
    const unsubProfile = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, profilePath);
      }
    );

    const unsubCareer = subscribeUserCollection<CareerAnalysis>('careerAnalyses', user.uid, setCareerAnalyses);
    const unsubResume = subscribeUserCollection<ResumeAnalysis>('resumeAnalyses', user.uid, setResumeAnalyses);
    const unsubGap = subscribeUserCollection<SkillGapReport>('skillGapReports', user.uid, setSkillGapReports);
    const unsubRoadmaps = subscribeUserCollection<LearningRoadmap>('learningRoadmaps', user.uid, setLearningRoadmaps);
    const unsubInterview = subscribeUserCollection<InterviewSession>('interviewSessions', user.uid, setInterviewSessions);
    const unsubJobs = subscribeUserCollection<SavedJob>('savedJobs', user.uid, setSavedJobs);
    const unsubActivities = subscribeUserCollection<UserActivity>('activities', user.uid, setActivities);

    return () => {
      cancelled = true;
      unsubProfile();
      unsubCareer();
      unsubResume();
      unsubGap();
      unsubRoadmaps();
      unsubInterview();
      unsubJobs();
      unsubActivities();
    };
  }, [user, emailVerified]);

  const signInWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    setEmailVerified(Boolean(cred.user.emailVerified));
  };

  const signInWithEmail = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    setEmailVerified(Boolean(cred.user.emailVerified));
  };

  const registerWithEmail = async (displayName: string, email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName.trim()) {
      await updateProfile(cred.user, { displayName: displayName.trim() });
    }
    await sendEmailVerification(cred.user);
    setEmailVerified(Boolean(cred.user.emailVerified));
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const resendVerification = async () => {
    if (!auth.currentUser) throw new Error('No active account found.');
    await sendEmailVerification(auth.currentUser);
  };

  const refreshVerification = async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    await auth.currentUser.reload();
    await auth.currentUser.getIdToken(true);
    const verified = Boolean(auth.currentUser.emailVerified);
    setEmailVerified(verified);
    return verified;
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        emailVerified,
        profile,
        careerAnalyses,
        resumeAnalyses,
        skillGapReports,
        learningRoadmaps,
        interviewSessions,
        savedJobs,
        activities,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        resetPassword,
        resendVerification,
        refreshVerification,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
