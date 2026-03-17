export interface StudentSession {
  childId: string;
  accessCode: string;
  guardianId?: string | null;
  createdAt: number;
  permissions?: {
    game: boolean;
    story: boolean;
    drawing: boolean;
  };
}

const SESSION_KEY = 'educasense_student_session';

export const getStudentSession = (): StudentSession | null => {
  try {
    const sessionStr = localStorage.getItem(SESSION_KEY);
    if (!sessionStr) return null;
    return JSON.parse(sessionStr) as StudentSession;
  } catch (error) {
    console.warn('Error parsing student session:', error);
    return null;
  }
};

export const setStudentSession = (session: StudentSession): void => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    // Disparar evento de storage para sincronizar abas/componentes
    window.dispatchEvent(new Event('storage'));
  } catch (error) {
    console.error('Error saving student session:', error);
  }
};

export const clearStudentSession = (): void => {
  localStorage.removeItem(SESSION_KEY);
  // Limpar também chaves legadas por garantia
  sessionStorage.removeItem('educasense_access_code');
  window.dispatchEvent(new Event('storage'));
};

export const hasActiveStudentSession = (): boolean => {
  const session = getStudentSession();
  return !!session && !!session.childId;
};
