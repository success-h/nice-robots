"use client";

import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useUserStore from '@/zustand/useStore';

export default function InsufficientResourcesModal() {
  const {
    insufficientModalOpen,
    insufficientModalType,
    insufficientModalMessage,
    insufficientModalFrom,
    closeInsufficientModal,
  } = useUserStore();

  if (!insufficientModalOpen) return null;

  const ctaLabel = insufficientModalType === 'credits' ? 'Buy more credits now' : 'Upgrade plan';
  const from = insufficientModalFrom || 'home';
  const href = insufficientModalType === 'credits' ? `/credits?from=${from}` : `/plans?from=${from}`;
  const ctaEmoji = insufficientModalType === 'credits' ? '❤️' : '🚀';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeInsufficientModal} />

      {/* Modal container - styled like AgeTypesModal and positioned slightly higher */}
      <div className="relative w-full max-w-md mx-4 mt-16 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-pink-100">
        {/* Close button */}
        <button
          onClick={closeInsufficientModal}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 transition-colors z-10"
          aria-label="Close"
        >
          <X size={24} />
        </button>

        {/* Content */}
        <div className="p-8">
          {/* Header - simplified, no icon circle */}
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold text-gray-800">
              {insufficientModalType === 'credits' ? '😻 Want more credits?' : '😻 Amazing Plan Upgrade'}
            </h2>
          </div>

          {/* Message */}
          <p className="text-gray-700 text-sm leading-relaxed text-center mb-6">
            {insufficientModalMessage}
          </p>

          {/* Actions - outline button styled like age-type options */}
          <div className="space-y-3">
            <button
              onClick={() => window.location.assign(href)}
              className="w-full p-4 border-2 border-pink-200 rounded-xl text-left transition-all duration-200 hover:border-pink-300 hover:bg-pink-50/50 focus:outline-none focus:border-pink-400 focus:bg-pink-50/50 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl group-hover:scale-110 transition-transform duration-200">
                  {ctaEmoji}
                </span>
                <span className="text-gray-700 font-medium group-hover:text-pink-700 transition-colors duration-200">
                  {ctaLabel}
                </span>
              </div>
            </button>
            <button
              onClick={closeInsufficientModal}
              className="w-full p-4 border-2 border-pink-200 rounded-xl text-left transition-all duration-200 hover:border-pink-300 hover:bg-pink-50/50 focus:outline-none focus:border-pink-400 focus:bg-pink-50/50 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl group-hover:scale-110 transition-transform duration-200">🕗</span>
                <span className="text-gray-700 font-medium group-hover:text-pink-700 transition-colors duration-200">
                  I’ll buy it another time
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

