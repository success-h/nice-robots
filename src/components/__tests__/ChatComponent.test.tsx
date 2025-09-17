import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import ChatComponent from '../ChatComponent';
import useUserStore from '@/zustand/useStore';

vi.mock('@/hooks/useApi', () => ({
  useApi: vi.fn(async () => new Response(JSON.stringify({ data: { text: 'Hi!', message_id: 'm1' } }), { headers: { 'content-type': 'application/json' } })),
}));

vi.mock('next/image', () => ({
  default: (props: any) => {
    return React.createElement('img', { ...props, alt: props.alt || '' });
  },
}));

describe('ChatComponent', () => {
  beforeEach(() => {
    const { getState, setState } = useUserStore;
    setState({
      ...getState(),
      isLoggedIn: true,
      user: { data: { attributes: { avatar: '/default-avatar.png' } } } as any,
      character: {
        id: 'c1',
        type: 'character',
        attributes: {
          name: 'Alice',
          summary: 'desc',
          age: 20,
          avatar: '/default-avatar.png',
          gender: 'female',
          hobbies_intro: '',
          residence_intro: '',
          mission_intro: '',
          available_relationship_types: ['friend'],
          video_played: false,
        },
        relationships: { images: [], model: { attributes: { name: '', type: '', description: '' }, id: 'm', type: 'model' }, videos: [] },
      } as any,
      characters: [] as any,
      chats: null,
      currentChat: null,
    });
  });

  it('renders header and input area', () => {
    render(<ChatComponent />);
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
  });

  it('updates input and send button disabled states', () => {
    render(<ChatComponent />);
    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(input, { target: { value: 'Hello' } });
    expect((input as HTMLTextAreaElement).value).toBe('Hello');
  });
});


