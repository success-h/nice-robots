'use client';

import { GOOGLE_WEB_CLIENT_ID } from '@/constants';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import PlansBootstrapper from '@/components/PlansBootstrapper';
import UserBootstrapper from '@/components/UserBootstrapper';
import { Toaster } from '@/components/ui/sonner';
import InsufficientResourcesModal from '@/components/InsufficientResourcesModal';

export default function Provider({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        staleTime: 1000 * 60,
      },
    },
  });

  return (
    <GoogleOAuthProvider clientId={GOOGLE_WEB_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <PlansBootstrapper />
        <UserBootstrapper />
        <Toaster richColors position="top-right" />
        <InsufficientResourcesModal />
        {children}
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}
