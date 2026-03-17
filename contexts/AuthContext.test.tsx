import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';
import { supabase } from '../services/supabase';

// Mock supabase
vi.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(),
      getUser: vi.fn(),
      updateUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: null, error: null })),
          })),
        })),
      })),
    })),
  },
}));

// Mock services
vi.mock('../services/sessions', () => ({
  startUserSession: vi.fn(),
  endUserSession: vi.fn(),
}));

vi.mock('../services/roleManager', () => ({
  RoleManager: {
    getStoredRole: vi.fn(),
  },
}));

vi.mock('../billing/entitlements', () => ({
  setUserTier: vi.fn(),
}));

// Component to test hook
const TestComponent = () => {
  const { signOut } = useAuth();
  return <button onClick={signOut}>Sign Out</button>;
};

describe('AuthContext', () => {
  const mockLocation = { href: '' };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
    });
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        clear: vi.fn(),
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });
  });

  it('signOut clears storage and reloads page', async () => {
    // Setup getSession to return null to avoid auto-login logic affecting test
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null }, error: null });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const button = screen.getByText('Sign Out');
    await act(async () => {
      button.click();
    });

    expect(localStorage.clear).toHaveBeenCalled();
    expect(window.location.href).toBe('/');
  });

  it('handles Refresh Token error in getSession', async () => {
    // Mock console.warn to verify it's called
    const consoleSpy = vi.spyOn(console, 'warn');
    
    // Setup getSession to return error
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid Refresh Token' },
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid session detected'));
      expect(localStorage.clear).toHaveBeenCalled();
      expect(window.location.href).toBe('/');
    });
  });
});
