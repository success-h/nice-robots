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
  onAgeTypeSelected: (ageType: string, childName?: string) => void | Promise<void>;
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
  const [selectedAgeType, setSelectedAgeType] = useState<string | null>(null);
  const [childName, setChildName] = useState<string>('');
  const [childNameTouched, setChildNameTouched] = useState<boolean>(false);

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
    if (isSubmitting || isLoading) return;

    // If 'parent' is chosen, reveal child-name input instead of submitting immediately
    if (ageType === 'parent') {
      setSelectedAgeType('parent');
      return;
    }

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

  const childNameTrimmed = childName.trim();
  const isChildNameValid =
    selectedAgeType !== 'parent' ||
    (childNameTrimmed.length >= 1 && childNameTrimmed.length <= 40);

  const handleConfirmParent = async () => {
    if (isSubmitting || isLoading) return;
    setChildNameTouched(true);
    if (!isChildNameValid) return;

    setIsSubmitting(true);
    try {
      await onAgeTypeSelected('parent', childNameTrimmed);
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
      <div className="relative w-full max-w-md mx-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-pink-100 max-h-[90vh] overflow-y-auto">
        {/* Close button added here */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-slate-400 hover:text-slate-800 transition-colors z-10 p-1.5 rounded-lg hover:bg-slate-100"
          aria-label="Close"
        >
          <X size={20} className="sm:w-6 sm:h-6" />
        </button>
        {/* Modal content */}
        <div className="p-4 sm:p-6 md:p-8">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-pink-100 to-pink-200 rounded-full mx-auto mb-3 sm:mb-4 flex items-center justify-center">
              <span className="text-xl sm:text-2xl">👋</span>
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">
              Welcome!
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed px-2">
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

          {/* Age type buttons with inline parent child-name input */}
          <div className="space-y-3">
            {ageTypes.map((ageType) => (
              <div key={ageType.value} className="space-y-2">
                <button
                  onClick={() => handleAgeTypeClick(ageType.value)}
                  disabled={isSubmitting || isLoading}
                  className="w-full p-3 sm:p-4 border-2 border-pink-200 rounded-xl text-left transition-all duration-200 hover:border-pink-300 hover:bg-pink-50/50 focus:outline-none focus:border-pink-400 focus:bg-pink-50/50 disabled:opacity-50 disabled:cursor-not-allowed group active:scale-[0.98]"
                >
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <span className="text-xl sm:text-2xl group-hover:scale-110 transition-transform duration-200 flex-shrink-0">
                      {ageType.emoji}
                    </span>
                    <span className="text-slate-700 text-sm sm:text-base font-medium group-hover:text-pink-700 transition-colors duration-200">
                      {ageType.label}
                    </span>
                  </div>
                </button>
                {ageType.value === 'parent' && selectedAgeType === 'parent' && (
                  <div className="mt-1">
                    <label htmlFor="childName" className="block text-sm font-medium text-slate-700 mb-1">
                      Child’s name
                    </label>
                    <input
                      id="childName"
                      type="text"
                      value={childName}
                      onChange={(e) => setChildName(e.target.value)}
                      onBlur={() => setChildNameTouched(true)}
                      placeholder="Child’s first name"
                      className="w-full rounded-xl border-2 border-pink-200 bg-white text-slate-900 placeholder:text-slate-400 px-3 py-2 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-300/40"
                      autoFocus
                    />
                    {childNameTouched && !isChildNameValid && (
                      <p className="mt-1 text-xs text-red-600">Please enter a name (1–40 characters).</p>
                    )}
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedAgeType(null);
                          setChildName('');
                          setChildNameTouched(false);
                        }}
                        className="px-3 py-2 rounded-lg border-2 border-pink-200 text-slate-700 hover:bg-pink-50/50"
                        disabled={isSubmitting || isLoading}
                      >
                        Back
                      </button>
                      <button
                        onClick={handleConfirmParent}
                        disabled={isSubmitting || isLoading || !isChildNameValid}
                        className="px-4 py-2 rounded-lg bg-pink-500 text-white hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
