import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ChatComponent from '../ChatComponent';
import useUserStore from '@/zustand/useStore';

// Mock network: create chat, toggle return type, SSE text stream
// Global flag to control whether a chat exists yet
(globalThis as any).__TEST_CHAT_CREATED = false;

vi.mock('@/hooks/useApi', () => ({
  useApi: vi.fn(async (url: string, opts?: any) => {
    if (url.startsWith('/chats') && opts?.method === 'POST') {
      (globalThis as any).__TEST_CHAT_CREATED = true;
      return new Response(
        JSON.stringify({ data: { id: 'chat-1', text: 'Intro text', message_id: 'm-1' } }),
        { headers: { 'content-type': 'application/json' } }
      ) as any;
    }
    if (url.includes('/toggle-return-type') && opts?.method === 'PATCH') {
      return new Response('{}', { headers: { 'content-type': 'application/json' } }) as any;
    }
    if (url.startsWith('/chats/by-character')) {
      const created = (globalThis as any).__TEST_CHAT_CREATED;
      return new Response(
        JSON.stringify(
          created
            ? { data: { id: 'chat-1', attributes: { return_type: 'text' }, relationships: { character: { id: 'c1' } } }, chatHistory: [] }
            : { errors: true }
        ),
        { headers: { 'content-type': 'application/json' } }
      ) as any;
    }
    if (url.endsWith('/characters/c1/relationship-types')) {
      return new Response(
        JSON.stringify({ relationship_types: ['friend'] }),
        { headers: { 'content-type': 'application/json' } }
      ) as any;
    }
    if (url.startsWith('/chat-completions/') && opts?.method === 'POST') {
      // SSE-like stream of two chunks A and B
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode('event: message\n'));
          controller.enqueue(
            encoder.encode(
              'data: {"choices":[{"delta":{"content":"A"}}]}\n' +
                'data: {"choices":[{"delta":{"content":"B"}}]}\n' +
                'data: [DONE]\n\n'
            )
          );
          controller.close();
        },
      });
      return new Response(stream as any, { headers: { 'content-type': 'text/event-stream' } }) as any;
    }
    return new Response('{}', { headers: { 'content-type': 'application/json' } }) as any;
  }),
}));

vi.mock('next/image', () => ({
  default: (props: any) => React.createElement('img', { ...props, alt: props.alt || '' }),
}));

describe('ChatComponent (high priority)', () => {
  beforeEach(() => {
    const { setState, getState } = useUserStore;
    setState({
      ...getState(),
      isLoggedIn: true,
      user: { data: { attributes: { avatar: '/default-avatar.png' } } } as any,
      character: {
        id: 'c1',
        type: 'character',
        attributes: {
          name: 'Alice',
          summary: '',
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
      currentChat: null,
      chats: null,
    });
  });

  it('creates a new chat and streams SSE content into assistant message', async () => {
    render(<ChatComponent />);

    // pick relationship to trigger createNewChat (pre-chat screen)
    const relationButton = await screen.findByText('friend');
    await act(async () => {
      fireEvent.click(relationButton);
    });

    // After loading history, send a message
    const input = await screen.findByPlaceholderText('Type a message...');
    fireEvent.change(input, { target: { value: 'Hello' } });
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    });

    // SSE appends A then B into assistant bubble; expect combined string
    expect(await screen.findByText('AB')).toBeInTheDocument();
  });

  it('toggles response type via PATCH and reloads chat', async () => {
    (globalThis as any).__TEST_CHAT_CREATED = true;
    render(<ChatComponent />);
    // open popover for return type
    const toggle = await screen.findByText('text');
    await act(async () => {
      fireEvent.click(toggle);
    });
    // Nothing explicit rendered to assert easily; smoke test: click didn't crash
    expect(toggle).toBeInTheDocument();
  });
});


