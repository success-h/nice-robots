import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SignInModal from '../SignInModal';
import useUserStore from '@/zustand/useStore';

// Mock GoogleLogin component to be a simple button calling success
vi.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ onSuccess, onError }: any) => (
    <button onClick={() => onSuccess?.({ credential: 'id-token' })}>Google</button>
  ),
}));

// Mock API hook
vi.mock('@/hooks/useApi', () => ({
  useApi: vi.fn(async () =>
    new Response(
      JSON.stringify({ data: { id: 'u1', relationships: { account: { data: { id: 'acc-1', attributes: { credit: '5' } } } } }, access_token: 'tok' }),
      { headers: { 'content-type': 'application/json' } }
    )
  ),
}));

describe('SignInModal', () => {
  beforeEach(() => {
    const { getState, setState } = useUserStore;
    setState({
      ...getState(),
      user: null,
      isLoggedIn: false,
      access_token: null,
      credits: 0,
      accountId: null,
    });
  });

  it('handles Google success and updates store', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    render(<SignInModal isOpen onClose={onClose} onSuccess={onSuccess} />);
    const btn = screen.getByText('Google');
    await act(async () => {
      fireEvent.click(btn);
    });
    const state = useUserStore.getState();
    expect(state.isLoggedIn).toBe(true);
    expect(state.accountId).toBe('acc-1');
    expect(state.credits).toBe(5);
    expect(onSuccess).toHaveBeenCalled();
  });
});


