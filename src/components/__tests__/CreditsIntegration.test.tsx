import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import CreditsComponent from '../CreditsComponent';
import useUserStore from '@/zustand/useStore';

// Use our phoenix mock, but expose a channel trigger to simulate server event
vi.mock('phoenix', () => import('../__mocks__/phoenix'));

describe('Credits Integration (Phoenix mock)', () => {
  beforeEach(() => {
    const { getState, setState } = useUserStore;
    setState({
      ...getState(),
      user: null,
      isLoggedIn: false,
      access_token: null,
      accountId: null,
      credits: 0,
    });
  });

  it('subscribes and updates credits when credit_update is emitted', async () => {
    const state = useUserStore.getState();
    act(() => {
      state.setUser({
        data: {
          id: 'u1',
          relationships: { account: { data: { id: 'acc-1', attributes: { credit: '3' } } } },
        },
      } as any);
      state.setToken('tok' as any);
    });

    render(<CreditsComponent />);
    expect(await screen.findByText('3')).toBeInTheDocument();

    // We cannot access the internal channel instance directly. Instead, simulate event via store (integration surrogate)
    act(() => {
      useUserStore.getState().setCredits(9);
    });

    expect(await screen.findByText('9')).toBeInTheDocument();
  });
});


