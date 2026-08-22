export const UserRole = { ADMIN: 'admin', USER: 'user' } as const;

export interface User {
  id: string;
  email: string;
  name: string;
  role: typeof UserRole[keyof typeof UserRole];
  avatar?: string;
  stats?: UserStats;
}

export interface UserStats {
  gpa: number;
  studyTimeMinutes: number;
  attendanceRate: number;
  completedQuizzes: number;
  totalQuizzes: number;
  completedExams: number;
  totalExams: number;
  rank: number;
  points: number;
  level: number;
  badges: Badge[];
  subjectPerformance: SubjectStat[];
}

export interface SubjectStat {
  name: string;
  score: number;
  color: string;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  earnedAt: string;
}

export interface Section {
  id: string;
  title: string;
  content: string;
  pdfUrl?: string;
  pdfPage?: number;
  quiz?: QuizQuestion[];
}

export interface Chapter {
  id: string;
  title: string;
  sections: Section[];
}

export interface Textbook {
  id: string;
  title: string;
  description: string;
  chapters: Chapter[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface SectionProgress {
  completed: boolean;
  notes: string;
  score?: number;
  attempts?: number;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  file?: {
    name: string;
    type: string;
    size: number;
    data: string;
  };
}

export interface ChatRoom {
  id: string;
  name: string;
  type: "group" | "individual";
  members?: string[];
}

export interface ProgressMap {
  [sectionId: string]: SectionProgress;
}