'use client';

import CreditsComponent from '@/components/CreditsComponent';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
import { Edit2, Loader2, MessageSquare, PanelRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ChatHeaderProps {
	sidebarOpen: boolean;
	setSidebarOpen: (open: boolean) => void;
	isRightSidebarOpen: boolean;
	setIsRightSidebarOpen: (open: boolean) => void;
	isMobile: boolean;
	relationshipTypes: string[];
	selectedRelationship: string;
	handleRelationshipChange: (type: string) => Promise<void>;
	highlightRelPrompt: boolean;
	relTriggerRef: React.RefObject<HTMLButtonElement | null>;
	isCreatingChat: boolean;
}

export default function ChatHeader({
	sidebarOpen,
	setSidebarOpen,
	isRightSidebarOpen,
	setIsRightSidebarOpen,
	isMobile,
	relationshipTypes,
	selectedRelationship,
	handleRelationshipChange,
	highlightRelPrompt,
	relTriggerRef,
	isCreatingChat,
}: ChatHeaderProps) {
	const router = useRouter();
	const {
		isLoggedIn,
		plan,
		userPlan,
		response_type,
		setResponseType,
		currentChat,
		character,
	} = useUserStore();

	return (
		<div className='border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-30 shadow-sm p-3 sm:p-4'>
			<div className='flex items-center justify-between gap-3'>
				{/* Mobile sidebar toggles */}
				{!sidebarOpen && (
					<button
						onClick={() => setSidebarOpen(true)}
						className='p-2.5 text-foreground hover:text-foreground rounded-xl bg-card/90 backdrop-blur-sm hover:bg-card transition-all shadow-md hover:shadow-lg border border-border'
						aria-label='Open chat sidebar'
					>
						<MessageSquare className='w-5 h-5' />
					</button>
				)}

				{/* Desktop Controls */}
				<div className='hidden lg:flex items-center gap-3 flex-1'>
					{isLoggedIn && plan && (
						<Popover>
							<PopoverTrigger asChild>
								<button className='capitalize border border-border rounded-xl flex items-center gap-2 px-4 py-2 font-semibold text-foreground cursor-pointer hover:bg-accent transition-all shadow-sm hover:shadow-md bg-card'>
									<span className='text-xs bg-gradient-to-r from-pink-500 to-purple-500 text-white px-2.5 py-1 rounded-full font-bold'>
										Plan
									</span>
									<span className='text-sm'>{getPlanName(plan)}</span>
								</button>
							</PopoverTrigger>
							<PopoverContent className='border-0 bg-popover shadow-2xl p-6 w-96'>
								<div className='space-y-5 text-popover-foreground'>
									<div className='space-y-2'>
										<div className='flex items-center gap-2'>
											<div className='w-2 h-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500'></div>
											<h3 className='text-2xl font-bold text-white'>
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
											const isFreeOrBonus = slug === 'free' || slug === 'bonus';
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
					{isLoggedIn && <CreditsComponent />}
					<Popover>
						<PopoverTrigger asChild>
							<button className='capitalize border border-border rounded-xl flex items-center gap-2 px-4 py-2 font-semibold text-foreground cursor-pointer hover:bg-accent transition-all shadow-sm hover:shadow-md bg-card'>
								<span className='text-sm'>{response_type}</span>
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
					<Popover>
						<Tooltip>
							<TooltipTrigger asChild>
								<PopoverTrigger asChild>
									<Button
										disabled={!currentChat}
										className='text-base flex items-center gap-2 font-semibold capitalize text-foreground cursor-pointer hover:bg-accent border border-border rounded-xl px-4 py-2 shadow-sm hover:shadow-md bg-card transition-all disabled:opacity-50'
										ref={relTriggerRef}
									>
										<span className='font-bold text-foreground'>
											{character?.attributes?.name}
										</span>
										{currentChat?.data?.attributes?.relationship_type && (
											<span className='text-xs bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700 px-2.5 py-1 rounded-full font-medium'>
												{currentChat?.data?.attributes?.relationship_type}
											</span>
										)}
										<div className='h-2.5 w-2.5 bg-emerald-500 rounded-full ring-2 ring-emerald-200 animate-pulse'></div>
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
				</div>

				<div className='flex items-center gap-2'>
					<ThemeSwitcher />
					{!isRightSidebarOpen && (
						<button
							onClick={() => {
								setIsRightSidebarOpen(true);
								if (typeof window !== 'undefined') {
									localStorage.setItem('rightSidebarOpen', 'true');
								}
							}}
							className='p-2.5 text-foreground hover:text-foreground rounded-xl bg-card/90 backdrop-blur-sm hover:bg-card transition-all shadow-md hover:shadow-lg border border-border'
							aria-label='Open character details'
						>
							<PanelRight className='w-5 h-5' />
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
