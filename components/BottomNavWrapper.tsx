import React from 'react';
import { useLocation } from 'react-router-dom';
import { RoleSwitchButton } from './RoleSwitchButton';

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

export const BottomNavWrapper: React.FC<{ isAuthenticated: boolean, role?: string }> = ({ isAuthenticated, role }) => {
  const location = useLocation();
  const hidePaths = ['/', '/login', '/student', '/rotina/checkin', '/teacher/create', '/exercicio-facil/criar', '/admin/gestao-exclusiva', '/corrigir-foto', '/assinatura', '/billing/return'];
  const normalizePath = (p: string) => p.endsWith('/') && p.length > 1 ? p.slice(0, -1) : p;
  const currentPath = normalizePath(location.pathname);

  const shouldHide = hidePaths.some(path => currentPath === path) || 
                     location.pathname.startsWith('/exercicio-facil/quiz/') || 
                     location.pathname.startsWith('/child/');
  
  if (!isAuthenticated || shouldHide || role === 'admin') return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white/95 dark:bg-surface-dark/95 border-t border-gray-200 dark:border-gray-800 backdrop-blur-lg pt-2 pb-safe px-2 no-print">
      {role === 'teacher' ? (
        <div className="grid grid-cols-4 h-16 items-center">
          <NavButton icon="dashboard" label="Docente" to="/teacher" />
          <NavButton icon="campaign" label="Mural" to="/school/wall" />
          <NavButton icon="settings" label="Ajustes" to="/settings" />
          <RoleSwitchButton />
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
