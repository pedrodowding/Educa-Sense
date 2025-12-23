
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
import { Child, Exercise, Guardian, AuthState, DailyCheckIn, BehaviorGoal } from './types';

const App: React.FC = () => {
  // --- Auth State ---
  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem('educasense_auth');
    return saved ? JSON.parse(saved) : { user: null, isAuthenticated: false };
  });

  // --- Children State ---
  const [children, setChildren] = useState<Child[]>(() => {
    const saved = localStorage.getItem('educasense_children');
    if (saved) {
      const parsed: Child[] = JSON.parse(saved);
      return parsed.map(c => ({
        ...c,
        xp: c.xp || 0,
        stars: c.stars || 0,
        streak: c.streak || 0,
        accessCode: c.accessCode || `${c.name.substring(0,3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`
      }));
    }
    return [
      { id: '1', name: 'Lucas', age: 8, grade: '3º Ano', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas', accessCode: 'LUC-452', xp: 120, stars: 45, streak: 3 },
      { id: '2', name: 'Sofia', age: 5, grade: 'Pré-escola', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sofia', accessCode: 'SOF-128', xp: 50, stars: 12, streak: 1 }
    ];
  });

  // --- Routine State ---
  const [checkIns, setCheckIns] = useState<DailyCheckIn[]>(() => {
    const saved = localStorage.getItem('educasense_checkins');
    return saved ? JSON.parse(saved) : [];
  });

  const [goals, setGoals] = useState<BehaviorGoal[]>(() => {
    const saved = localStorage.getItem('educasense_goals');
    return saved ? JSON.parse(saved) : [
      { id: 'g1', childId: '1', title: 'Rotina de Sono (Dormir às 21h)', targetDays: 7, completedDays: [] },
      { id: 'g2', childId: '1', title: 'Leitura Diária (15 min)', targetDays: 5, completedDays: [] }
    ];
  });

  // --- History State ---
  const [history, setHistory] = useState<Exercise[]>(() => {
    const saved = localStorage.getItem('educasense_history_v5');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('educasense_auth', JSON.stringify(auth));
    localStorage.setItem('educasense_children', JSON.stringify(children));
    localStorage.setItem('educasense_history_v5', JSON.stringify(history));
    localStorage.setItem('educasense_checkins', JSON.stringify(checkIns));
    localStorage.setItem('educasense_goals', JSON.stringify(goals));
  }, [auth, children, history, checkIns, goals]);

  const login = (email: string, name?: string) => {
    setAuth({
      isAuthenticated: true,
      user: { id: 'u1', name: name || 'Usuário', email, plan: 'Premium', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Parent' }
    });
  };

  const logout = () => setAuth({ user: null, isAuthenticated: false });

  const updateGuardian = (updates: Partial<Guardian>) => {
    if (auth.user) setAuth({ ...auth, user: { ...auth.user, ...updates } });
  };

  const updateChild = (id: string, updates: Partial<Child>) => {
    setChildren(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const addChild = (child: Child) => setChildren(prev => [...prev, child]);
  const saveToHistory = (exercise: Exercise) => setHistory(prev => [exercise, ...prev]);
  const updateExercise = (id: string, updates: Partial<Exercise>) => {
    setHistory(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const saveCheckIn = (checkIn: DailyCheckIn) => setCheckIns(prev => [checkIn, ...prev]);

  return (
    <HashRouter>
      <div className="flex justify-center bg-gray-100 min-h-screen">
        <div className="w-full max-w-md bg-background-light dark:bg-background-dark shadow-2xl relative flex flex-col min-h-screen overflow-hidden">
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage onLogin={login} children={children} />} />
              <Route path="/student" element={<StudentDashboardPage children={children} history={history} onUpdateChild={updateChild} />} />
              <Route path="/dashboard" element={auth.isAuthenticated ? <DashboardPage guardian={auth.user} children={children} /> : <Navigate to="/login" />} />
              <Route path="/perfil" element={<GuardianProfilePage guardian={auth.user} onUpdate={updateGuardian} onLogout={logout} />} />
              <Route path="/programas" element={<ProgramsListPage />} />
              <Route path="/exercicio-facil" element={<ProgramPage />} />
              <Route path="/exercicio-facil/criar" element={<CreateExercisePage children={children} onSave={saveToHistory} />} />
              <Route path="/exercicio-facil/resultado/:id" element={<ResultPage history={history} />} />
              <Route path="/exercicio-facil/quiz/:id" element={<QuizPage history={history} onUpdate={updateExercise} children={children} onUpdateChild={updateChild} />} />
              <Route path="/exercicio-facil/historico" element={<HistoryPage history={history} />} />
              <Route path="/leitura-guiada" element={<LeituraGuiadaPage children={children} onSave={saveToHistory} />} />
              <Route path="/artes-criativas" element={<ArtesCriativasPage children={children} onSave={saveToHistory} />} />
              <Route path="/ingles-todo-dia" element={<InglesTodoDiaPage children={children} onSave={saveToHistory} />} />
              
              {/* Routine Module Routes */}
              <Route path="/rotina" element={auth.isAuthenticated ? <BehaviorDashboardPage children={children} checkIns={checkIns} goals={goals} /> : <Navigate to="/login" />} />
              <Route path="/rotina/checkin" element={<CheckInPage children={children} onSave={saveCheckIn} />} />
              <Route path="/rotina/plano" element={<ActionPlanPage children={children} checkIns={checkIns} />} />
              
              <Route path="/reports" element={<ReportsPage history={history} />} />
              <Route path="/settings" element={<SettingsPage children={children} onUpdateChild={updateChild} onAddChild={addChild} />} />
              <Route path="/admin" element={<AdminDashboardPage history={history} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
          <BottomNavWrapper isAuthenticated={auth.isAuthenticated} />
        </div>
      </div>
    </HashRouter>
  );
};

const BottomNavWrapper: React.FC<{ isAuthenticated: boolean }> = ({ isAuthenticated }) => {
  const location = useLocation();
  const hidePaths = ['/', '/login', '/exercicio-facil/criar', '/exercicio-facil/quiz', '/student', '/leitura-guiada', '/artes-criativas', '/ingles-todo-dia', '/rotina/checkin'];
  const shouldHide = hidePaths.some(path => location.pathname === path || location.pathname.startsWith('/exercicio-facil/quiz/'));
  if (!isAuthenticated || shouldHide) return null;
  return (
    <nav className="sticky bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-surface-dark/95 border-t border-gray-200 dark:border-gray-800 backdrop-blur-lg pt-2 pb-safe px-2 no-print">
      <div className="grid grid-cols-5 h-16 items-center">
        <NavButton icon="home" label="Início" to="/dashboard" />
        <NavButton icon="assignment" label="Rotina" to="/rotina" />
        <NavButton icon="school" label="Programas" to="/programas" />
        <NavButton icon="bar_chart" label="Relatórios" to="/reports" />
        <NavButton icon="settings" label="Ajustes" to="/settings" />
      </div>
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
