import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ProfileComponent from '../ProfileComponent';
import useUserStore from '@/zustand/useStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/hooks/useApi', () => ({
  useApi: vi.fn(async (url: string, opts?: any) => {
    if (url === '/users' && opts?.method === 'DELETE') {
      return new Response('{}', { headers: { 'content-type': 'application/json' } }) as any;
    }
    if (url === '/users/age-types') {
      return new Response(JSON.stringify({ age_types: ['adult'] }), { headers: { 'content-type': 'application/json' } }) as any;
    }
    return new Response('{}', { headers: { 'content-type': 'application/json' } }) as any;
  }),
}));

describe('ProfileComponent actions (high priority)', () => {
  beforeEach(() => {
    const { setState, getState } = useUserStore;
    setState({
      ...getState(),
      user: {
        data: {
          id: 'user-1',
          attributes: {
            name: 'Alice',
            avatar: '/default-avatar.png',
            language: 'English',
            age_type: 'adult',
            parent_ok: false,
          },
        },
      } as any,
      isLoggedIn: true,
    });
  });

  const wrap = (ui: React.ReactNode) => {
    const qc = new QueryClient();
    return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
  };

  it('opens delete dialog and confirms DELETE leads to logout', async () => {
    wrap(<ProfileComponent access_token={'tok'} />);
    const deleteBtn = await screen.findByText('Delete Account');
    fireEvent.click(deleteBtn);
    const confirm = await screen.findByText('Yes, Delete chat');
    await act(async () => {
      fireEvent.click(confirm);
    });
    expect(useUserStore.getState().isLoggedIn).toBe(false);
  });

  it('signs out via Sign Out button and logs out', () => {
    wrap(<ProfileComponent access_token={'tok'} />);
    const signOut = screen.getByText('Sign Out');
    fireEvent.click(signOut);
    expect(useUserStore.getState().isLoggedIn).toBe(false);
  });
});


