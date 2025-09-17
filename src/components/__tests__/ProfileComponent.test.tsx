import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ProfileComponent from '../ProfileComponent';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useUserStore from '@/zustand/useStore';

vi.mock('@/hooks/useApi', () => ({
  useApi: vi.fn(async (url: string, opts?: any) => {
    if (url === '/users/age-types') {
      return new Response(JSON.stringify({ age_types: ['teen', 'adult'] }), {
        headers: { 'content-type': 'application/json' },
      }) as any;
    }
    if (url === '/users' && opts?.method === 'PATCH') {
      return new Response(
        JSON.stringify({ data: { id: 'u1', attributes: { name: 'New Name' } } }),
        { headers: { 'content-type': 'application/json' } }
      ) as any;
    }
    if (url === '/users' && opts?.method === 'DELETE') {
      return new Response('{}', { headers: { 'content-type': 'application/json' } }) as any;
    }
    return new Response('{}') as any;
  }),
}));

describe('ProfileComponent', () => {
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

  it('renders profile header and fields', () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <ProfileComponent access_token={undefined} />
      </QueryClientProvider>
    );
    expect(screen.getByText('Profile Settings')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Language')).toBeInTheDocument();
  });

  it('enters edit mode and submits update', async () => {
    const qc = new QueryClient();
    render(
      <QueryClientProvider client={qc}>
        <ProfileComponent access_token={'tok'} />
      </QueryClientProvider>
    );
    const editBtn = screen
      .getAllByRole('button')
      .find((b) => b.className.includes('bg-pink-500'))!;
    fireEvent.click(editBtn);
    const nameInput = await screen.findByPlaceholderText('Enter your name');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    // Submit (the check icon button)
    const submitButton = screen.getAllByRole('button').find((b) => b.className.includes('bg-green-500'))!;
    await act(async () => {
      fireEvent.click(submitButton);
    });
    expect(useUserStore.getState().user?.data?.attributes?.name).toBe('New Name');
  });
});


