import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import NotificationsBell from '../pages/components/NotificationsBell';
import { getUserTier } from '../billing/entitlements';

const DesktopNavLink: React.FC<{ to: string, label: string, icon: string }> = ({ to, label, icon }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <button 
      onClick={() => window.location.hash = `#${to}`}
      className={`flex items-center gap-2 font-bold text-sm transition-colors ${isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
    >
      <span className={`material-symbols-outlined text-xl ${isActive ? 'filled' : ''}`}>{icon}</span>
      {label}
    </button>
  );
};

export const DesktopHeader: React.FC<{ isAuthenticated: boolean, role?: string }> = ({ isAuthenticated, role }) => {
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const hidePaths = ['/', '/login', '/student', '/rotina/checkin', '/teacher/create', '/admin/gestao-exclusiva', '/corrigir-foto', '/assinatura', '/billing/return'];
  const shouldHide = hidePaths.some(path => location.pathname === path || location.pathname.startsWith('/exercicio-facil/quiz/') || location.pathname.startsWith('/child/'));
  
  const isFree = getUserTier() === 'FREE';

  const handleLogout = async () => {
    await signOut();
    window.location.hash = '#/login';
  };

  if (!isAuthenticated || shouldHide || role === 'admin') return null;

  return (
    <header className="flex h-16 md:h-20 bg-white dark:bg-surface-dark border-b border-gray-100 dark:border-gray-800 px-4 md:px-8 items-center justify-between sticky top-0 z-50 transition-all">
       <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
         <div className="size-8 md:size-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
           <span className="material-symbols-outlined text-black text-lg md:text-xl">school</span>
         </div>
         <div>
           <h1 className="text-base md:text-lg font-black leading-tight text-gray-900 dark:text-white">
             <span className="md:hidden">Dashboard</span>
             <span className="hidden md:inline">Educa Sense</span>
           </h1>
           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider hidden md:block">{role === 'teacher' ? 'Docente' : 'Dashboard Pais'}</p>
         </div>
       </div>

       <nav className="hidden md:flex items-center gap-8">
          {role === 'teacher' ? (
            <>
              <DesktopNavLink to="/teacher" label="Docente" icon="dashboard" />
              <DesktopNavLink to="/school/wall" label="Mural" icon="campaign" />
              <DesktopNavLink to="/settings" label="Ajustes" icon="settings" />
            </>
          ) : (
            <>
              <DesktopNavLink to="/dashboard" label="Início" icon="home" />
              <DesktopNavLink to="/rotina" label="Rotina" icon="assignment" />
              <DesktopNavLink to="/programas" label="Programas" icon="school" />
              <DesktopNavLink to="/school/wall" label="Mural" icon="campaign" />
              <DesktopNavLink to="/reports" label="Relatórios" icon="bar_chart" />
              <DesktopNavLink to="/settings" label="Ajustes" icon="settings" />
            </>
          )}
       </nav>

       <div className="flex items-center gap-3 md:gap-4">
          {!isFree && (
            <div className="hidden lg:flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-500 px-3 py-1.5 rounded-lg font-bold text-xs">
              <span className="material-symbols-outlined text-sm filled">bolt</span>
              <span>Premium Ativo</span>
            </div>
          )}
           <NotificationsBell />
           <button 
             onClick={handleLogout}
             className="flex items-center gap-2 text-gray-400 hover:text-red-500 transition-colors p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20"
             title="Sair"
           >
             <span className="material-symbols-outlined">logout</span>
             <span className="hidden lg:inline text-xs font-bold uppercase tracking-wider">Sair</span>
           </button>
       </div>
    </header>
  );
};
