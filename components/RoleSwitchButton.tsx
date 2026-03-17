import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export const RoleSwitchButton: React.FC = () => {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    window.location.hash = '#/login';
  };

  return (
    <button onClick={handleLogout} className="flex flex-col items-center justify-center gap-1 transition-all active:scale-90 text-gray-400 hover:text-red-500">
      <span className="material-symbols-outlined">logout</span>
      <span className="text-[10px] font-bold uppercase tracking-wider">Sair</span>
    </button>
  );
};
