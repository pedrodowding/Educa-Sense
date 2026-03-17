import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { GameSessionProvider, useGameSession } from './GameSessionContext';
import { supabase } from '../services/supabase';

// Mock dependencies
vi.mock('../services/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

vi.mock('./SelectedChildContext', () => ({
  useSelectedChild: vi.fn(),
}));

import { useSelectedChild } from './SelectedChildContext';

// Helper component to expose context
const TestComponent = () => {
  const { status, isLoading, error } = useGameSession();
  return (
    <div>
      <div data-testid="status">{status}</div>
      <div data-testid="loading">{isLoading ? 'true' : 'false'}</div>
      <div data-testid="error">{error || 'null'}</div>
    </div>
  );
};

describe('GameSessionContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not be loading when no child is selected', async () => {
    (useSelectedChild as any).mockReturnValue({ selectedChild: null });

    render(
      <GameSessionProvider>
        <TestComponent />
      </GameSessionProvider>
    );

    // Initial state might be loading for a split second, but should resolve to false
    // checkSession is called in useEffect
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
  });

  it('should handle session check timeout gracefully', async () => {
    (useSelectedChild as any).mockReturnValue({ selectedChild: { id: 'child-1' } });
    
    // Mock RPC to hang forever (return a promise that never resolves)
    (supabase.rpc as any).mockImplementation(() => new Promise(() => {}));

    render(
      <GameSessionProvider>
        <TestComponent />
      </GameSessionProvider>
    );

    // Should be loading initially
    expect(screen.getByTestId('loading').textContent).toBe('true');

    // Fast-forward time past the 5s timeout
    await React.act(async () => {
      vi.advanceTimersByTime(6000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('status').textContent).toBe('error');
      expect(screen.getByTestId('error').textContent).toBe('Tempo limite excedido ao carregar sessão');
    });
  });

  it('should load session successfully', async () => {
    (useSelectedChild as any).mockReturnValue({ selectedChild: { id: 'child-1' } });
    
    (supabase.rpc as any).mockResolvedValue({
      data: { allowed: true, status: 'active', duration_minutes: 20, started_at: new Date().toISOString() },
      error: null
    });

    render(
      <GameSessionProvider>
        <TestComponent />
      </GameSessionProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('status').textContent).toBe('active');
    });
  });
});
