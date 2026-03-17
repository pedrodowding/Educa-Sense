
export const ROLE_KEY = 'educa_role';

export type AppRole = 'guardian' | 'teacher' | 'director';

export const RoleManager = {
  getRole: (): AppRole => {
    const stored = localStorage.getItem(ROLE_KEY);
    // Return stored if valid, otherwise default to guardian
    if (stored === 'teacher' || stored === 'director') return stored;
    return 'guardian';
  },

  getStoredRole: (): AppRole | null => {
    const stored = localStorage.getItem(ROLE_KEY);
    if (stored === 'teacher' || stored === 'guardian' || stored === 'director') return stored as AppRole;
    return null;
  },

  setRole: (role: AppRole) => {
    console.log("RoleManager: setRole", role);
    localStorage.setItem(ROLE_KEY, role);
    window.dispatchEvent(new Event('role-change'));
  },

  clearRole: () => {
    localStorage.removeItem(ROLE_KEY);
    window.dispatchEvent(new Event('role-change'));
  }
};
