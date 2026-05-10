import { Timestamp } from 'firebase/firestore';

export type View = 'dashboard' | 'timer' | 'tasks' | 'stats' | 'leaderboard' | 'resources' | 'profile';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  totalHours: number;
  totalQuestions: number;
  totalSessions: number;
  streak: number;
  score: number;
  rank: 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Grandmaster';
  isPremium: boolean;
  monkViolations?: number;
  avatarState?: 'healthy' | 'tired' | 'injured' | 'critical' | 'dormant';
  lastActive: Timestamp;
  createdAt: Timestamp;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  subject: string;
  duration: number;
  questions: number;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Timestamp;
}

export interface Session {
  id: string;
  userId: string;
  type: string;
  subject?: string;
  duration: number; // in seconds
  startTime: Timestamp;
  endTime?: Timestamp;
  completed: boolean;
}

export interface ExamGoal {
  id: string;
  userId: string;
  title: string;
  targetDate: Timestamp;
  description?: string;
  subjects?: string[];
}

export interface Resource {
  id: string;
  title: string;
  author: string;
  subject: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  rating: number;
  url: string;
  isPremium: boolean;
}
