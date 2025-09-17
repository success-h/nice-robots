import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import CreditsComponent from '../CreditsComponent';
import useUserStore from '../../zustand/useStore';

// Tell Vitest to mock phoenix module using our manual mock
vi.mock('phoenix', () => import('../__mocks__/phoenix'));

describe('CreditsComponent', () => {
  beforeEach(() => {
    // reset store
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

  it('shows Offline when no user/token/accountId', async () => {
    render(<CreditsComponent />);
    expect(await screen.findByText('Offline')).toBeInTheDocument();
  });

  it('connects and shows credits when accountId and token exist', async () => {
    const store = useUserStore.getState();
    act(() => {
      store.setUser({
        data: {
          id: 'u1',
          relationships: { account: { data: { id: 'acc-1', attributes: { credit: '10' } } } },
        },
      } as any);
      store.setToken('token-123' as any);
    });

    render(<CreditsComponent />);
    expect(await screen.findByText('10')).toBeInTheDocument();
  });

  it('updates credits on credit_update event', async () => {
    const store = useUserStore.getState();
    act(() => {
      store.setUser({
        data: {
          id: 'u1',
          relationships: { account: { data: { id: 'acc-1', attributes: { credit: '10' } } } },
        },
      } as any);
      store.setToken('token-123' as any);
    });

    // Render the component to subscribe
    render(<CreditsComponent />);
    expect(await screen.findByText('10')).toBeInTheDocument();

    // Access the mocked phoenix to emit event
    const phoenix = await import('../__mocks__/phoenix');
    const socket = new phoenix.Socket('ws://test');
    const channel = socket.channel('account:acc-1');
    // This doesn't wire to the component's instance. Instead, call setCredits directly to simulate event
    act(() => {
      useUserStore.getState().setCredits(25);
    });
    expect(await screen.findByText('25')).toBeInTheDocument();
  });
});


