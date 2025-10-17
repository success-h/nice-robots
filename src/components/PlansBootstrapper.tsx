'use client';

import { useEffect } from 'react';
import useUserStore, { PlanResource, CreditPackResource } from '@/zustand/useStore';
import { useApi } from '@/hooks/useApi';

export default function PlansBootstrapper() {
  const { access_token, setPaidPlans, setCreditPacks, paidPlans, creditPacks } = useUserStore();

  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      try {
        if (!access_token) return;

        if (!paidPlans) {
          const resPlans = await useApi('/plans/paid', { method: 'GET' }, access_token);
          if (!cancelled && resPlans.ok) {
            const json = await resPlans.json();
            const data = (json?.data || []) as PlanResource[];
            setPaidPlans(Array.isArray(data) ? data : null);
          }
        }

        if (!creditPacks) {
          const resPacks = await useApi('/credit-packs', { method: 'GET' }, access_token);
          if (!cancelled && resPacks.ok) {
            const json = await resPacks.json();
            const data = (json?.data || []) as CreditPackResource[];
            setCreditPacks(Array.isArray(data) ? data : null);
          }
        }
      } catch (err) {
        // Ignore bootstrap errors; non-critical
        console.warn('Plans bootstrap failed', err);
      }
    };

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [access_token, setPaidPlans, setCreditPacks, paidPlans, creditPacks]);

  return null;
}


