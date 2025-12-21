'use client';

import { WS_URL } from '@/constants';
import { Coins } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import useUserStore from '../zustand/useStore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { isFreeOrBonusPlan } from '@/utils/planHelpers';

interface CreditsData {
	credit: number | string;
}

export default function CreditsComponent() {
	const [isConnected, setIsConnected] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const { user, access_token, credits, setCredits, accountId, plan } = useUserStore();
	const router = useRouter();
	const socketRef = useRef<any>(null);
	const channelRef = useRef<any>(null);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		// Clear any existing timeout
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}

		// Set a timeout to stop loading after 5 seconds if connection doesn't complete
		timeoutRef.current = setTimeout(() => {
			setIsLoading(false);
		}, 5000);

		if (!user?.data?.id || !access_token) {
			setIsLoading(false);
			setIsConnected(false);
			return;
		}

		// Only use accountId, never user.data.id
		if (!accountId) {
			setIsLoading(false);
			setIsConnected(false);
			return;
		}

		const initPhoenix = async () => {
			try {
				const PhoenixModule = await import('phoenix');
				const Phoenix = PhoenixModule.default || PhoenixModule;

				socketRef.current = new Phoenix.Socket(WS_URL, {
					params: { token: access_token },
				});

				socketRef.current.connect();

				// Add socket event listeners
				socketRef.current.onOpen(() => {
					// Connection opened
				});

				socketRef.current.onClose(() => {
					setIsConnected(false);
				});

				socketRef.current.onError((error: any) => {
					console.error('WebSocket error:', error);
					setIsConnected(false);
					setIsLoading(false);
					if (timeoutRef.current) {
						clearTimeout(timeoutRef.current);
						timeoutRef.current = null;
					}
				});

				channelRef.current = socketRef.current.channel(`account:${accountId}`);

				channelRef.current.on('credit_update', (payload: CreditsData) => {
					console.log('💳 Credit update received:', payload.credit);
					// Update global store when credit update received
					const creditValue =
						typeof payload.credit === 'string'
							? parseFloat(payload.credit)
							: payload.credit;
					console.log('💳 Setting credits to:', creditValue);
					setCredits(creditValue);
				});

				channelRef.current
					.join()
					.receive('ok', (resp: any) => {
						setIsConnected(true);
						setIsLoading(false);
						if (timeoutRef.current) {
							clearTimeout(timeoutRef.current);
							timeoutRef.current = null;
						}
					})
					.receive('error', (resp: any) => {
						console.error('Channel join error:', resp);
						setIsConnected(false);
						setIsLoading(false);
						if (timeoutRef.current) {
							clearTimeout(timeoutRef.current);
							timeoutRef.current = null;
						}
					})
					.receive('timeout', () => {
						console.error('Channel join timeout');
						setIsConnected(false);
						setIsLoading(false);
						if (timeoutRef.current) {
							clearTimeout(timeoutRef.current);
							timeoutRef.current = null;
						}
					});
			} catch (error) {
				console.error('Failed to initialize Phoenix:', error);
				setIsConnected(false);
				setIsLoading(false);
				if (timeoutRef.current) {
					clearTimeout(timeoutRef.current);
					timeoutRef.current = null;
				}
			}
		};

		initPhoenix();

		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
				timeoutRef.current = null;
			}
			if (channelRef.current) {
				try {
					channelRef.current.leave();
				} catch (e) {
					// Ignore errors on cleanup
				}
				channelRef.current = null;
			}
			if (socketRef.current) {
				try {
					socketRef.current.disconnect();
				} catch (e) {
					// Ignore errors on cleanup
				}
				socketRef.current = null;
			}
		};
	}, [user?.data?.id, access_token, accountId, setCredits]);

	const Chip = () => {
		// Loading state while trying to connect
		if (isLoading && accountId) {
			return (
				<div className='flex items-center space-x-2 px-3 py-2 rounded-xl bg-muted border border-border shadow-sm cursor-pointer'>
					<Coins className='w-4 h-4 text-yellow-500' />
					<span className='text-sm text-muted-foreground font-medium'>
						Loading...
					</span>
				</div>
			);
		}

		// Offline state
		if (!isConnected && accountId && !isLoading) {
			return (
				<div className='flex items-center space-x-2 px-3 py-2 rounded-xl bg-destructive/10 border border-destructive/20 shadow-sm cursor-pointer'>
					<Coins className='w-4 h-4 text-destructive' />
					<span className='text-sm text-destructive font-medium'>Offline</span>
				</div>
			);
		}

		// Default state with credits
		return (
			<div className='flex items-center space-x-2 px-3 py-2 rounded-xl bg-card hover:bg-accent border border-border shadow-sm hover:shadow-md transition-colors dark:bg-card dark:hover:bg-accent cursor-pointer'>
				<div className='flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20'>
					<Coins className='w-3.5 h-3.5 text-emerald-400' />
				</div>
				<span className='text-sm font-bold text-foreground'>
					{credits.toLocaleString()}
				</span>
			</div>
		);
	};

	const isFree = isFreeOrBonusPlan(plan);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<div>
					<Chip />
				</div>
			</PopoverTrigger>
			<PopoverContent
				className='w-56 sm:w-64 p-4 sm:p-5 bg-popover border border-border rounded-2xl shadow-xl'
				align='end'
			>
				<div className='space-y-3'>
					<div className='flex items-center justify-between'>
						<span className='text-muted-foreground text-sm'>Credits left</span>
						<span className='font-bold text-popover-foreground text-lg'>
							{credits.toLocaleString()}
						</span>
					</div>
					<div className='pt-1'>
						{isFree ? (
							<Button
								className='w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold py-3 rounded-xl transition-all shadow-lg hover:shadow-xl border-0'
								onClick={() => router.push('/plans?from=credits-chip')}
							>
								Upgrade to Premium
							</Button>
						) : (
							<Button
								className='w-full border-2 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500 bg-transparent font-semibold py-3 rounded-xl transition-all'
								onClick={() => router.push('/credits?from=credits-chip')}
							>
								Buy credits
							</Button>
						)}
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
