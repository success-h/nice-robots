'use client';

import AgeTypeModal from '@/components/AgeTypesModal';
import CreditsComponent from '@/components/CreditsComponent';
import HomeSidebar from '@/components/HomeSidebar';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from '@/components/ui/sidebar';
import { useQuery } from '@tanstack/react-query';
import { Loader } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import SignInModal from '../components/SignInModal';
import { useApi } from '../hooks/useApi';
import useUserStore, { CharacterData } from '../zustand/useStore';

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
	const [showAgeTypeModal, setShowAgeTypeModal] = useState(false);
	const [isUpdatingUser, setIsUpdatingUser] = useState(false);

	const {
		user,
		chats,
		setCharacter,
		isLoggedIn,
		currentChat,
		setUser,
		addCharacter,
		characters,
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

	const handleAgeTypeSelected = async (selectedAgeType: string, childName?: string) => {
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

			// If a parent is registering for a child, send the child's name as the account name
			if (selectedAgeType === 'parent' && typeof childName === 'string' && childName.trim().length > 0) {
				(updateData as any).name = childName.trim();
			}
			// For parent registering a child: ensure avatar is cleared
			if (selectedAgeType === 'parent') {
				(updateData as any).avatar = null;
			}

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
			// Pass through null avatar explicitly; only coerce to number when defined
			if (data.avatar === null) {
				attributes.avatar = null;
			} else if (data.avatar !== undefined) {
				attributes.avatar = Number(data.avatar);
			}
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
			<div className='min-h-screen bg-background flex items-center justify-center'>
				<div className='animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500'></div>
			</div>
		);
	}

	const sortedCharacters = getSortedCharacters();

	return (
		<SidebarProvider>
			<HomeSidebar
				sortedCharacters={sortedCharacters}
				handleCharacterClick={handleCharacterClick}
			/>

			<SidebarInset className='bg-background'>
				{/* Header */}
				<header className='border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40 shadow-sm'>
					<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
						<div className='flex items-center justify-between h-16'>
							<div className='flex items-center gap-3'>
								<SidebarTrigger className='md:hidden' />
								<h1 className='text-xl font-bold text-foreground md:hidden'>
									Nice<span className='text-pink-500'>Buddies</span>
								</h1>
							</div>

							<div className='flex items-center space-x-4'>
								{isLoggedIn && <CreditsComponent />}
								<ThemeSwitcher />
								{isLoggedIn ? (
									<div className='flex items-center space-x-3'>
										<Link
											href='/profile'
											className='flex items-center space-x-2 hover:opacity-80 transition-opacity'
										>
											<Image
												src={
													user?.data?.attributes?.avatar ||
													'/default-avatar.png'
												}
												alt='Profile'
												width={32}
												height={32}
												className='rounded-full ring-2 ring-pink-200'
											/>
											<span className='hidden sm:inline bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent font-semibold'>
												My Profile
											</span>
										</Link>
									</div>
								) : (
									<div className='flex items-center space-x-3'>
										<button
											onClick={() => setShowSignInModal(true)}
											className='text-foreground hover:text-foreground transition-colors text-sm sm:text-base font-medium'
										>
											Login
										</button>
										<button
											onClick={() => setShowSignInModal(true)}
											className='bg-pink-500 hover:bg-pink-600 px-3 py-2 sm:px-4 rounded-lg transition-colors text-sm sm:text-base'
										>
											<span className='hidden sm:inline'>
												Create Free Account
											</span>
											<span className='sm:hidden'>Sign Up</span>
										</button>
									</div>
								)}
							</div>
						</div>
					</div>
				</header>

				{/* Characters Section */}
				<div className='px-4 sm:px-6 lg:px-8 py-8 sm:py-12'>
					<h3 className='text-2xl sm:text-3xl font-bold text-center sm:text-left text-foreground'>
						Find your <span className='text-pink-500'>AI buddy!</span>
					</h3>
					<p className='mt-1 text-md mb-6 sm:mb-8 text-muted-foreground'>
						Ethical and empathic virtual friends who listen, support, and never
						judge.
					</p>

					<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6'>
						{sortedCharacters?.map((character) => {
							const isActive = isCharacterActive(character.id);
							return (
								<div
									key={character.id}
									onClick={() => handleCharacterClick(character)}
									className='bg-card rounded-2xl overflow-hidden hover:bg-accent transition-all duration-300 cursor-pointer group hover:scale-105 hover:shadow-xl border border-border relative'
								>
									{/* Active Chat Indicator */}
									{isActive && (
										<div className='absolute top-3 left-3 z-10'>
											<span className='bg-green-500 text-white px-2 py-1 sm:px-3 rounded-full text-xs sm:text-sm font-semibold'>
												Active
											</span>
										</div>
									)}

									<div className='relative'>
										<Image
											src={character.attributes.avatar}
											alt={character.attributes.name}
											width={300}
											height={400}
											className='w-full h-64 sm:h-80 object-cover'
										/>

										{/* New badge */}
										{!isActive && (
											<div className='absolute top-3 right-3'>
												<span className='bg-pink-500 text-white px-2 py-1 sm:px-3 rounded-full text-xs sm:text-sm font-semibold'>
													New
												</span>
											</div>
										)}

										{/* Hover overlay */}
										<div className='absolute inset-0 bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-t-2xl'>
											<button className='bg-pink-500 flex items-center gap-2 hover:bg-pink-600 px-4 py-2 sm:px-6 rounded-lg font-semibold transition-colors cursor-pointer text-sm sm:text-base'>
												{isActive ? 'Continue Chat' : 'Chat Now'}
												{loading && <Loader className='animate-spin w-4 h-4' />}
											</button>
										</div>
									</div>

									<div className='p-3 sm:p-4'>
										<h4 className='text-lg sm:text-xl font-bold mb-1 text-card-foreground'>
											{character.attributes.name} {character.attributes.age}
										</h4>
										<p className='text-muted-foreground text-xs sm:text-sm line-clamp-2'>
											{character.attributes.summary}
										</p>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</SidebarInset>

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
		</SidebarProvider>
	);
}
