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
import {
  getPlanName,
  getPlanDescription,
  getPlanPrice,
  getPlanDuration,
  getPlanDurationUnit,
  getPlanSlug,
  isFreeOrBonusPlan,
  getUserPlanAttributes,
} from '@/utils/planHelpers';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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

  // Reusable body for the plan popover (used on mobile and desktop)
  const PlanPopoverBody = () => (
    <div className="space-y-5 text-slate-100">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500"></div>
          <h3 className="text-2xl font-bold text-white">{getPlanName(plan)}</h3>
        </div>
        {getPlanDescription(plan) && (
          <p className="text-sm whitespace-pre-wrap text-slate-300 leading-relaxed pl-4">
            {getPlanDescription(plan)}
          </p>
        )}
      </div>

      {/* Details Section */}
      <div className="space-y-3 pt-4 border-t border-slate-700/50">
        {getPlanPrice(plan) !== undefined && (
          <div className="flex justify-between items-center py-1.5 px-2 rounded-lg bg-slate-700/30">
            <span className="text-slate-400 text-sm">Price</span>
            <span className="font-bold text-white text-base">
              {getPlanPrice(plan)}
            </span>
          </div>
        )}
        {getPlanDuration(plan) && (
          <div className="flex justify-between items-center py-1.5 px-2 rounded-lg bg-slate-700/30">
            <span className="text-slate-400 text-sm">Duration</span>
            <span className="font-bold text-white text-base">
              {getPlanDuration(plan)} {getPlanDurationUnit(plan)}
            </span>
          </div>
        )}
        {(() => {
          const userPlanAttrs = getUserPlanAttributes(userPlan);
          if (!userPlanAttrs?.start_date || !userPlanAttrs?.end_date)
            return null;

          const slug = getPlanSlug(plan);
          const start = new Date(userPlanAttrs.start_date);
          const end = new Date(userPlanAttrs.end_date);
          const isFreeOrBonus = slug === 'free' || slug === 'bonus';

          if (isFreeOrBonus) {
            return (
              <div className="flex justify-between items-center py-1.5 px-2 rounded-lg bg-slate-700/30">
                <span className="text-slate-400 text-sm">Period</span>
                <span className="font-bold text-white text-base">
                  {start.toLocaleDateString()} - {end.toLocaleDateString()}
                </span>
              </div>
            );
          }
          const nextCharge = new Date(end);
          nextCharge.setDate(nextCharge.getDate() + 1);
          return (
            <>
              <div className="flex justify-between items-center py-1.5 px-2 rounded-lg bg-slate-700/30">
                <span className="text-slate-400 text-sm">Last paid on</span>
                <span className="font-bold text-white text-base">
                  {start.toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 px-2 rounded-lg bg-slate-700/30">
                <span className="text-slate-400 text-sm">Next charge</span>
                <span className="font-bold text-white text-base">
                  {nextCharge.toLocaleDateString()}
                </span>
              </div>
            </>
          );
        })()}
      </div>

      {/* Action Buttons */}
      {isFreeOrBonusPlan(plan) && (
        <div className="pt-2">
          <Button
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold py-3 rounded-xl transition-all shadow-lg hover:shadow-xl border-0"
            onClick={() => router.push('/plans?from=home')}
          >
            Upgrade to Premium
          </Button>
        </div>
      )}

      {(() => {
        const slug = getPlanSlug(plan);
        return slug && slug !== 'free' && slug !== 'bonus';
      })() && (
        <div className="pt-2">
          <Button
            className="w-full border-2 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500 bg-transparent font-semibold py-3 rounded-xl transition-all"
            onClick={() => router.push('/credits?from=home')}
          >
            Buy credits
          </Button>
        </div>
      )}
    </div>
  );

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
    if (!access_token) {
      toast.error('Authentication required');
      return;
    }

    setIsUpdatingUser(true);

    try {
      const updateData = {
        age_type: selectedAgeType,
        parent_ok:
          selectedAgeType === 'teen' || selectedAgeType === 'parent'
            ? true
            : false,
      };

      const userData = await updateUser({
        data: updateData,
        token: access_token,
      });

      if (!userData?.data) {
        throw new Error('Invalid response from server');
      }

      setUser({ data: userData.data });
      setShowAgeTypeModal(false);

      if (selectedCharacter) {
        setCharacter(selectedCharacter);
        addCharacter(selectedCharacter);
        router.push('/chat');
      }
    } catch (error) {
      console.error('Error updating age type:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to update age type. Please try again.';
      toast.error(errorMessage);
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  const sortedCharacters = getSortedCharacters();

  const SidebarContent = () => (
    <>
      <div className="p-6 flex flex-col h-full">
        <h1 className="text-2xl font-bold mb-6 text-slate-900">
          Nice<span className="text-pink-500"> Buddies</span>
        </h1>

        {/* Plan and Credits */}
        {isLoggedIn && (
          <div className="mb-6 space-y-3">
            {plan && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="w-full capitalize border border-slate-300 rounded-xl flex items-center gap-2 px-4 py-2.5 font-semibold text-slate-700 cursor-pointer hover:bg-white transition-all shadow-sm hover:shadow-md bg-white">
                    <span className="text-xs bg-gradient-to-r from-pink-500 to-purple-500 text-white px-2.5 py-1 rounded-full font-bold">
                      Plan
                    </span>
                    <span className="text-sm flex-1 text-left">
                      {getPlanName(plan)}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="border-0 bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 shadow-2xl p-6 w-[min(90vw,22rem)]">
                  <PlanPopoverBody />
                </PopoverContent>
              </Popover>
            )}
            <CreditsComponent />
          </div>
        )}

        <nav className="space-y-4 flex-1">
          <button
            onClick={() => {
              currentChat?.data
                ? router.push('/chat')
                : handleCharacterClick(sortedCharacters[0]);
              closeMobileMenu();
            }}
            className="cursor-pointer flex items-center space-x-3 w-full text-left p-3 rounded-xl text-white font-semibold bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg"
          >
            <span>💬</span>
            <span>My Chats</span>
          </button>
        </nav>

        {user?.data && (
          <div className="mt-auto pt-4 border-t border-slate-200">
            <Link
              href={'/profile'}
              onClick={closeMobileMenu}
              className="flex cursor-pointer items-center space-x-3 w-full text-left text-slate-700 hover:text-slate-900 p-2 rounded-lg hover:bg-white transition-colors"
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Mobile Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
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
        transition-all duration-300 bg-slate-100 border-r border-slate-200 overflow-hidden shadow-lg
        ${isMobile && !isMobileMenuOpen ? '-translate-x-full' : 'translate-x-0'}
      `}
      >
        {/* Mobile Close Button */}
        {isMobile && (
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute top-4 right-4 z-10 p-2 text-slate-600 hover:text-slate-900"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <SidebarContent />
      </div>

      {/* Main Content */}
      <div className={`${isMobile ? 'ml-0' : 'ml-64'}`}>
        {/* Header */}
        <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-start justify-between h-auto py-3 md:items-center md:h-16">
              <div
                className={`${
                  isMobile
                    ? 'flex flex-col gap-2'
                    : 'flex items-center space-x-4'
                }`}
              >
                {/* Mobile Menu Button */}
                {isMobile && (
                  <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="p-2 text-slate-600 hover:text-slate-900"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                )}

                {/* Mobile Logo */}
                {isMobile && (
                  <h1 className="text-xl font-bold text-slate-900">
                    Nice<span className="text-pink-500">Buddies</span>
                  </h1>
                )}
              </div>

              <div className="flex items-center space-x-4">
                {isLoggedIn ? (
                  <div className="flex items-center space-x-3">
                    <Link
                      href={'/profile'}
                      className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
                    >
                      <Image
                        src={
                          user?.data?.attributes?.avatar ||
                          '/default-avatar.png'
                        }
                        alt="Profile"
                        width={32}
                        height={32}
                        className="rounded-full ring-2 ring-pink-200"
                      />
                      <span className="hidden sm:inline bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent font-semibold">
                        My Profile
                      </span>
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setShowSignInModal(true)}
                      className="text-slate-700 hover:text-slate-900 transition-colors text-sm sm:text-base font-medium"
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
          <h3 className="text-2xl sm:text-3xl font-bold text-center sm:text-left text-slate-900">
            Find your <span className="text-pink-500">AI buddy!</span>
          </h3>
          <p className="mt-1 text-md mb-6 sm:mb-8 text-slate-600">
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
                  className="bg-gray-100 rounded-2xl overflow-hidden hover:bg-slate-50 transition-all duration-300 cursor-pointer group hover:scale-105 hover:shadow-xl border border-slate-200 relative"
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
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-t-2xl">
                      <button className="bg-pink-500 flex items-center gap-2 hover:bg-pink-600 px-4 py-2 sm:px-6 rounded-lg font-semibold transition-colors cursor-pointer text-sm sm:text-base">
                        {isActive ? 'Continue Chat' : 'Chat Now'}
                        {loading && <Loader className="animate-spin w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 sm:p-4">
                    <h4 className="text-lg sm:text-xl font-bold mb-1 text-slate-900">
                      {character.attributes.name} {character.attributes.age}
                    </h4>
                    <p className="text-slate-600 text-xs sm:text-sm line-clamp-2">
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
