
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SelectedChildProvider } from './contexts/SelectedChildContext';
import { StudentProvider } from './contexts/StudentContext';
import { FamilyChildrenProvider } from './contexts/FamilyChildrenContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DesktopHeader } from './components/DesktopHeader';
import { BottomNavWrapper } from './components/BottomNavWrapper';
import { ConnectivityBanner } from './components/ConnectivityBanner';
import { RoleManager } from './services/roleManager';
import { useChildren } from './hooks/useChildren';
import { useHistory } from './hooks/useHistory';
import { useBehavior } from './hooks/useBehavior';
import { GameSessionProvider } from './contexts/GameSessionContext';
import { GameLayout } from './layouts/GameLayout';

// Lazy load components
const StoryBookPage = lazy(() => import('./pages/student/stories/StoryBookPage').then(module => ({ default: module.StoryBookPage })));
const GameHubPage = lazy(() => import('./pages/games/GameHubPage').then(module => ({ default: module.GameHubPage })));
const MemoryGamePage = lazy(() => import('./pages/games/MemoryGamePage').then(module => ({ default: module.MemoryGamePage })));
const PegaCertoGamePage = lazy(() => import('./pages/games/PegaCertoGamePage').then(module => ({ default: module.PegaCertoGamePage })));
const RobotGamePage = lazy(() => import('./pages/games/RobotGamePage').then(module => ({ default: module.RobotGamePage })));
const CofreGamePage = lazy(() => import('./pages/games/CofreGamePage').then(module => ({ default: module.CofreGamePage })));

const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProgramPage = lazy(() => import('./pages/ProgramPage'));
const CreateExercisePage = lazy(() => import('./pages/CreateExercisePage'));
const ResultPage = lazy(() => import('./pages/ResultPage'));
const PrintExercisePage = lazy(() => import('./pages/PrintExercisePage'));
const QuizPage = lazy(() => import('./pages/QuizPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminExclusivePage = lazy(() => import('./pages/admin/AdminExclusivePage'));
const GuardianProfilePage = lazy(() => import('./pages/GuardianProfilePage'));
const ProgramsListPage = lazy(() => import('./pages/ProgramsListPage'));
const StudentDashboardPage = lazy(() => import('./pages/StudentDashboardPage'));
const LeituraGuiadaPage = lazy(() => import('./pages/LeituraGuiadaPage'));
const ReadingResultPage = lazy(() => import('./pages/ReadingResultPage'));
const ArtesCriativasPage = lazy(() => import('./pages/ArtesCriativasPage'));
const InglesTodoDiaPage = lazy(() => import('./pages/InglesTodoDiaPage'));
const BehaviorDashboardPage = lazy(() => import('./pages/BehaviorDashboardPage'));
const CheckInPage = lazy(() => import('./pages/CheckInPage'));
const ActionPlanPage = lazy(() => import('./pages/ActionPlanPage'));
const ChildDetailPage = lazy(() => import('./pages/ChildDetailPage'));
const ManageGoalsPage = lazy(() => import('./pages/ManageGoalsPage'));
const TeacherDashboardPage = lazy(() => import('./pages/teacher/TeacherDashboardPage'));
const TeacherClassesPage = lazy(() => import('./pages/teacher/TeacherClassesPage'));
const TeacherAssignmentsPage = lazy(() => import('./pages/teacher/TeacherAssignmentsPage'));
const DirectorDashboardPage = lazy(() => import('./pages/director/DirectorDashboardPage'));
const DirectorTeachersPage = lazy(() => import('./pages/director/DirectorTeachersPage'));
const DirectorImportPage = lazy(() => import('./pages/director/DirectorImportPage'));
const ClassDetailsPage = lazy(() => import('./pages/ClassDetailsPage'));
const TeacherCreateActivityPage = lazy(() => import('./pages/TeacherCreateActivityPage'));
const DailyPlanPage = lazy(() => import('./pages/DailyPlanPage'));
const DailySummaryPage = lazy(() => import('./pages/DailySummaryPage'));
const AlbumPage = lazy(() => import('./pages/AlbumPage'));
const CreativeMissionPage = lazy(() => import('./pages/CreativeMissionPage'));
const CorrectPhotoPage = lazy(() => import('./pages/CorrectPhotoPage'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const BillingReturnPage = lazy(() => import('./pages/BillingReturnPage'));
const AuthConfirmedPage = lazy(() => import('./pages/AuthConfirmedPage'));
const AuthResetPage = lazy(() => import('./pages/AuthResetPage'));
const CentralHistoryPage = lazy(() => import('./pages/CentralHistoryPage'));
const SchoolWallPage = lazy(() => import('./pages/SchoolWallPage').then(module => ({ default: module.SchoolWallPage })));
const FriendsPage = lazy(() => import('./pages/student/friends/FriendsPage').then(module => ({ default: module.FriendsPage })));
const StudentInboxPage = lazy(() => import('./pages/student/StudentInboxPage').then(module => ({ default: module.StudentInboxPage })));
const FriendProfilePage = lazy(() => import('./pages/student/friends/FriendProfilePage').then(module => ({ default: module.FriendProfilePage })));

const StudentMessagesInboxPage = lazy(() => import('./pages/student/messages/StudentMessagesInboxPage').then(module => ({ default: module.StudentMessagesInboxPage })));
const StudentConversationPage = lazy(() => import('./pages/student/messages/StudentConversationPage').then(module => ({ default: module.StudentConversationPage })));

// Public Pages (SEO)
const AboutPage = lazy(() => import('./pages/public/AboutPage').then(module => ({ default: module.AboutPage })));
const HowItWorksPage = lazy(() => import('./pages/public/HowItWorksPage').then(module => ({ default: module.HowItWorksPage })));
const ForParentsPage = lazy(() => import('./pages/public/ForParentsPage').then(module => ({ default: module.ForParentsPage })));
const ForStudentsPage = lazy(() => import('./pages/public/ForStudentsPage').then(module => ({ default: module.ForStudentsPage })));
const SecurityPage = lazy(() => import('./pages/public/SecurityPage').then(module => ({ default: module.SecurityPage })));
const ContactPage = lazy(() => import('./pages/public/ContactPage').then(module => ({ default: module.ContactPage })));

import { Child, Exercise, Guardian, AuthState, DailyCheckIn, BehaviorGoal, Subject, ClassGroup } from './types';
import { fetchTeacherClassrooms } from './services/classroomService';
import { supabase } from './services/supabase';

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-background-dark">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

const EducaSenseApp: React.FC = () => {
  console.log("[boot] App render", { t: Date.now() });
  const location = useLocation();
  console.log("[route] layout render", { path: location.pathname, hash: location.hash, t: Date.now() });
  
  // Analytics: Log Page Visits
  useEffect(() => {
    const logVisit = async () => {
      // Simple debounce or check to avoid duplicate logs if strict mode double-invokes
      try {
        // Check if analytics table exists or fail silently
        // Using Promise.race to avoid hanging if analytics is slow/blocked
        // Analytics should be strictly fire-and-forget
        const analyticsPromise = supabase.from('page_visits').insert({
          page_path: location.pathname
        }).then(({ error }) => {
           if (error) {
              // Silently ignore 404 or missing table errors for analytics
              if (error.code === '404' || error.code === 'PGRST204') return;
              console.warn('Analytics Error (non-critical):', error.message);
           }
        });
        
        // Don't await analytics
        // analyticsPromise.catch(() => {});
        
      } catch (err) {
        // Silently fail for analytics
      }
    };
    
    if (location.pathname) {
      logVisit();
    }
  }, [location.pathname]);

  const { user, profile, updateProfile, signOut, loading: authLoading } = useAuth();
  const { children, updateChild, addChild, loading: childrenLoading } = useChildren();
  const isAuthPending = authLoading || (!!user && !profile);
  const { history, saveToHistory, updateExercise, deleteExercise } = useHistory();
  const { checkIns, goals, addCheckIn, addGoal, deleteGoal, updateGoalProgress } = useBehavior();
  
  const auth: AuthState = {
    isAuthenticated: !!user,
    user: profile
  };

  const [classes, setClasses] = useState<ClassGroup[]>([]);

  useEffect(() => {
    if (profile?.role === 'teacher') {
      fetchTeacherClassrooms(profile.id).then(setClasses);
    }
  }, [profile]);

  const logout = async () => {
    await signOut();
    window.location.hash = '#/login';
  };

  const hidePaths = ['/', '/login', '/student', '/rotina/checkin', '/teacher/create', '/exercicio-facil/criar', '/admin/gestao-exclusiva', '/corrigir-foto', '/assinatura', '/billing/return', '/sobre', '/como-funciona', '/para-pais', '/para-alunos', '/seguranca-e-privacidade', '/contato'];
  const normalizePath = (p: string) => p.endsWith('/') && p.length > 1 ? p.slice(0, -1) : p;
  const currentPath = normalizePath(location.pathname);
  
  const shouldHideNav = hidePaths.some(path => currentPath === path) || 
                        location.pathname.startsWith('/exercicio-facil/quiz/') || 
                        location.pathname.startsWith('/child/');
  const showMobileNav = auth.isAuthenticated && !shouldHideNav && auth.user?.role !== 'admin';

  if (isAuthPending) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-400">
        <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold uppercase tracking-widest">Iniciando EducaSense...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-sans text-text-main">
      <ConnectivityBanner />
      <div className={`flex flex-col min-h-screen ${showMobileNav ? 'pb-16 md:pb-0' : ''}`}>
        <DesktopHeader isAuthenticated={auth.isAuthenticated} role={auth.user?.role} />
        
        <div className="flex-1 flex flex-col">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public SEO Pages */}
              <Route path="/sobre" element={<AboutPage />} />
              <Route path="/como-funciona" element={<HowItWorksPage />} />
              <Route path="/para-pais" element={<ForParentsPage />} />
              <Route path="/para-alunos" element={<ForStudentsPage />} />
              <Route path="/seguranca-e-privacidade" element={<SecurityPage />} />
              <Route path="/contato" element={<ContactPage />} />

              <Route path="/" element={
                auth.isAuthenticated ? (
                  auth.user?.role === 'teacher' ? <Navigate to="/teacher" /> : 
                  auth.user?.role === 'admin' ? <Navigate to="/admin/gestao-exclusiva" /> :
                  auth.user?.role === 'director' ? <Navigate to="/director/dashboard" /> :
                  <Navigate to="/dashboard" />
                ) : <LandingPage />
              } />
              <Route path="/login" element={!auth.isAuthenticated ? <LoginPage childrenList={children} /> : <Navigate to="/" />} />
            <Route path="/auth/confirmed" element={<AuthConfirmedPage />} />
            <Route path="/auth/reset" element={<AuthResetPage />} />
            <Route path="/student" element={<StudentDashboardPage children={children} history={history} onUpdateChild={updateChild} />} />
            <Route path="/student/stories" element={<StoryBookPage />} />
            <Route path="/student/friends" element={<FriendsPage />} />
            <Route path="/student/inbox" element={<StudentInboxPage />} />
            <Route path="/student/friends/:friendId" element={<FriendProfilePage />} />
            <Route path="/student/messages" element={<StudentMessagesInboxPage />} />
            <Route path="/student/messages/:friendId" element={<StudentConversationPage />} />
            
            <Route path="/perfil" element={<ProtectedRoute><GuardianProfilePage guardian={auth.user} onUpdate={updateProfile} onLogout={logout} /></ProtectedRoute>} />

            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['guardian']}><DashboardPage guardian={auth.user} children={children} history={history} /></ProtectedRoute>} />
            <Route path="/plano-hoje" element={<DailyPlanPage />} />
            <Route path="/resumo-hoje" element={<DailySummaryPage />} />
            <Route path="/meu-album" element={<AlbumPage />} />
            <Route path="/missao-criativa" element={<CreativeMissionPage />} />
            
            {/* Hub de Jogos (Sprint HubGames 1) */}
            <Route path="/hora-do-jogo" element={
              <GameSessionProvider>
                <GameLayout />
              </GameSessionProvider>
            }>
              <Route index element={<GameHubPage />} />
              <Route path="memory" element={<MemoryGamePage />} />
              <Route path="coleta" element={<PegaCertoGamePage />} />
              <Route path="robo" element={<RobotGamePage />} />
              <Route path="cofre" element={<CofreGamePage />} />
            </Route>

            <Route path="/corrigir-foto" element={<CorrectPhotoPage />} />
            <Route path="/assinatura" element={<SubscriptionPage />} />
            <Route path="/assinatura/sucesso" element={<BillingReturnPage />} />
            <Route path="/assinatura/erro" element={<BillingReturnPage />} />
            <Route path="/assinatura/pendente" element={<BillingReturnPage />} />
            <Route path="/child/:id" element={<ChildDetailPage children={children} history={history} />} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage children={children} onUpdateChild={updateChild} onAddChild={addChild} guardian={auth.user} /></ProtectedRoute>} />
            <Route path="/admin/gestao-exclusiva" element={<ProtectedRoute allowedRoles={['admin']}><AdminExclusivePage /></ProtectedRoute>} />
            
            {/* SCHOOL MODULE ROUTES */}
            <Route path="/director/dashboard" element={<ProtectedRoute allowedRoles={['director']}><DirectorDashboardPage /></ProtectedRoute>} />
            <Route path="/director/professores" element={<ProtectedRoute allowedRoles={['director']}><DirectorTeachersPage /></ProtectedRoute>} />

            <Route path="/school/wall" element={<ProtectedRoute><SchoolWallPage /></ProtectedRoute>} />

            <Route path="/teacher" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherDashboardPage /></ProtectedRoute>} />
            <Route path="/teacher/classes" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherClassesPage /></ProtectedRoute>} />
            <Route path="/teacher/assignments" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherAssignmentsPage /></ProtectedRoute>} />

            <Route path="/teacher/class/:id" element={<ClassDetailsPage classes={classes} children={children} history={history} />} />
            <Route path="/teacher/create" element={<TeacherCreateActivityPage teacher={auth.user} onSave={saveToHistory} />} />

            {/* Roteamento de Programas IA */}
            <Route path="/programas" element={<ProgramsListPage />} />
            <Route path="/exercicio-facil" element={<ProgramPage />} />
            <Route path="/exercicio-facil/criar" element={<CreateExercisePage children={children} onSave={saveToHistory} />} />
            <Route path="/exercicio-facil/historico" element={<HistoryPage history={history} onDeleteExercise={deleteExercise} />} />
            <Route path="/exercicio-facil/resultado/:id" element={<ResultPage history={history} />} />
            <Route path="/exercicio-facil/print/:id" element={<PrintExercisePage history={history} />} />
            <Route path="/exercicio-facil/quiz/:id" element={<QuizPage history={history} onUpdate={updateExercise} children={children} onUpdateChild={updateChild} />} />
            
            {/* Novas rotas de programas fixadas */}
            <Route path="/leitura-guiada" element={<LeituraGuiadaPage children={children} onSave={saveToHistory} />} />
            <Route path="/leitura-guiada/resultado/:id" element={<ReadingResultPage history={history} />} />
            <Route path="/artes-criativas" element={<ArtesCriativasPage children={children} onSave={saveToHistory} />} />
            <Route path="/ingles-todo-dia" element={<InglesTodoDiaPage children={children} onSave={saveToHistory} />} />
            
            {/* Rotas de Rotina */}
            <Route path="/rotina" element={<BehaviorDashboardPage children={children} checkIns={checkIns} goals={goals} onUpdateGoal={updateGoalProgress} />} />
            <Route path="/rotina/checkin" element={<CheckInPage children={children} onSave={addCheckIn} />} />
            <Route path="/rotina/plano" element={<ActionPlanPage children={children} checkIns={checkIns} />} />
            <Route path="/rotina/metas" element={<ManageGoalsPage children={children} goals={goals} onAddGoal={addGoal} onDeleteGoal={deleteGoal} />} />

            <Route path="/reports" element={<ReportsPage history={history} children={children} />} />
            
            <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
        </div>
        
        {showMobileNav && <BottomNavWrapper isAuthenticated={auth.isAuthenticated} role={auth.user?.role} />}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <HelmetProvider>
      <HashRouter>
        <AuthProvider>
          <StudentProvider>
            <FamilyChildrenProvider>
              <SelectedChildProvider>
                <EducaSenseApp />
              </SelectedChildProvider>
            </FamilyChildrenProvider>
          </StudentProvider>
        </AuthProvider>
      </HashRouter>
    </HelmetProvider>
  );
}
