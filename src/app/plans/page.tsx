'use client';

import useUserStore from '@/zustand/useStore';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function PlansPage() {
  const { paidPlans } = useUserStore();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 text-white">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Premium Options</h1>
        <Link href="/chat">
          <Button className="border bg-transparent text-white">Back to Chat</Button>
        </Link>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Premium Plans</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {(paidPlans || []).map((p) => (
            <div key={p.id} className="border border-gray-400 bg-gray-700 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{p.attributes.name}</h3>
                {p.attributes.price !== undefined && (
                  <span className="font-bold">{p.attributes.price}</span>
                )}
              </div>
              {p.attributes.description && (
                <p className="text-sm whitespace-pre-wrap text-gray-200">
                  {p.attributes.description}
                </p>
              )}
              <div className="text-sm text-gray-300">
                {p.attributes.duration && (
                  <div>
                    Duration: {p.attributes.duration} {p.attributes.duration_unit}
                  </div>
                )}
                {p.attributes.credit_included && (
                  <div>Credits / period: {p.attributes.credit_included}</div>
                )}
              </div>
              <div>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white w-full">
                  Choose {p.attributes.name}
                </Button>
              </div>
            </div>
          ))}
          {!paidPlans?.length && (
            <div className="text-gray-300">No premium plans available yet.</div>
          )}
        </div>
      </section>

      {/* Credit Packs intentionally omitted for now */}
    </div>
  );
}


