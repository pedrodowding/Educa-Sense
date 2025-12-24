
export enum Subject {
  PORTUGUESE = 'Português',
  MATH = 'Matemática',
  SCIENCE = 'Ciências',
  HISTORY = 'História',
  GEOGRAPHY = 'Geografia',
  ENGLISH = 'Inglês',
  ART = 'Artes'
}

export enum Difficulty {
  EASY = 'Fácil',
  MEDIUM = 'Médio',
  HARD = 'Difícil'
}

export enum Objective {
  INTRODUCE = 'introduzir',
  REINFORCE = 'reforçar',
  REVIEW = 'revisar'
}

export interface Question {
  id: string;
  text: string;
  type: 'multiple' | 'open' | 'sequence';
  options?: string[];
  correctAnswer: string;
  explanation: string;
  audioData?: string;
}

export interface Exercise {
  id: string;
  title: string;
  childId: string;
  childName: string;
  childAge: number;
  grade: string;
  subject: Subject;
  difficulty: Difficulty;
  pedagogicalObjective: string;
  questions: Question[];
  createdAt: string;
  score?: number;
  completed?: boolean;
  imageUrl?: string;
}

export interface Child {
  id: string;
  name: string;
  age: number;
  grade: string;
  avatar: string;
  accessCode: string;
  difficultySubjects: Subject[]; // Alterado para array
  badges?: string[];
  xp: number;
  stars: number;
  streak: number;
}

export interface DailyCheckIn {
  id: string;
  childId: string;
  date: string;
  mood: 'feliz' | 'calmo' | 'agitado' | 'triste' | 'bravo';
  energy: number; // 1-5
  sleepQuality: number; // 1-5
  schoolStatus: string;
  event: string;
}

export interface BehaviorGoal {
  id: string;
  childId: string;
  title: string;
  completedDays: string[]; // ISO Dates
  targetDays: number;
}

export interface ActionPlan {
  summary: string;
  tasks: string[];
  alert?: string;
}

export interface Guardian {
  id: string;
  name: string;
  email: string;
  plan: 'Free' | 'Premium';
  avatar: string;
}

export interface AuthState {
  user: Guardian | null;
  isAuthenticated: boolean;
}
