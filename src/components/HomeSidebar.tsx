'use client';

import { Button } from '@/components/ui/button';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from '@/components/ui/sidebar';
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
import useUserStore, { CharacterData } from '@/zustand/useStore';
import { User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface HomeSidebarProps {
	sortedCharacters: CharacterData[];
	handleCharacterClick: (character: CharacterData) => void;
}

export default function HomeSidebar({
	sortedCharacters,
	handleCharacterClick,
}: HomeSidebarProps) {
	const router = useRouter();
	const { setOpenMobile } = useSidebar();
	const { user, isLoggedIn, currentChat, plan, userPlan } = useUserStore();

	const closeMobileMenu = () => {
		setOpenMobile(false);
	};

	// Reusable body for the plan popover
	const PlanPopoverBody = () => (
		<div className='space-y-5 text-popover-foreground'>
			{/* Header */}
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

			{/* Details Section */}
			<div className='space-y-3 pt-4 border-t border-border'>
				{getPlanPrice(plan) !== undefined && (
					<div className='flex justify-between items-center py-1.5 px-2 rounded-lg bg-muted/30'>
						<span className='text-muted-foreground text-sm'>Price</span>
						<span className='font-bold text-popover-foreground text-base'>
							{getPlanPrice(plan)}
						</span>
					</div>
				)}
				{getPlanDuration(plan) && (
					<div className='flex justify-between items-center py-1.5 px-2 rounded-lg bg-muted/30'>
						<span className='text-muted-foreground text-sm'>Duration</span>
						<span className='font-bold text-popover-foreground text-base'>
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
							<div className='flex justify-between items-center py-1.5 px-2 rounded-lg bg-muted/30'>
								<span className='text-muted-foreground text-sm'>Period</span>
								<span className='font-bold text-popover-foreground text-base'>
									{start.toLocaleDateString()} - {end.toLocaleDateString()}
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

			{/* Action Buttons */}
			{isFreeOrBonusPlan(plan) && (
				<div className='pt-2'>
					<Button
						className='w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold py-3 rounded-xl transition-all shadow-lg hover:shadow-xl border-0'
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
				<div className='pt-2'>
					<Button
						className='w-full border-2 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500 bg-transparent font-semibold py-3 rounded-xl transition-all'
						onClick={() => router.push('/credits?from=home')}
					>
						Buy credits
					</Button>
				</div>
			)}
		</div>
	);

	return (
		<Sidebar>
			<SidebarHeader className='p-6 pb-0'>
				<h1 className='text-2xl font-bold text-sidebar-foreground'>
					Nice<span className='text-pink-500'> Buddies</span>
				</h1>
			</SidebarHeader>

			<SidebarContent className='px-6'>
				{/* Plan Popover */}
				{isLoggedIn && plan && (
					<div className='mb-4'>
						<Popover>
							<PopoverTrigger asChild>
								<button className='w-full capitalize border border-border rounded-xl flex items-center gap-2 px-4 py-2.5 font-semibold text-foreground cursor-pointer hover:bg-accent transition-all shadow-sm hover:shadow-md bg-card'>
									<span className='text-xs bg-emerald-500 text-white px-2.5 py-1 rounded-full font-bold'>
										Plan
									</span>
									<span className='text-sm flex-1 text-left'>
										{getPlanName(plan)}
									</span>
								</button>
							</PopoverTrigger>
							<PopoverContent className='border-0 bg-popover shadow-2xl p-6 w-[min(90vw,22rem)]'>
								<PlanPopoverBody />
							</PopoverContent>
						</Popover>
					</div>
				)}

				{/* Navigation */}
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							onClick={() => {
								currentChat?.data
									? router.push('/chat')
									: handleCharacterClick(sortedCharacters[0]);
								closeMobileMenu();
							}}
							className='cursor-pointer flex items-center space-x-3 w-full text-left p-3 rounded-xl text-white font-semibold bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg h-auto'
						>
							<span>💬</span>
							<span>My Chats</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarContent>

			{user?.data && (
				<SidebarFooter className='p-6 pt-4 border-t border-sidebar-border'>
					<Link
						href='/profile'
						onClick={closeMobileMenu}
						className='flex cursor-pointer items-center space-x-3 w-full text-left text-sidebar-foreground hover:text-sidebar-foreground p-2 rounded-lg hover:bg-sidebar-accent transition-colors'
					>
						<User className='w-4 h-4' />
						<span>Profile settings</span>
					</Link>
				</SidebarFooter>
			)}
		</Sidebar>
	);
}
