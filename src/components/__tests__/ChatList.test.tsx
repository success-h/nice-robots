import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatList from '../ChatList';

const character = {
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
    available_relationship_types: [],
  },
  relationships: { images: [], model: { attributes: { name: '', type: '', description: '' }, id: 'm', type: 'model' }, videos: [] },
} as any;

const chatData = {
  data: { id: 'ch1', relationships: { character: { id: 'c1' } }, attributes: {} },
  chatHistory: [{ role: 'user', content: 'Hello' }],
} as any;

describe('ChatList', () => {
  it('renders characters and handles click', () => {
    const setCharacter = vi.fn();
    const handleDeleteChat = vi.fn();
    render(
      <ChatList
        characters={[character]}
        chats={[chatData]}
        setCharacter={setCharacter}
        currentChat={chatData}
        handleDeleteChat={handleDeleteChat}
        deleteLoading={false}
        updateCharacterVideoPlayed={vi.fn()}
      />
    );
    expect(screen.getByText('Alice')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Alice'));
    expect(setCharacter).toHaveBeenCalled();
  });
});
