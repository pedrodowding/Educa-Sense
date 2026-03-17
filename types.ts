
export type ActivityFormat = 'multipla' | 'dissertativa' | 'mista' | 'leitura_guiada';

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'milestone' | 'subject' | 'streak';
  xpBonus: number;
  earnedAt?: string;
  color?: string;
}

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
  correctAnswers?: number;
  totalQuestions?: number;
  imageUrl?: string;
  selectedFormat?: ActivityFormat;
  createdBy?: 'parent' | 'teacher'; // Novo: Origem da atividade
  teacherName?: string;
  type?: string;
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
  guardianId?: string;
  friendsEnabled?: boolean;
  friendsParentApprovalRequired?: boolean;
  socialInteractionsEnabled?: boolean;
  // Sprint 8B: Game Reward Config
  gameEnabled?: boolean;
  gameTimeLimit?: number;
  storyEnabled?: boolean;
  drawingEnabled?: boolean;
}

export interface ChildReaction {
  id: string;
  from_child_id: string;
  to_child_id: string;
  event_type: 'daily_plan_completed' | 'badge_earned';
  event_id: string;
  reaction_type: 'parabens' | 'muito_bem' | 'bora';
  created_at: string;
}

export interface ChildChallenge {
  id: string;
  from_child_id: string;
  to_child_id: string;
  challenge_type: 'complete_daily_plan' | 'do_2_activities';
  status: 'pending' | 'accepted' | 'completed' | 'expired';
  created_at: string;
  accepted_at?: string;
  completed_at?: string;
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
  role: 'guardian' | 'teacher' | 'director' | 'admin'; // Novo: Diferenciação de papel expandida
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

export type BehaviorEventType = 'daily_checkin' | 'mood_log' | 'sleep_log' | 'goal_check' | 'activity_completed' | 'plan_generated';

export interface BehaviorEvent {
  id?: string;
  childId: string;
  eventType: BehaviorEventType;
  eventDate: string;
  eventWeek: string;
  metadata?: Record<string, any>;
  createdAt?: string;
}

export interface BehaviorGoal {
  id: string;
  childId: string;
  description: string;
  target: number;
  progress: number;
  reward?: string;
  icon?: string;
}

export interface ActionPlan {
  id?: string;
  childId?: string;
  summary: string;
  summaryStructured?: {
    focus: string;
    recommendation: string;
    attentionPoints: string[];
  };
  tasks: {
    id: string;
    description: string;
    completed: boolean;
    completedAt?: string;
  }[];
  alert?: string;
  createdAt?: string;
  active?: boolean;
}

export type BulletinPostType = 'notice' | 'event' | 'homework' | 'alert';

export interface SchoolBulletinPost {
  id: string;
  school_id: string;
  author_user_id: string;
  class_id?: string;
  title: string;
  content: string;
  type: BulletinPostType;
  pinned: boolean;
  created_at: string;
  author?: {
    full_name: string;
    avatar_url?: string;
  };
}

export interface BulletinLog {
  id: string;
  school_id: string;
  post_id?: string | null;
  user_id: string;
  action: 'create' | 'update' | 'delete' | 'pin' | 'unpin';
  details: any;
  created_at: string;
  user?: {
    email: string;
  };
}

export interface School {
  id: string;
  name: string;
  createdAt: string;
}

export interface SchoolMember {
  id: string;
  schoolId: string;
  userId: string;
  role: 'director' | 'teacher';
  createdAt: string;
}

export interface SchoolClass {
  id: string;
  schoolId: string;
  teacherUserId: string;
  name: string;
  createdAt: string;
  studentCount?: number;
}

export interface SchoolStudent {
  id: string;
  schoolId: string;
  name: string;
  active: boolean;
  childId?: string | null;
  createdAt: string;
}

export interface Assignment {
  id: string;
  schoolId: string;
  teacherUserId: string;
  classId: string;
  title: string;
  competency: string;
  required: boolean;
  dueDate: string;
  createdAt: string;
}

export interface AssignmentRecipient {
  id: string;
  assignmentId: string;
  studentId: string;
  status: 'pending' | 'submitted' | 'late';
  submittedAt?: string;
  score?: number;
}

export interface ActivityEvent {
  id: string;
  studentId: string;
  competency: string;
  activityType: string;
  score?: number;
  source: 'free_practice' | 'assignment';
  assignmentRecipientId?: string;
  createdAt: string;
}

export interface BulletinPost {
  id: string;
  schoolId: string;
  authorUserId: string;
  classId?: string | null;
  title: string;
  content: string;
  type: 'notice' | 'event' | 'homework' | 'alert';
  pinned: boolean;
  createdAt: string;
  authorName?: string;
}

export interface ImportLog {
  id: string;
  schoolId: string;
  userId: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRecords: number;
  processedRecords: number;
  errorLog: Array<{ row: number; error: string; data?: any }>;
  createdAt: string;
}

export interface ChildDevice {
  id: string;
  childId: string;
  deviceId: string;
  lastSeen: string;
  createdAt: string;
  userAgent?: string;
  platform?: string;
  language?: string;
  timezone?: string;
  screen?: string;
  info?: any;
}

export interface ChildContext {
  name: string;
  age: number;
  level: number;
  total_xp: number;
  strengths: string[];
  weaknesses: string[];
  avg_score: number;
  recent_activity?: string;
}

export interface ChildProgress {
  id: string;
  childId: string;
  totalActivities: number;
  totalXp: number;
  currentLevel: number;
  avgScore: number;
  strengths: Record<string, number>;
  weaknesses: Record<string, number>;
  lastActivityAt: string;
  recentBadges?: string[];
}

// Friends System
export interface FriendRequest {
  id: string;
  from_child_id: string;
  to_child_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'canceled';
  created_at: string;
  responded_at?: string;
  requires_parent_approval?: boolean;
  approved_by_parent_user_id?: string | null;
  approved_at?: string | null;
  from_child?: { name: string; avatar: string }; 
  to_child?: { name: string; avatar: string };
}

export interface Friendship {
  id: string;
  friend_id: string;
  friend_name: string;
  friend_avatar: string;
  friend_xp: number;
  created_at?: string;
}

export interface ChildBlock {
  id: string;
  blocked_child: {
    id: string;
    name: string;
    avatar: string;
  };
  created_at: string;
}

export interface ChildNotification {
  id: string;
  child_id?: string; // Optional in frontend model
  title: string;
  type: 'friend_invite' | 'friend_accept' | 'friend_activity' | 'social_message' | 'info' | 'success' | 'warning' | 'error';
  message: string;
  read: boolean;
  metadata?: any;
  created_at?: string; // Legacy
  createdAt?: string; // Mapped
}

export interface FriendProfile {
  id: string;
  name: string;
  avatar: string;
  xp: number;
}
