
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
  createdBy?: 'parent' | 'teacher'; // Novo: Origem da atividade
  teacherName?: string;
}

export interface Child {
  id: string;
  name: string;
  age: number;
  grade: string;
  avatar: string;
  accessCode: string;
  difficultySubjects: Subject[];
  badges?: string[];
  xp: number;
  stars: number;
  streak: number;
}

export interface ClassGroup {
  id: string;
  name: string;
  grade: string;
  studentCount: number;
  engagement: number; // 0-100
}

export interface Guardian {
  id: string;
  name: string;
  email: string;
  plan: 'Free' | 'Premium';
  avatar: string;
  role: 'guardian' | 'teacher'; // Novo: Diferenciação de papel
}

export interface AuthState {
  user: Guardian | null;
  isAuthenticated: boolean;
}

export interface DailyCheckIn {
  id: string;
  childId: string;
  date: string;
  mood: 'feliz' | 'calmo' | 'agitado' | 'triste' | 'bravo';
  energy: number;
  sleepQuality: number;
  schoolStatus: string;
  event: string;
}

export interface BehaviorGoal {
  id: string;
  childId: string;
  title: string;
  completedDays: string[];
  targetDays: number;
}

export interface ActionPlan {
  summary: string;
  tasks: string[];
  alert?: string;
}
