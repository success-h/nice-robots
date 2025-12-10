'use client';

import { WS_URL } from '@/constants';
import { Coins } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import useUserStore from '../zustand/useStore';

interface CreditsData {
	credit: number | string;
}

export default function CreditsComponent() {
	const [isConnected, setIsConnected] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const { user, access_token, credits, setCredits, accountId } = useUserStore();
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

	// Show credits even if not connected (fallback to store value)
	// Only show loading if we're actively trying to connect
	if (isLoading && accountId) {
		return (
			<div className='flex items-center space-x-2 px-3 py-2 rounded-xl bg-muted border border-border shadow-sm'>
				<Coins className='w-4 h-4 text-yellow-500' />
				<span className='text-sm text-muted-foreground font-medium'>
					Loading...
				</span>
			</div>
		);
	}

	// Show offline state only if we explicitly know we're not connected
	// Otherwise, show credits from store
	if (!isConnected && accountId && !isLoading) {
		return (
			<div className='flex items-center space-x-2 px-3 py-2 rounded-xl bg-destructive/10 border border-destructive/20 shadow-sm'>
				<Coins className='w-4 h-4 text-destructive' />
				<span className='text-sm text-destructive font-medium'>Offline</span>
			</div>
		);
	}

	// Default: show credits from store (works even if WebSocket isn't connected)
	return (
		<div className='flex items-center space-x-2 px-3 py-2 rounded-xl bg-primary border border-border shadow-md hover:shadow-lg transition-shadow'>
			<div className='flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20'>
				<Coins className='w-3.5 h-3.5 text-emerald-400' />
			</div>
			<span className='text-sm font-bold text-primary-foreground'>
				{credits.toLocaleString()}
			</span>
		</div>
	);
}
