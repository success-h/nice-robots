'use client';

import ChatList from '@/components/ChatList';
import CreditsComponent from '@/components/CreditsComponent';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	useSidebar,
} from '@/components/ui/sidebar';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import {
	getPlanDescription,
	getPlanDuration,
	getPlanDurationUnit,
	getPlanName,
	getPlanPrice,
	getPlanSlug,
	getUserPlanAttributes,
	isFreeOrBonusPlan,
} from '@/utils/planHelpers';
import useUserStore from '@/zustand/useStore';
import { Edit2, Loader2, Plus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ChatSidebarProps {
	deleteLoading: boolean;
	handleDeleteChat: (id: string, character_id: string) => void;
	relationshipTypes: string[];
	selectedRelationship: string;
	handleRelationshipChange: (type: string) => Promise<void>;
	highlightRelPrompt: boolean;
	relTriggerRef: React.RefObject<HTMLButtonElement | null>;
	isCreatingChat: boolean;
}

export default function ChatSidebar({
	deleteLoading,
	handleDeleteChat,
	relationshipTypes,
	selectedRelationship,
	handleRelationshipChange,
	highlightRelPrompt,
	relTriggerRef,
	isCreatingChat,
}: ChatSidebarProps) {
	const router = useRouter();
	const { isMobile } = useSidebar();
	const {
		characters,
		chats,
		currentChat,
		setCharacter,
		setCurrentChat,
		character,
		user,
		updateCharacterVideoPlayed,
		isLoggedIn,
		plan,
		userPlan,
		response_type,
		setResponseType,
	} = useUserStore();

	return (
		<Sidebar>
			<SidebarHeader className='p-4 border-b border-sidebar-border bg-sidebar-accent space-y-3'>
				<Link
					href='/'
					onClick={() => {
						setCurrentChat(null);
						if (character?.id) {
							updateCharacterVideoPlayed(character.id);
						}
					}}
					className='flex items-center justify-center w-full p-3 text-sidebar-foreground hover:bg-sidebar-accent rounded-xl transition-all duration-200 shadow-sm hover:shadow-md font-semibold bg-card/60 backdrop-blur-sm'
				>
					<Plus className='w-5 h-5 mr-2 text-pink-500' />
					<span className='text-sm'>New chat</span>
				</Link>

				{/* Plan and Credits - Mobile Only */}
				{isLoggedIn && isMobile && (
					<div className='space-y-2'>
						{plan && (
							<Popover>
								<PopoverTrigger asChild>
									<button className='w-full capitalize border border-border rounded-xl flex items-center gap-2 px-3 py-2 font-semibold text-foreground cursor-pointer hover:bg-accent transition-all shadow-sm hover:shadow-md bg-card text-xs sm:text-sm'>
										<span className='text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full font-bold'>
											Plan
										</span>
										<span className='flex-1 text-left truncate'>
											{getPlanName(plan)}
										</span>
									</button>
								</PopoverTrigger>
								<PopoverContent className='border-0 bg-popover shadow-2xl p-4 sm:p-6 w-[calc(100vw-2rem)] sm:w-96 max-w-md'>
									<div className='space-y-5 text-popover-foreground'>
										<div className='space-y-2'>
											<div className='flex items-center gap-2'>
												<div className='w-2 h-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500'></div>
												<h3 className='text-2xl font-bold text-popover-foreground'>
													{getPlanName(plan)}
												</h3>
											</div>
											{getPlanDescription(plan) && (
												<p className='text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed pl-4'>
													{getPlanDescription(plan)}
												</p>
											)}
										</div>
										<div className='space-y-3 pt-4 border-t border-border'>
											{getPlanPrice(plan) !== undefined && (
												<div className='flex justify-between items-center py-1.5 px-2 rounded-lg bg-muted/30'>
													<span className='text-muted-foreground text-sm'>
														Price
													</span>
													<span className='font-bold text-popover-foreground text-base'>
														{getPlanPrice(plan)}
													</span>
												</div>
											)}
											{getPlanDuration(plan) && (
												<div className='flex justify-between items-center py-1.5 px-2 rounded-lg bg-muted/30'>
													<span className='text-muted-foreground text-sm'>
														Duration
													</span>
													<span className='font-bold text-popover-foreground text-base'>
														{getPlanDuration(plan)} {getPlanDurationUnit(plan)}
													</span>
												</div>
											)}
											{(() => {
												const userPlanAttrs = getUserPlanAttributes(userPlan);
												if (
													!userPlanAttrs?.start_date ||
													!userPlanAttrs?.end_date
												)
													return null;
												const slug = getPlanSlug(plan);
												const start = new Date(userPlanAttrs.start_date);
												const end = new Date(userPlanAttrs.end_date);
												const isFreeOrBonus =
													slug === 'free' || slug === 'bonus';
												if (isFreeOrBonus) {
													return (
														<div className='flex justify-between items-center py-1.5 px-2 rounded-lg bg-muted/30'>
															<span className='text-muted-foreground text-sm'>
																Period
															</span>
															<span className='font-bold text-popover-foreground text-base'>
																{start.toLocaleDateString()} -{' '}
																{end.toLocaleDateString()}
															</span>
														</div>
													);
												}
												const nextCharge = new Date(end);
												nextCharge.setDate(nextCharge.getDate() + 1);
												return (
													<>
														<div className='flex justify-between items-center py-1.5 px-2 rounded-lg bg-muted/30'>
															<span className='text-muted-foreground text-sm'>
																Last paid on
															</span>
															<span className='font-bold text-popover-foreground text-base'>
																{start.toLocaleDateString()}
															</span>
														</div>
														<div className='flex justify-between items-center py-1.5 px-2 rounded-lg bg-muted/30'>
															<span className='text-muted-foreground text-sm'>
																Next charge
															</span>
															<span className='font-bold text-popover-foreground text-base'>
																{nextCharge.toLocaleDateString()}
															</span>
														</div>
													</>
												);
											})()}
										</div>
										{isFreeOrBonusPlan(plan) && (
											<div className='pt-2'>
												<Button
													className='w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold py-3 rounded-xl transition-all shadow-lg hover:shadow-xl border-0'
													onClick={() => router.push('/plans?from=chat')}
												>
													Upgrade to Premium
												</Button>
											</div>
										)}
										{(() => {
											const slug = getPlanSlug(plan);
											return slug && slug !== 'free' && slug !== 'bonus';
										})() && (
											<div className='pt-2'>
												<Button
													className='w-full border-2 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500 bg-transparent font-semibold py-3 rounded-xl transition-all'
													onClick={() => router.push('/credits?from=chat')}
												>
													Buy credits
												</Button>
											</div>
										)}
									</div>
								</PopoverContent>
							</Popover>
						)}
						<CreditsComponent />
					</div>
				)}

				{/* Response Type Selector - Mobile Only */}
				{isMobile && (
					<Popover>
						<PopoverTrigger asChild>
							<button className='w-full capitalize border border-border rounded-xl flex items-center justify-between px-3 py-2 font-semibold text-foreground cursor-pointer hover:bg-accent transition-all shadow-sm hover:shadow-md bg-card text-xs sm:text-sm'>
								<span>{response_type}</span>
								<Edit2 size={14} className='text-muted-foreground' />
							</button>
						</PopoverTrigger>
						<PopoverContent className='border bg-popover border-border shadow-xl'>
							<div className='space-y-4'>
								<RadioGroup
									onValueChange={(res) => {
										setResponseType(res);
										return res;
									}}
									value={response_type}
								>
									{[
										{ value: 'voice', label: 'Voice' },
										{ value: 'text', label: 'Text' },
									].map((item) => (
										<div
											key={item.label}
											className='flex items-center cursor-pointer text-foreground space-x-2 hover:bg-accent p-2 rounded-lg transition-colors'
										>
											<RadioGroupItem value={item.value} id={item.value} />
											<Label
												htmlFor={item.value}
												className='cursor-pointer font-medium'
											>
												{item.label}
											</Label>
										</div>
									))}
								</RadioGroup>
							</div>
						</PopoverContent>
					</Popover>
				)}

				{/* Relationship Selector - Mobile Only */}
				{isMobile && (
					<Popover>
						<Tooltip>
							<TooltipTrigger asChild>
								<PopoverTrigger asChild>
									<Button
										disabled={!currentChat}
										className='w-full text-xs sm:text-sm flex items-center justify-between font-semibold capitalize text-foreground cursor-pointer hover:bg-accent border border-border rounded-xl px-3 py-2 shadow-sm hover:shadow-md bg-card transition-all disabled:opacity-50'
										ref={relTriggerRef}
									>
										<div className='flex items-center gap-2 flex-1 min-w-0'>
											<span className='font-bold text-foreground truncate'>
												{character?.attributes?.name}
											</span>
											{currentChat?.data?.attributes?.relationship_type && (
												<span className='text-xs bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700 px-2 py-0.5 rounded-full font-medium shrink-0'>
													{currentChat?.data?.attributes?.relationship_type}
												</span>
											)}
										</div>
										<div className='h-2 w-2 bg-emerald-500 rounded-full ring-2 ring-emerald-200 animate-pulse shrink-0 ml-2'></div>
									</Button>
								</PopoverTrigger>
							</TooltipTrigger>
							<TooltipContent>
								<p>Change relationship</p>
							</TooltipContent>
						</Tooltip>
						<PopoverContent className='border bg-popover border-border shadow-xl'>
							<div className='space-y-4'>
								<h3
									className={`text-xl font-bold text-popover-foreground ${
										highlightRelPrompt
											? 'ring-2 ring-pink-400 rounded-lg animate-pulse'
											: ''
									}`}
								>
									Choose a relationship
								</h3>
								<div className='flex flex-wrap justify-self-auto gap-2 text-sm'>
									{relationshipTypes.map((type) => {
										const isCurrent =
											currentChat?.data?.attributes?.relationship_type === type;
										const isSelected =
											selectedRelationship === type || isCurrent;
										return (
											<Button
												key={type}
												variant={isSelected ? 'default' : 'outline'}
												className={`capitalize transition-all ${
													isSelected
														? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0 shadow-md hover:shadow-lg'
														: 'border-border text-foreground hover:bg-accent bg-card'
												}`}
												onClick={() => {
													if (!isCurrent) handleRelationshipChange(type);
												}}
												disabled={isCreatingChat || isCurrent}
											>
												{isCreatingChat && isSelected && (
													<Loader2 className='mr-2 h-4 w-4 animate-spin' />
												)}
												{type}
											</Button>
										);
									})}
								</div>
							</div>
						</PopoverContent>
					</Popover>
				)}
			</SidebarHeader>

			{/* Chat List */}
			<SidebarContent className='overflow-hidden'>
				<ChatList
					characters={characters}
					chats={chats}
					currentChat={currentChat!}
					setCharacter={setCharacter}
					deleteLoading={deleteLoading}
					updateCharacterVideoPlayed={() => {
						if (character?.id) {
							updateCharacterVideoPlayed(character.id);
						}
					}}
					handleDeleteChat={handleDeleteChat}
				/>
			</SidebarContent>

			{/* Profile Settings */}
			<SidebarFooter className='p-4 border-t border-sidebar-border bg-sidebar-accent/50'>
				<Link
					href='/profile'
					className='flex cursor-pointer items-center space-x-3 w-full text-left text-sidebar-foreground hover:text-sidebar-foreground p-2 rounded-lg hover:bg-sidebar-accent transition-colors'
				>
					<Image
						src={user?.data?.attributes?.avatar || '/default-avatar.png'}
						alt={character?.attributes?.name || 'profile'}
						width={36}
						height={36}
						className='rounded-full ring-2 ring-slate-200'
					/>
					<span className='font-medium text-sm'>Profile settings</span>
				</Link>
			</SidebarFooter>
		</Sidebar>
	);
}
