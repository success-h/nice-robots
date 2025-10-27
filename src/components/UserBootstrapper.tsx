'use client';

import { useEffect } from 'react';
import useUserStore from '@/zustand/useStore';
import { useApi } from '@/hooks/useApi';

export default function UserBootstrapper() {
  const { access_token, setUser, isLoggedIn } = useUserStore();

  useEffect(() => {
    let cancelled = false;

    const fetchUser = async () => {
      if (!access_token || !isLoggedIn) return;
      try {
        const res = await useApi(
          '/user',
          { method: 'GET', headers: { 'Cache-Control': 'no-cache' } },
          access_token
        );
        if (!cancelled && res.ok) {
          const json = await res.json();
          if (json?.data) {
            setUser({ data: json.data });
          }
        }
      } catch (_e) {
        // Non-blocking: ignore
      }
    };

    const needsRefresh = () => {
      try {
        return typeof window !== 'undefined' && window.localStorage.getItem('needsUserRefresh') === '1';
      } catch (_e) {
        return false;
      }
    };

    const clearRefresh = () => {
      try {
        if (typeof window !== 'undefined') window.localStorage.removeItem('needsUserRefresh');
      } catch (_e) {}
    };

    // Always fetch once on mount when logged in
    fetchUser();

    // Also refetch when tab regains focus or becomes visible
    const onFocus = () => fetchUser();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchUser();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus);
      document.addEventListener('visibilitychange', onVisibility);
    }

    // If marked for refresh (post-checkout), do a single refetch and clear the flag
    if (needsRefresh()) {
      fetchUser().finally(() => {
        clearRefresh();
        try {
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem('prevPlanId');
            window.localStorage.removeItem('prevPlanSlug');
          }
        } catch (_e) {}
      });
    }

    return () => {
      cancelled = true;
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus);
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  }, [access_token, isLoggedIn, setUser]);

  return null;
}


