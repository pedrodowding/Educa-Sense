import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<Props> = ({ children, allowedRoles }) => {
  const { profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-400">
        <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold uppercase tracking-widest">Verificando acesso...</p>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Debug log
  console.log("guard role", profile.role, "route", location.pathname);

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    const targetPath = profile.role === 'teacher'
      ? '/teacher'
      : profile.role === 'admin'
        ? '/admin/gestao-exclusiva'
        : profile.role === 'director'
          ? '/director/dashboard'
          : '/dashboard';

    if (targetPath === location.pathname) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-400">
          <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm font-bold uppercase tracking-widest">Acesso negado</p>
        </div>
      );
    }

    return <Navigate to={targetPath} replace />;
  }

  return <>{children}</>;
};
