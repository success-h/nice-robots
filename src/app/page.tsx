'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Menu, User, Crown, Loader } from 'lucide-react';
import useUserStore, { CharacterData } from '../zustand/useStore';
import { useApi } from '../hooks/useApi';
import SignInModal from '../components/SignInModal';
import Image from 'next/image';
import { parseApiResponse } from '@/lib/utils';
import Link from 'next/link';

const getCharacters = async () => {
  try {
    const response = await useApi('/characters', {
      method: 'GET',
    });
    return response.json();
  } catch (error) {
    return { data: [] };
  }
};

export default function HomePage() {
  const [selectedCharacter, setSelectedCharacter] =
    useState<CharacterData | null>(null);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    user,
    setCharacters,
    characters,
    chats,
    setChats,
    setCurrentChat,
    setCharacter,
    response_type,
    isLoggedIn,
    currentChat,
  } = useUserStore();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['characters'],
    queryFn: getCharacters,
  });

  useEffect(() => {
    if (data?.data && Array.isArray(data.data)) {
      setCharacters(data.data);
    }
  }, [data, setCharacters]);

  const getSortedCharacters = () => {
    if (!characters) return [];

    // Get character IDs that already have active chats
    const activeCharacterIds =
      chats?.map((chat) => chat?.data?.relationships?.character?.id) || [];

    // Separate active and available characters
    const activeCharacters = characters.filter((character) =>
      activeCharacterIds.includes(character.id)
    );

    const availableCharacters = characters.filter(
      (character) => !activeCharacterIds.includes(character.id)
    );

    // Return active characters first, then available ones
    return [...activeCharacters, ...availableCharacters];
  };

  const handleCharacterClick = async (character: CharacterData) => {
    if (!isLoggedIn) {
      setSelectedCharacter(character);
      setShowSignInModal(true);
      return;
    }
    setCharacter(character);
    try {
      // Check if chat already exists
      setLoading(true);
      const existingChat = chats?.find(
        (chat) => chat?.data?.relationships?.character.id === character.id
      );

      if (existingChat) {
        setCurrentChat(existingChat);
        router.push('/chat');
        return;
      }

      const response = await useApi(
        '/chats',
        {
          method: 'POST',
          body: JSON.stringify({
            data: {
              attributes: {
                character_id: character.id,
                relationship_type:
                  character.attributes.available_relationship_types[0] ||
                  'friend',
                return_type: response_type,
              },
            },
          }),
        },
        user?.access_token
      );

      const data = await parseApiResponse(response);
      setCurrentChat(data);
      setChats(data);
      router.push('/chat');
      setLoading(false);
    } catch (error) {
      console.error('Error creating/fetching chat:', error);

      try {
        const response = await useApi(
          `/chats/by-character/${selectedCharacter?.id}`,
          {
            method: 'GET',
          },
          user?.access_token
        );
        const data = await response.json();
        setCharacter(selectedCharacter);
        setLoading(false);
        router.push('/chat');
        return data;
      } catch (error) {
        console.log('err:', error);
        setLoading(false);
      }
    }
  };

  const handleSignInSuccess = () => {
    setShowSignInModal(false);
    if (selectedCharacter) {
      setCharacter(selectedCharacter);
      router.push('/chat');
    }
  };

  const isCharacterActive = (characterId: string) => {
    const activeCharacterIds =
      chats?.map((chat) => chat?.data?.relationships?.character?.id) || [];
    return activeCharacterIds.includes(characterId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  const sortedCharacters = getSortedCharacters();

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-gray-900 border-r border-gray-800 z-30">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-8">
            candy<span className="text-pink-500">.ai</span>
          </h1>

          <nav className="space-y-4">
            <button className="cursor-pointer flex items-center space-x-3 w-full text-left p-3 rounded-lg bg-gray-800 text-white">
              <User className="h-5 w-5" />
              <span>Explore</span>
            </button>
            <button
              onClick={() => {
                currentChat?.data
                  ? router.push('/chat')
                  : handleCharacterClick(sortedCharacters[0]);
              }}
              className="cursor-pointer flex items-center space-x-3 w-full text-left p-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <span>💬</span>
              <span>Chat</span>
            </button>
            {/* <button className="flex items-center space-x-3 w-full text-left p-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
              <span>📁</span>
              <span>Collection</span>
            </button>
            <button className="flex items-center space-x-3 w-full text-left p-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
              <span>🎨</span>
              <span>Generate Image</span>
            </button>
            <button className="flex items-center space-x-3 w-full text-left p-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
              <span>⚡</span>
              <span>Create Character</span>
            </button>
            <button className="flex items-center space-x-3 w-full text-left p-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
              <span>🤖</span>
              <span>My AI</span>
            </button> */}
          </nav>

          {/* <div className="mt-8 pt-6 border-t border-gray-800">
            <button className="flex items-center space-x-3 w-full text-left p-3 rounded-lg text-pink-500 hover:bg-gray-800 transition-colors">
              <Crown className="h-5 w-5" />
              <span>Become Premium</span>
            </button>
          </div> */}

          <div className="absolute bottom-6 left-6 right-6 space-y-3">
            <Link
              href={'/profile'}
              className="flex  cursor-pointer items-center space-x-3 w-full text-left text-gray-400 hover:text-white"
            >
              <span>
                <User className="w-4 h-4" />
              </span>
              <span>Profile settings</span>
            </Link>
            <button className="flex  cursor-pointer items-center space-x-3 w-full text-left text-gray-400 hover:text-white">
              <span>💬</span>
              <span>Discord</span>
            </button>
            <button className="flex  cursor-pointer items-center space-x-3 w-full text-left text-gray-400 hover:text-white">
              <span>❓</span>
              <span>Help Center</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64">
        {/* Header */}
        <header className="border-b border-gray-800 bg-black/95 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className=""></div>
              {/* <nav className="flex items-center space-x-8">
                <button className="flex items-center space-x-2 text-pink-500 border-b-2 border-pink-500 pb-4">
                  <span>👩</span>
                  <span>Girls</span>
                </button>
                <button className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors">
                  <span>🎌</span>
                  <span>Anime</span>
                </button>
                <button className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors">
                  <span>👨</span>
                  <span>Guys</span>
                </button>
              </nav> */}

              <div className="flex items-center space-x-4">
                {isLoggedIn ? (
                  <div className="flex items-center space-x-3">
                    {/* <button className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors">
                      <Crown className="h-4 w-4" />
                      <span>Premium 70% OFF</span>
                    </button> */}
                    <Link
                      href={'/profile'}
                      className="flex items-center space-x-2"
                    >
                      <Image
                        src={
                          user?.data?.attributes?.avatar ||
                          '/default-avatar.png'
                        }
                        alt="Profile"
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                      <span>My Profile</span>
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setShowSignInModal(true)}
                      className="text-gray-300 hover:text-white transition-colors"
                    >
                      Login
                    </button>
                    <button
                      onClick={() => setShowSignInModal(true)}
                      className="bg-pink-500 hover:bg-pink-600 px-4 py-2 rounded-lg transition-colors"
                    >
                      Create Free Account
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Hero Banner
        <div className="relative">
          <div className="h-80 bg-gradient-to-r from-orange-400 to-pink-500 flex items-center justify-center">
            <Image
              src="/hero-image.jpg" // You'll need to add this image
              alt="Hero"
              width={800}
              height={320}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-end pr-16">
              <div className="text-right">
                <h2 className="text-4xl md:text-5xl font-bold mb-4 italic">
                  IMAGE GENERATOR
                </h2>
                <p className="text-xl mb-2 text-pink-200">
                  Create the perfect image in seconds
                </p>
                <p className="text-lg mb-6 text-gray-200">
                  Choose your setting, poses, and actions
                </p>
                <button className="bg-pink-500 hover:bg-pink-600 px-8 py-3 rounded-full text-lg font-semibold transition-colors">
                  GENERATE NOW
                </button>
              </div>
            </div>
          </div>
        </div> */}

        {/* Characters Section */}
        <div className="px-6 lg:px-8 py-12">
          <h3 className="text-3xl font-bold mb-8">
            Nice Robots <span className="text-pink-500">Characters</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedCharacters?.map((character) => {
              const isActive = isCharacterActive(character.id);
              return (
                <div
                  key={character.id}
                  onClick={() => handleCharacterClick(character)}
                  className="bg-gray-800 rounded-2xl overflow-hidden hover:bg-gray-750 transition-all duration-300 cursor-pointer group hover:scale-105 hover:shadow-2xl relative"
                >
                  {/* Active Chat Indicator */}
                  {isActive && (
                    <div className="absolute top-4 left-4 z-10">
                      <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        Active
                      </span>
                    </div>
                  )}

                  <div className="relative">
                    <Image
                      src={character.attributes.avatar}
                      alt={character.attributes.name}
                      width={300}
                      height={400}
                      className="w-full h-80 object-cover"
                    />

                    {/* New badge */}
                    {!isActive && (
                      <div className="absolute top-4 right-4">
                        <span className="bg-pink-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                          New
                        </span>
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <button className="bg-pink-500 flex items-center gap-2 hover:bg-pink-600 px-6 py-2 rounded-lg font-semibold transition-colors cursor-pointer">
                        {isActive ? 'Continue Chat' : 'Chat Now'}
                        {loading && <Loader className="animate-spin" />}
                      </button>
                    </div>
                  </div>

                  <div className="p-4">
                    <h4 className="text-xl font-bold mb-1">
                      {character.attributes.name} {character.attributes.age}
                    </h4>
                    <p className="text-gray-400 text-sm line-clamp-2">
                      {character.attributes.summary}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sign In Modal */}
      <SignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        onSuccess={handleSignInSuccess}
      />
    </div>
  );
}
