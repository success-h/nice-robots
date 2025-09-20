'use client';

import { useState, useEffect } from 'react';
import useUserStore from '../zustand/useStore';
import { Coins } from 'lucide-react';
import { WS_URL } from '@/constants';

interface CreditsData {
  credit: number | string;
}
// import PhoenixModule from 'phoenix';

export default function CreditsComponent() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { user, access_token, credits, setCredits, accountId } = useUserStore();

  useEffect(() => {
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
      let socket: any = null;
      let channel: any = null;

      try {
        const PhoenixModule = await import('phoenix');
        const Phoenix = PhoenixModule.default || PhoenixModule;

        socket = new Phoenix.Socket(WS_URL, {
          params: { token: access_token },
        });

        socket.connect();

        // Add socket event listeners
        socket.onOpen(() => {
          // Connection opened
        });

        socket.onClose(() => {
          // Connection closed
        });

        socket.onError((error: any) => {
          // Connection error
        });

        channel = socket.channel(`account:${accountId}`);

        channel.on('credit_update', (payload: CreditsData) => {
          console.log('💳 Credit update received:', payload.credit);
          console.log('💳 Current credits in store:', credits);
          // Update global store when credit update received
          const creditValue =
            typeof payload.credit === 'string'
              ? parseFloat(payload.credit)
              : payload.credit;
          console.log('💳 Setting credits to:', creditValue);
          setCredits(creditValue);
          console.log('💳 Credits updated in store');
        });

        channel
          .join()
          .receive('ok', (resp: any) => {
            setIsConnected(true);
            setIsLoading(false);
          })
          .receive('error', (resp: any) => {
            setIsConnected(false);
            setIsLoading(false);
          });

        return () => {
          if (channel) {
            channel.leave();
          }
          if (socket) {
            socket.disconnect();
          }
        };
      } catch (error) {
        setIsConnected(false);
        setIsLoading(false);
        return () => {};
      }
    };

    const cleanup = initPhoenix();

    return () => {
      cleanup.then((cleanupFn) => {
        if (cleanupFn) {
          cleanupFn();
        }
      });
    };
  }, [user?.data?.id, access_token, accountId]);

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1 rounded-lg bg-gray-700">
        <Coins className="w-4 h-4 text-yellow-400" />
        <span className="text-sm text-gray-300">Loading...</span>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1 rounded-lg bg-red-900/20 border border-red-500/30">
        <Coins className="w-4 h-4 text-red-400" />
        <span className="text-sm text-red-300">Offline</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 px-3 py-1 rounded-lg bg-gray-700 border border-gray-600">
      <Coins className="w-4 h-4 text-green-400" />
      <span className="text-sm font-semibold text-white">
        {credits.toLocaleString()}
      </span>
      {/*<div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>*/}
    </div>
  );
}
