
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProgramPage from './pages/ProgramPage';
import CreateExercisePage from './pages/CreateExercisePage';
import ResultPage from './pages/ResultPage';
import QuizPage from './pages/QuizPage';
import HistoryPage from './pages/HistoryPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import GuardianProfilePage from './pages/GuardianProfilePage';
import ProgramsListPage from './pages/ProgramsListPage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import LeituraGuiadaPage from './pages/LeituraGuiadaPage';
import ArtesCriativasPage from './pages/ArtesCriativasPage';
import InglesTodoDiaPage from './pages/InglesTodoDiaPage';
import BehaviorDashboardPage from './pages/BehaviorDashboardPage';
import CheckInPage from './pages/CheckInPage';
import ActionPlanPage from './pages/ActionPlanPage';
import ChildDetailPage from './pages/ChildDetailPage';
import ManageGoalsPage from './pages/ManageGoalsPage';
import TeacherDashboardPage from './pages/TeacherDashboardPage';
import ClassDetailsPage from './pages/ClassDetailsPage';
import TeacherCreateActivityPage from './pages/TeacherCreateActivityPage';
import { Child, Exercise, Guardian, AuthState, DailyCheckIn, BehaviorGoal, Subject, ClassGroup } from './types';

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem('educasense_auth');
    return saved ? JSON.parse(saved) : { user: null, isAuthenticated: false };
  });

  const [children, setChildren] = useState<Child[]>(() => {
    const saved = localStorage.getItem('educasense_children');
    if (saved) return JSON.parse(saved);
    return [
      { id: '1', name: 'Lucas', age: 8, grade: '3º Ano', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas', accessCode: 'LUC-452', xp: 120, stars: 45, streak: 3, difficultySubjects: [Subject.MATH] },
      { id: '2', name: 'Sofia', age: 5, grade: 'Pré-escola', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sofia', accessCode: 'SOF-128', xp: 50, stars: 12, streak: 1, difficultySubjects: [Subject.PORTUGUESE] }
    ];
  });

  const [classes] = useState<ClassGroup[]>([
    { id: 'c1', name: '3º Ano B', grade: '3º Ano', studentCount: 24, engagement: 82 },
    { id: 'c2', name: 'Pré-escola A', grade: 'Pré-escola', studentCount: 18, engagement: 95 }
  ]);

  const [history, setHistory] = useState<Exercise[]>(() => {
    const saved = localStorage.getItem('educasense_history_v5');
    return saved ? JSON.parse(saved) : [];
  });

  const [checkIns, setCheckIns] = useState<DailyCheckIn[]>([]);
  const [goals, setGoals] = useState<BehaviorGoal[]>([]);

  useEffect(() => {
    localStorage.setItem('educasense_auth', JSON.stringify(auth));
    localStorage.setItem('educasense_children', JSON.stringify(children));
    localStorage.setItem('educasense_history_v5', JSON.stringify(history));
  }, [auth, children, history]);

  const login = (email: string, role: 'guardian' | 'teacher' = 'guardian', name?: string) => {
    setAuth({
      isAuthenticated: true,
      user: { 
        id: role === 'teacher' ? 't1' : 'u1', 
        name: name || (role === 'teacher' ? 'Prof. Ricardo' : 'Usuário'), 
        email, 
        plan: 'Premium', 
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${role}`,
        role 
      }
    });
  };

  const logout = () => {
    setAuth({ user: null, isAuthenticated: false });
    window.location.hash = '#/login';
  };

  const saveToHistory = (exercise: Exercise) => setHistory(prev => [exercise, ...prev]);

  const updateChild = (id: string, updates: Partial<Child>) => {
    setChildren(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const addCheckIn = (checkIn: DailyCheckIn) => setCheckIns(prev => [checkIn, ...prev]);
  const addGoal = (goal: BehaviorGoal) => setGoals(prev => [goal, ...prev]);
  const deleteGoal = (id: string) => setGoals(prev => prev.filter(g => g.id !== id));

  return (
    <HashRouter>
      <div className="flex justify-center bg-gray-100 min-h-screen">
        <div className="w-full max-w-md bg-background-light dark:bg-background-dark shadow-2xl relative flex flex-col min-h-screen overflow-hidden">
          
          <div className="bg-yellow-400 text-black text-[9px] font-black uppercase text-center py-1 tracking-widest z-[100] no-print">
            Modo Demonstração • Dados Simulados
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage onLogin={login} children={children} />} />
              <Route path="/student" element={<StudentDashboardPage children={children} history={history} onUpdateChild={updateChild} />} />
              
              <Route path="/perfil" element={auth.isAuthenticated ? <GuardianProfilePage guardian={auth.user} onUpdate={() => {}} onLogout={logout} /> : <Navigate to="/login" />} />

              <Route path="/dashboard" element={auth.isAuthenticated && auth.user?.role === 'guardian' ? <DashboardPage guardian={auth.user} children={children} history={history} /> : <Navigate to="/login" />} />
              <Route path="/child/:id" element={<ChildDetailPage children={children} history={history} />} />
              <Route path="/settings" element={auth.isAuthenticated ? <SettingsPage children={children} onUpdateChild={updateChild} onAddChild={() => {}} guardian={auth.user} /> : <Navigate to="/login" />} />
              
              <Route path="/teacher" element={auth.isAuthenticated && auth.user?.role === 'teacher' ? <TeacherDashboardPage teacher={auth.user} classes={classes} /> : <Navigate to="/login" />} />
              <Route path="/teacher/class/:id" element={<ClassDetailsPage classes={classes} children={children} history={history} />} />
              <Route path="/teacher/create" element={<TeacherCreateActivityPage teacher={auth.user} onSave={saveToHistory} />} />

              {/* Roteamento de Programas IA */}
              <Route path="/programas" element={<ProgramsListPage />} />
              <Route path="/exercicio-facil" element={<ProgramPage />} />
              <Route path="/exercicio-facil/criar" element={<CreateExercisePage children={children} onSave={saveToHistory} />} />
              <Route path="/exercicio-facil/resultado/:id" element={<ResultPage history={history} />} />
              <Route path="/exercicio-facil/quiz/:id" element={<QuizPage history={history} onUpdate={() => {}} children={children} onUpdateChild={updateChild} />} />
              
              {/* Novas rotas de programas fixadas */}
              <Route path="/leitura-guiada" element={<LeituraGuiadaPage children={children} onSave={saveToHistory} />} />
              <Route path="/artes-criativas" element={<ArtesCriativasPage children={children} onSave={saveToHistory} />} />
              <Route path="/ingles-todo-dia" element={<InglesTodoDiaPage children={children} onSave={saveToHistory} />} />
              
              {/* Rotas de Rotina */}
              <Route path="/rotina" element={<BehaviorDashboardPage children={children} checkIns={checkIns} goals={goals} />} />
              <Route path="/rotina/checkin" element={<CheckInPage children={children} onSave={addCheckIn} />} />
              <Route path="/rotina/plano" element={<ActionPlanPage children={children} checkIns={checkIns} />} />
              <Route path="/rotina/metas" element={<ManageGoalsPage children={children} goals={goals} onAddGoal={addGoal} onDeleteGoal={deleteGoal} />} />

              <Route path="/reports" element={<ReportsPage history={history} children={children} />} />
              
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
          <BottomNavWrapper isAuthenticated={auth.isAuthenticated} role={auth.user?.role} />
        </div>
      </div>
    </HashRouter>
  );
};

const BottomNavWrapper: React.FC<{ isAuthenticated: boolean, role?: string }> = ({ isAuthenticated, role }) => {
  const location = useLocation();
  const hidePaths = ['/', '/login', '/student', '/rotina/checkin', '/teacher/create'];
  const shouldHide = hidePaths.some(path => location.pathname === path || location.pathname.startsWith('/exercicio-facil/quiz/') || location.pathname.startsWith('/child/'));
  
  if (!isAuthenticated || shouldHide) return null;

  return (
    <nav className="sticky bottom-0 left-0 right-0 z-[60] bg-white/95 dark:bg-surface-dark/95 border-t border-gray-200 dark:border-gray-800 backdrop-blur-lg pt-2 pb-safe px-2 no-print">
      {role === 'teacher' ? (
        <div className="grid grid-cols-4 h-16 items-center">
          <NavButton icon="dashboard" label="Turmas" to="/teacher" />
          <NavButton icon="add_box" label="Criar" to="/teacher/create" />
          <NavButton icon="analytics" label="Insights" to="/reports" />
          <NavButton icon="account_circle" label="Perfil" to="/perfil" />
        </div>
      ) : (
        <div className="grid grid-cols-5 h-16 items-center">
          <NavButton icon="home" label="Início" to="/dashboard" />
          <NavButton icon="assignment" label="Rotina" to="/rotina" />
          <NavButton icon="school" label="Programas" to="/programas" />
          <NavButton icon="bar_chart" label="Relatórios" to="/reports" />
          <NavButton icon="settings" label="Ajustes" to="/settings" />
        </div>
      )}
    </nav>
  );
};

const NavButton: React.FC<{ icon: string; label: string; to: string }> = ({ icon, label, to }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <button onClick={() => (window.location.hash = `#${to}`)} className={`flex flex-col items-center justify-center gap-1 transition-all active:scale-90 ${isActive ? 'text-primary' : 'text-gray-400'}`}>
      <span className={`material-symbols-outlined ${isActive ? 'filled' : ''}`}>{icon}</span>
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
};

export default App;
