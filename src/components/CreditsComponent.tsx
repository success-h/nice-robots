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
      <div className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-100 border border-slate-300 shadow-sm">
        <Coins className="w-4 h-4 text-yellow-500" />
        <span className="text-sm text-slate-600 font-medium">Loading...</span>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 shadow-sm">
        <Coins className="w-4 h-4 text-red-500" />
        <span className="text-sm text-red-600 font-medium">Offline</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 shadow-md hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20">
        <Coins className="w-3.5 h-3.5 text-emerald-400" />
      </div>
      <span className="text-sm font-bold text-white">
        {credits.toLocaleString()}
      </span>
    </div>
  );
}
