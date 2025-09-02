import { useApi } from '@/hooks/useApi';
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface AgeType {
  value: string;
  label: string;
  emoji: string;
}

interface AgeTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgeTypeSelected: (ageType: string) => void;
  isLoading?: boolean;
}

const AgeTypeModal: React.FC<AgeTypeModalProps> = ({
  isOpen,
  onClose,
  onAgeTypeSelected,
  isLoading = false,
}) => {
  const [ageTypes, setAgeTypes] = useState<AgeType[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string>('');

  const defaultAgeTypes: AgeType[] = [
    // Updated 'parent' and 'teen' labels, and removed 'child'
    {
      value: 'parent',
      label: 'I am a parent (for child up to 13)',
      emoji: '👨‍👩‍👧',
    },
    { value: 'teen', label: 'I am a teenager (parents agree)', emoji: '🧒' },
    { value: 'young_adult', label: 'I am a young adult', emoji: '🧑' },
    { value: 'adult', label: 'I am an adult', emoji: '👨' },
    { value: 'elder', label: 'I am an elder', emoji: '👴' },
  ];

  useEffect(() => {
    const fetchAgeTypes = async () => {
      try {
        const response = await useApi('/users/age-types');
        if (!response.ok) {
          throw new Error('Failed to fetch age types');
        }
        const data = await response.json();

        const mappedAgeTypes = data?.age_types
          ?.filter((ageType: string) => ageType !== 'child')
          .map((ageType: string) => {
            const defaultType = defaultAgeTypes.find(
              (dt) => dt.value === ageType
            );
            return (
              defaultType || {
                value: ageType,
                label: `I am a ${ageType.replace('_', ' ')}`,
                emoji: '👤',
              }
            );
          });
        setAgeTypes(mappedAgeTypes);
      } catch (error) {
        console.error('Error fetching age types:', error);
        setFetchError('Failed to load age types');
        setAgeTypes(defaultAgeTypes);
      }
    };

    if (isOpen) {
      fetchAgeTypes();
    }
  }, [isOpen]);

  const handleAgeTypeClick = async (ageType: string) => {
    setIsSubmitting(true);
    try {
      await onAgeTypeSelected(ageType);
      onClose();
    } catch (error) {
      console.error('Error selecting age type:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Semi-transparent backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Modal container */}
      <div className="relative w-full max-w-md mx-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-pink-100">
        {/* Close button added here */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 transition-colors z-10"
        >
          <X size={24} />
        </button>
        {/* Modal content */}
        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-pink-100 to-pink-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">👋</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Welcome!
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              For comfortable and safe communication, please select your age
              type.
            </p>
          </div>

          {/* Error message */}
          {fetchError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
              {fetchError}
            </div>
          )}

          {/* Age type buttons */}
          <div className="space-y-3">
            {ageTypes.map((ageType) => (
              <button
                key={ageType.value}
                onClick={() => handleAgeTypeClick(ageType.value)}
                disabled={isSubmitting || isLoading}
                className="w-full p-4 border-2 border-pink-200 rounded-xl text-left transition-all duration-200 hover:border-pink-300 hover:bg-pink-50/50 focus:outline-none focus:border-pink-400 focus:bg-pink-50/50 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl group-hover:scale-110 transition-transform duration-200">
                    {ageType.emoji}
                  </span>
                  <span className="text-gray-700 font-medium group-hover:text-pink-700 transition-colors duration-200">
                    {ageType.label}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Loading state */}
          {(isSubmitting || isLoading) && (
            <div className="mt-6 flex justify-center">
              <div className="flex items-center space-x-2 text-pink-600">
                <div className="w-4 h-4 border-2 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm">Saving your selection...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgeTypeModal;
