'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Menu, User, Crown, Loader, X } from 'lucide-react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  console.log({ currentChat });

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

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  const sortedCharacters = getSortedCharacters();

  const SidebarContent = () => (
    <>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-8">
          Nice<span className="text-pink-500">robots</span>
        </h1>

        <nav className="space-y-4">
          <button
            onClick={closeMobileMenu}
            className="cursor-pointer flex items-center space-x-3 w-full text-left p-3 rounded-lg bg-gray-800 text-white"
          >
            <User className="h-5 w-5" />
            <span>Explore</span>
          </button>
          <button
            onClick={() => {
              currentChat?.data
                ? router.push('/chat')
                : handleCharacterClick(sortedCharacters[0]);
              closeMobileMenu();
            }}
            className="cursor-pointer flex items-center space-x-3 w-full text-left p-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <span>💬</span>
            <span>Chat</span>
          </button>
        </nav>

        <div className="absolute bottom-6 left-6 right-6 space-y-3">
          <Link
            href={'/profile'}
            onClick={closeMobileMenu}
            className="flex cursor-pointer items-center space-x-3 w-full text-left text-gray-400 hover:text-white"
          >
            <User className="w-4 h-4" />
            <span>Profile settings</span>
          </Link>
          <button
            onClick={closeMobileMenu}
            className="flex cursor-pointer items-center space-x-3 w-full text-left text-gray-400 hover:text-white"
          >
            <span>💬</span>
            <span>Discord</span>
          </button>
          <button
            onClick={closeMobileMenu}
            className="flex cursor-pointer items-center space-x-3 w-full text-left text-gray-400 hover:text-white"
          >
            <span>❓</span>
            <span>Help Center</span>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Mobile Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
        ${
          isMobile
            ? 'fixed left-0 top-0 h-full z-50'
            : 'fixed left-0 top-0 h-full z-30'
        }
        ${isMobileMenuOpen || !isMobile ? 'w-64' : 'w-0'}
        transition-all duration-300 bg-gray-900 border-r border-gray-800 overflow-hidden
        ${isMobile && !isMobileMenuOpen ? '-translate-x-full' : 'translate-x-0'}
      `}
      >
        {/* Mobile Close Button */}
        {isMobile && (
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <SidebarContent />
      </div>

      {/* Main Content */}
      <div className={`${isMobile ? 'ml-0' : 'ml-64'}`}>
        {/* Header */}
        <header className="border-b border-gray-800 bg-black/95 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                {/* Mobile Menu Button */}
                {isMobile && (
                  <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="p-2 text-gray-400 hover:text-white"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                )}

                {/* Mobile Logo */}
                {isMobile && (
                  <h1 className="text-xl font-bold">
                    Nice<span className="text-pink-500">robots</span>
                  </h1>
                )}
              </div>

              <div className="flex items-center space-x-4">
                {isLoggedIn ? (
                  <div className="flex items-center space-x-3">
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
                      <span className="hidden sm:inline">My Profile</span>
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setShowSignInModal(true)}
                      className="text-gray-300 hover:text-white transition-colors text-sm sm:text-base"
                    >
                      Login
                    </button>
                    <button
                      onClick={() => setShowSignInModal(true)}
                      className="bg-pink-500 hover:bg-pink-600 px-3 py-2 sm:px-4 rounded-lg transition-colors text-sm sm:text-base"
                    >
                      <span className="hidden sm:inline">
                        Create Free Account
                      </span>
                      <span className="sm:hidden">Sign Up</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Characters Section */}
        <div className="px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <h3 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center sm:text-left">
            Nice Robots <span className="text-pink-500">Characters</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
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
                    <div className="absolute top-3 left-3 z-10">
                      <span className="bg-green-500 text-white px-2 py-1 sm:px-3 rounded-full text-xs sm:text-sm font-semibold">
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
                      className="w-full h-64 sm:h-80 object-cover"
                    />

                    {/* New badge */}
                    {!isActive && (
                      <div className="absolute top-3 right-3">
                        <span className="bg-pink-500 text-white px-2 py-1 sm:px-3 rounded-full text-xs sm:text-sm font-semibold">
                          New
                        </span>
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <button className="bg-pink-500 flex items-center gap-2 hover:bg-pink-600 px-4 py-2 sm:px-6 rounded-lg font-semibold transition-colors cursor-pointer text-sm sm:text-base">
                        {isActive ? 'Continue Chat' : 'Chat Now'}
                        {loading && <Loader className="animate-spin w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 sm:p-4">
                    <h4 className="text-lg sm:text-xl font-bold mb-1">
                      {character.attributes.name} {character.attributes.age}
                    </h4>
                    <p className="text-gray-400 text-xs sm:text-sm line-clamp-2">
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
