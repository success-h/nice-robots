'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Menu, User, Loader, X } from 'lucide-react';
import useUserStore, { CharacterData } from '../zustand/useStore';
import { useApi } from '../hooks/useApi';
import SignInModal from '../components/SignInModal';
import Image from 'next/image';
import Link from 'next/link';
import AgeTypeModal from '@/components/AgeTypesModal';
import CreditsComponent from '@/components/CreditsComponent';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

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

type Props = {
  access_token: string | undefined;
};

export default function HomePageComponent({ access_token }: Props) {
  const [selectedCharacter, setSelectedCharacter] =
    useState<CharacterData | null>(null);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showAgeTypeModal, setShowAgeTypeModal] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

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
    chats,
    setCharacter,
    isLoggedIn,
    currentChat,
    setUser,
    addCharacter,
    characters,
    plan,
    userPlan,
  } = useUserStore();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['characters'],
    queryFn: getCharacters,
  });

  useEffect(() => {
    if (user) {
      if (!user?.data?.attributes?.age_type) {
        setShowAgeTypeModal(true);
        return;
      }
      if (selectedCharacter) {
        setCharacter(selectedCharacter);
        addCharacter(selectedCharacter);
        router.push('/chat');
      }
    }
  }, [user]);

  const getSortedCharacters = () => {
    if (!data?.data) return [];

    const activeCharacterIds =
      chats?.map((chat) => chat?.data?.relationships?.character?.id) || [];

    const activeCharacters = data?.data?.filter((character: CharacterData) =>
      activeCharacterIds.includes(character.id)
    );

    const availableCharacters = data?.data?.filter(
      (character: CharacterData) => !activeCharacterIds.includes(character.id)
    );

    return [...activeCharacters, ...availableCharacters];
  };

  const handleCharacterClick = async (character: CharacterData) => {
    if (!isLoggedIn) {
      setSelectedCharacter(character);
      setShowSignInModal(true);
      return;
    }
    if (!user?.data?.attributes?.age_type) {
      setSelectedCharacter(character);
      setShowAgeTypeModal(true);
      return;
    }
    setCharacter(character);
    addCharacter(character);
    router.push('/chat');
    return;
  };

  const handleSignInSuccess = () => {
    router.refresh();
    setShowSignInModal(false);
  };

  const isCharacterActive = (characterId: string) => {
    const activeCharacterIds =
      characters?.map((character) => character?.id) || [];
    return activeCharacterIds.includes(characterId);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleAgeTypeSelected = async (selectedAgeType: string) => {
    setIsUpdatingUser(true);

    try {
      const updateData = {
        age_type: selectedAgeType,
        parent_ok:
          selectedAgeType === 'child' || selectedAgeType === 'teen'
            ? true
            : undefined,
      };

      const userData = await updateUser({
        data: updateData,
        token: access_token,
      });

      setUser({ data: userData.data });
      setShowAgeTypeModal(false);
      if (selectedCharacter) {
        setCharacter(selectedCharacter);
        addCharacter(selectedCharacter);
        router.push('/chat');
      }
    } catch (error) {
      console.error('Error updating age type:', error);
      throw error;
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleAgeTypeModalClose = () => {
    setShowAgeTypeModal(false);
  };

  const updateUser = async ({ data, token }: any) => {
    try {
      const attributes: any = {};

      if (data.name !== undefined) attributes.name = data.name;
      if (data.avatar !== undefined) attributes.avatar = Number(data.avatar);
      if (data.language !== undefined) attributes.language = data.language;
      if (data.parent_ok !== undefined) attributes.parent_ok = data.parent_ok;
      if (data.age_type !== undefined) attributes.age_type = data.age_type;

      const response = await useApi(
        '/users',
        {
          method: 'PATCH',
          body: JSON.stringify({
            data: {
              attributes,
            },
          }),
        },
        token
      );
      const resData = await response.json();
      return resData;
    } catch (error) {
      console.log('error:', error);
      throw error;
    }
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
          Nice<span className="text-pink-500"> Buddies</span>
        </h1>

        <nav className="space-y-4">
          <button
            onClick={() => {
              currentChat?.data
                ? router.push('/chat')
                : handleCharacterClick(sortedCharacters[0]);
              closeMobileMenu();
            }}
            className="cursor-pointer flex items-center space-x-3 w-full text-left p-3 rounded-lg text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-800 transition-colors"
          >
            <span>💬</span>
            <span>My Chats</span>
          </button>
        </nav>

        {user?.data && (
          <div className="absolute bottom-6 left-6 right-6 space-y-3">
            <Link
              href={'/profile'}
              onClick={closeMobileMenu}
              className="flex cursor-pointer items-center space-x-3 w-full text-left text-gray-400 hover:text-white"
            >
              <User className="w-4 h-4" />
              <span>Profile settings</span>
            </Link>
          </div>
        )}
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
            <div className="flex items-start justify-between h-auto py-3 md:items-center md:h-16">
              <div className={`${isMobile ? 'flex flex-col gap-2' : 'flex items-center space-x-4'}`}>
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
                    Nice<span className="text-pink-500">Buddies</span>
                  </h1>
                )}

                {/* Mobile: stack Plan and Credits under the logo */}
                {isMobile && (
                  <div className="flex flex-col gap-2">
                    {isLoggedIn && plan && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <h1 className="capitalize border rounded-lg flex items-center gap-1 px-3 py-1 font-semibold text-gray-100 cursor-pointer">
                            {((plan as any)?.attributes?.name ?? (plan as any)?.data?.attributes?.name ?? 'Plan')}
                          </h1>
                        </PopoverTrigger>
                        <PopoverContent className="border bg-gray-700 border-gray-400">
                          <div className="space-y-3 text-white">
                            <h3 className="text-xl font-semibold">
                              {((plan as any)?.attributes?.name ?? (plan as any)?.data?.attributes?.name ?? 'Plan')}
                            </h3>
                            {(((plan as any)?.attributes?.description) ?? ((plan as any)?.data?.attributes?.description)) && (
                              <p className="text-sm whitespace-pre-wrap">
                                {((plan as any)?.attributes?.description ?? (plan as any)?.data?.attributes?.description)}
                              </p>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                    {isLoggedIn && <CreditsComponent />}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-4">
                {/* Plan badge and popover */}
                {!isMobile && isLoggedIn && plan && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <h1 className="capitalize border rounded-lg flex items-center gap-1 px-3 py-1 font-semibold text-gray-100 cursor-pointer">
                        {((plan as any)?.attributes?.name ?? (plan as any)?.data?.attributes?.name ?? 'Plan')}
                      </h1>
                    </PopoverTrigger>
                    <PopoverContent className="border bg-gray-700 border-gray-400">
                      <div className="space-y-3 text-white">
                        <h3 className="text-xl font-semibold">
                          {((plan as any)?.attributes?.name ?? (plan as any)?.data?.attributes?.name ?? 'Plan')}
                        </h3>
                        {(((plan as any)?.attributes?.description) ?? ((plan as any)?.data?.attributes?.description)) && (
                          <p className="text-sm whitespace-pre-wrap">
                            {((plan as any)?.attributes?.description ?? (plan as any)?.data?.attributes?.description)}
                          </p>
                        )}
                        <div className="text-sm space-y-1">
                          {((((plan as any)?.attributes?.price) ?? ((plan as any)?.data?.attributes?.price)) !== undefined) && (
                            <div>
                              <span className="text-gray-300">Price: </span>
                              <span className="font-medium">
                                {((plan as any)?.attributes?.price ?? (plan as any)?.data?.attributes?.price)}
                              </span>
                            </div>
                          )}
                          {(((plan as any)?.attributes?.duration) ?? ((plan as any)?.data?.attributes?.duration)) && (
                            <div>
                              <span className="text-gray-300">Duration: </span>
                              <span className="font-medium">
                                {((plan as any)?.attributes?.duration ?? (plan as any)?.data?.attributes?.duration)}{' '}
                                {((plan as any)?.attributes?.duration_unit ?? (plan as any)?.data?.attributes?.duration_unit)}
                              </span>
                            </div>
                          )}
                          {(userPlan as any)?.attributes?.start_date && (
                            (() => {
                              const slug = (((plan as any)?.attributes?.slug) ?? ((plan as any)?.data?.attributes?.slug)) as string | undefined;
                              const start = new Date((userPlan as any).attributes.start_date);
                              const end = new Date((userPlan as any).attributes.end_date);
                              const isFreeOrBonus = slug === 'free' || slug === 'bonus';
                              if (isFreeOrBonus) {
                                return (
                                  <div>
                                    <span className="text-gray-300">Period: </span>
                                    <span className="font-medium">
                                      {start.toLocaleDateString()} - {end.toLocaleDateString()}
                                    </span>
                                  </div>
                                );
                              }
                              const nextCharge = new Date(end);
                              nextCharge.setDate(nextCharge.getDate() + 1);
                              return (
                                <>
                                  <div>
                                    <span className="text-gray-300">Last paid on: </span>
                                    <span className="font-medium">{start.toLocaleDateString()}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-300">Next charge date: </span>
                                    <span className="font-medium">{nextCharge.toLocaleDateString()}</span>
                                  </div>
                                </>
                              );
                            })()
                          )}
                        </div>

                        {(() => {
                          const slug = (((plan as any)?.attributes?.slug) ?? ((plan as any)?.data?.attributes?.slug)) as string | undefined;
                          return slug && (slug === 'free' || slug === 'bonus');
                        })() && (
                          <div className="pt-2">
                            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => router.push('/plans?from=home')}>
                              Upgrade to Premium
                            </Button>
                          </div>
                        )}

                        {(() => {
                          const slug = (((plan as any)?.attributes?.slug) ?? ((plan as any)?.data?.attributes?.slug)) as string | undefined;
                          return slug && slug !== 'free' && slug !== 'bonus';
                        })() && (
                          <div className="pt-2">
                            <Button
                              className="border border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 bg-transparent"
                              onClick={() => router.push('/credits?from=home')}
                            >
                              Buy credits
                            </Button>
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}

                {/* Credits Component */}
                {!isMobile && isLoggedIn && <CreditsComponent />}
                
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
          <h3 className="text-2xl sm:text-3xl font-boldtext-center sm:text-left">
            Find your <span className="text-pink-500">AI buddy!</span>
          </h3>
          <p className="mt-1 text-md mb-6 sm:mb-8 text-gray-300">
            Ethical and empathic virtual friends who listen, support, and never
            judge.
          </p>

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

      <SignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        onSuccess={handleSignInSuccess}
      />
      {showAgeTypeModal && (
        <AgeTypeModal
          isOpen={showAgeTypeModal}
          onClose={handleAgeTypeModalClose}
          onAgeTypeSelected={handleAgeTypeSelected}
          isLoading={isUpdatingUser}
        />
      )}
    </div>
  );
}
