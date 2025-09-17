import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import HomePageComponent from '../HomePageComponent';
import useUserStore from '@/zustand/useStore';

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: { data: [] }, isLoading: false }),
}));

vi.mock('@/hooks/useApi', () => ({
  useApi: vi.fn(async () => new Response(JSON.stringify({ data: [] }), { headers: { 'content-type': 'application/json' } })),
}));

describe('HomePageComponent', () => {
  beforeEach(() => {
    const { getState, setState } = useUserStore;
    setState({
      ...getState(),
      isLoggedIn: false,
      user: null,
    });
  });

  it('shows login buttons when logged out', () => {
    render(<HomePageComponent access_token={undefined} />);
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('shows CreditsComponent section when logged in', () => {
    const { setState } = useUserStore;
    act(() => {
      setState((s: any) => ({ ...s, isLoggedIn: true, user: { data: { attributes: {} } } }));
    });
    render(<HomePageComponent access_token={undefined} />);
    // By structure, it should render header; smoke test looking for My Profile
    expect(screen.getByText('My Profile')).toBeInTheDocument();
  });
});


