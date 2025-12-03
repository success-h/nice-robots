'use client';

import useUserStore from '@/zustand/useStore';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useApi } from '@/hooks/useApi';
import Image from 'next/image';
import { CheckCircle2 } from 'lucide-react';

export default function PlansPage() {
  const { paidPlans, access_token, plan } = useUserStore();
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  const [characters, setCharacters] = useState<Array<{ id: string; attributes: { name: string; avatar: string } }>>([]);
  const [creatingPlanId, setCreatingPlanId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchCharacters = async () => {
      try {
        const res = await useApi('/characters', { method: 'GET' });
        const json = await res.json();
        if (!cancelled && Array.isArray(json?.data)) {
          // Keep a limited set for decoration
          setCharacters(json.data.slice(0, 12));
        }
      } catch (_e) {
        // Non-blocking; ignore decorative fetch errors
      }
    };
    fetchCharacters();
    return () => {
      cancelled = true;
    };
  }, []);

  const { leftThree, rightTop, rightFour } = useMemo(() => {
    const result = { leftThree: [] as typeof characters, rightTop: null as (typeof characters[number]) | null, rightFour: [] as typeof characters };
    if (!characters.length) return result;
    const shuffled = [...characters].sort(() => Math.random() - 0.5);
    result.leftThree = shuffled.slice(0, 3);
    result.rightTop = shuffled[3] ?? shuffled[0] ?? null;
    result.rightFour = shuffled.slice(4, 8);
    return result;
  }, [characters]);

  const redirectToStripe = async (sessionId: string) => {
    try {
      const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
      if (publishableKey) {
        const stripe = await loadStripe(publishableKey);
        if (stripe) {
          const { error } = await stripe.redirectToCheckout({ sessionId });
          if (error) {
            console.error('Stripe redirect error:', error.message);
            // Fallback
            window.location.href = `https://checkout.stripe.com/c/${sessionId}`;
          }
          return;
        }
      }
      // If key missing or stripe failed to init, fallback to direct URL pattern
      window.location.href = `https://checkout.stripe.com/c/${sessionId}`;
    } catch (e) {
      console.error('Stripe init error:', e);
      window.location.href = `https://checkout.stripe.com/c/${sessionId}`;
    }
  };

  const handleChoosePlan = async (plan: { id: string; attributes: { slug?: string; name: string } }) => {
    if (!plan?.attributes?.slug) {
      alert('Unable to start checkout: plan slug is missing.');
      return;
    }
    try {
      setCreatingPlanId(plan.id);
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const successUrl = `${origin}${from === 'home' || from === 'settings' ? '/' : '/chat'}`;
      const cancelUrl = successUrl;
      const res = await useApi(
        '/orders',
        {
          method: 'POST',
          body: JSON.stringify({
            items: [
              {
                item_name: 'plan',
                item_slug: plan.attributes.slug,
                quantity: 1,
              },
            ],
            success_url: successUrl,
            cancel_url: cancelUrl,
          }),
        },
        access_token
      );
      const json = await res.json();
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('needsUserRefresh', '1');
          const prevPlanId = (plan as any)?.id ?? (plan as any)?.data?.id ?? '';
          const prevPlanSlug = (plan as any)?.attributes?.slug ?? (plan as any)?.data?.attributes?.slug ?? '';
          window.localStorage.setItem('prevPlanId', String(prevPlanId || ''));
          window.localStorage.setItem('prevPlanSlug', String(prevPlanSlug || ''));
        }
      } catch (_e) {
        // ignore storage errors
      }
      const sessionId = (json?.data?.attributes?.stripe_session_id ?? json?.data?.stripe_session_id) as string | undefined;
      const checkoutUrl = (json?.data?.attributes?.checkout_url ?? json?.data?.checkout_url) as string | undefined;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }
      if (sessionId) {
        await redirectToStripe(sessionId);
        return;
      }
      console.warn('Order created, but no checkout URL or session id found:', json);
      alert('Unable to redirect to checkout. Please try again later.');
    } catch (err) {
      console.error('Failed to create order:', err);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setCreatingPlanId(null);
    }
  };

  return (
    <div className="text-white">
      <div className="relative mx-auto xl:grid xl:grid-cols-[clamp(220px,22vw,340px)_minmax(0,clamp(52rem,58vw,70rem))_clamp(220px,22vw,340px)] 2xl:grid-cols-[clamp(260px,24vw,420px)_minmax(0,clamp(56rem,60vw,80rem))_clamp(260px,24vw,420px)] xl:gap-8 2xl:gap-10 xl:pr-8 2xl:pr-12">
        {/* Left images column (xl+) */}
        <div className="hidden xl:flex items-start justify-end pt-8">
          <div className="pointer-events-none flex flex-col gap-[clamp(8px,1.2vw,20px)]">
            {leftThree.map((c, idx) => (
              <div
                key={`l-${c.id}-${idx}`}
                className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 w-[clamp(220px,20vw,320px)] h-[clamp(280px,26vw,380px)]"
              >
                <Image
                  src={c.attributes.avatar}
                  alt={c.attributes.name}
                  fill
                  sizes="(min-width: 1280px) 20vw, 0px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Center content */}
        <div className="p-6 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Premium Options</h1>
        {(() => {
          const backHref = from === 'home' ? '/' : from === 'settings' ? '/profile' : '/chat';
          const backLabel = from === 'home' ? 'Back to Home' : from === 'settings' ? 'Back to Settings' : 'Back to Chat';
          return (
            <Link href={backHref}>
              <Button className="border bg-transparent text-white">{backLabel}</Button>
            </Link>
          );
        })()}
      </header>

      <section className="space-y-4">
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold">Premium Plans</h2>
            <div className="space-y-4">
              {(() => {
                const plans = (paidPlans || []).slice().sort((a, b) => (Number(b.attributes.duration || 0) - Number(a.attributes.duration || 0)));
                const recommendedId = plans[0]?.id;
                return plans.map((p) => {
                  const recommended = p.id === recommendedId;
                  return (
                    <div
                      key={p.id}
                      className={`rounded-xl p-4 bg-gray-800/60 border transition-colors ${recommended ? 'border-pink-500 ring-1 ring-pink-500/30' : 'border-gray-700 hover:border-gray-600'}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold">{p.attributes.name}</h3>
                            {recommended && (
                              <span className="text-xs px-2 py-1 rounded-full bg-pink-500 text-white whitespace-nowrap">BEST&nbsp;CHOICE</span>
                            )}
                          </div>
                          {p.attributes.description && (
                            <p className="text-sm whitespace-pre-wrap text-gray-200 max-w-prose">
                              {p.attributes.description}
                            </p>
                          )}
                          <div className="text-sm text-gray-300 flex flex-wrap gap-4">
                            {p.attributes.duration && (
                              <div>
                                <span className="text-gray-400">Duration:</span> {p.attributes.duration} {p.attributes.duration_unit}
                              </div>
                            )}
                            {p.attributes.credit_included && (
                              <div>
                                <span className="text-gray-400">Credits / period:</span> {p.attributes.credit_included}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right min-w-[120px]">
                          {p.attributes.price !== undefined && (
                            <div className="text-2xl font-extrabold">{p.attributes.price}</div>
                          )}
                          <div className="mt-2">
                            <Button
                              className="bg-emerald-600 hover:bg-emerald-700 text-white w-full whitespace-nowrap"
                              disabled={creatingPlanId === p.id}
                              onClick={() => handleChoosePlan(p as any)}
                            >
                              {creatingPlanId === p.id ? 'Processing…' : 'Choose'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
              {!paidPlans?.length && (
                <div className="text-gray-300">No premium plans available yet.</div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Premium Benefits</h2>
            <div className="rounded-xl p-4 bg-gray-800/60 border border-gray-700">
              <ul className="space-y-3 text-sm">
                {[
                  'Text and voice messages',
                  '100 credits per month',
                  'No expiry on credits',
                  'Priority response speed',
                ].map((b) => (
                  <li key={b} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Credit Packs intentionally omitted for now */}
        </div>

        {/* Right images column (xl+) */}
        <div className="hidden xl:flex flex-col items-start pt-8">
          <div className="pointer-events-none w-full">
            {rightTop && (
              <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 mx-auto w-full max-w-[300px] pb-[100%]">
                <Image
                  src={rightTop.attributes.avatar}
                  alt={rightTop.attributes.name}
                  fill
                  sizes="(min-width: 1280px) 24vw, 0px"
                  className="object-cover"
                />
              </div>
            )}
            {rightFour.length > 0 && (
              <div className="grid grid-cols-2 gap-[clamp(10px,1.5vw,28px)] mt-[clamp(16px,2vw,32px)] w-full">
                {rightFour.map((c, idx) => (
                  <div
                    key={`r-${c.id}-${idx}`}
                    className="relative rounded-2xl overflow-hidden shadow-xl ring-1 ring-white/10 w-full pb-[120%]"
                  >
                    <Image
                      src={c.attributes.avatar}
                      alt={c.attributes.name}
                      fill
                      sizes="(min-width: 1280px) 22vw, 0px"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


