import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HomePageComponent from '../HomePageComponent';
import useUserStore from '@/zustand/useStore';

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: { data: [{ id: 'c1', attributes: { name: 'Alice', age: 20, avatar: '/default-avatar.png', summary: 'x' }, relationships: { images: [], model: { attributes: { name: '', type: '', description: '' }, id: 'm', type: 'model' }, videos: [] } }] }, isLoading: false }),
}));

vi.mock('@/hooks/useApi', () => ({
  useApi: vi.fn(async (url: string, opts?: any) => {
    if (url === '/users') {
      return new Response(JSON.stringify({ data: { id: 'user-1', attributes: { age_type: 'adult' } } }), { headers: { 'content-type': 'application/json' } }) as any;
    }
    return new Response('{}', { headers: { 'content-type': 'application/json' } }) as any;
  }),
}));

describe('HomePageComponent (high priority)', () => {
  beforeEach(() => {
    const { setState, getState } = useUserStore;
    setState({ ...getState(), isLoggedIn: false, user: null, currentChat: null, chats: null, characters: null });
  });

  it('when logged out and clicking a character, opens sign-in modal', async () => {
    render(<HomePageComponent access_token={undefined} />);
    const cardTitle = await screen.findByText(/Alice/);
    fireEvent.click(cardTitle);
    expect(await screen.findByText('Welcome Back')).toBeInTheDocument();
  });

  it('shows age-type modal when user missing age_type (after login flow)', async () => {
    const { setState, getState } = useUserStore;
    setState({ ...getState(), isLoggedIn: true, user: { data: { attributes: {} } } as any });
    render(<HomePageComponent access_token={'tok'} />);
    // AgeType modal should appear (checks modal header "Welcome!")
    expect(await screen.findByText('Welcome!')).toBeInTheDocument();
  });
});


