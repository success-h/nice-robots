'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit3,
  Check,
  X,
  Calendar,
  Globe,
  Shield,
  Loader2,
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import useUserStore, { User } from '@/zustand/useStore';
import Image from 'next/image';
import { useDeleteCookie, useGetCookie } from 'cookies-next';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useApi } from '@/hooks/useApi';
import { RequestCookie } from 'next/dist/compiled/@edge-runtime/cookies';
import { toast } from 'sonner';
import {
  getPlanName,
  getPlanDescription,
  getPlanPrice,
  getPlanDuration,
  getPlanDurationUnit,
  getPlanSlug,
  getUserPlanAttributes,
} from '@/utils/planHelpers';

interface AgeType {
  value: string;
  label: string;
  emoji: string;
}

type ProfileFormData = {
  name: string;
  avatar: string;
  language: string;
  parent_ok: boolean;
  age_type: string;
};

type UpdatePayload = {
  data: Partial<ProfileFormData>;
  token?: string;
};

const updateUser = async ({ data, token }: UpdatePayload) => {
  try {
    const attributes: any = {};

    // Only include defined values in the attributes
    if (data.name !== undefined) attributes.name = data.name;
    if (data.language !== undefined) attributes.language = data.language;
    if (data.parent_ok !== undefined) attributes.parent_ok = data.parent_ok;
    if (data.age_type !== undefined) attributes.age_type = data.age_type;

    const response = await useApi(
      '/users',
      {
        method: 'PATCH',
        body: JSON.stringify({
          data: {
            attributes,
          },
        }),
      },
      token
    );
    const resData = await response.json();
    return resData;
  } catch (error) {
    console.log('error:', error);
    throw error;
  }
};

const languageOptions = [
  'English',
  'Spanish',
  'French',
  'Igbo',
  'German',
  'Italian',
  'Portuguese',
  'Japanese',
  'Korean',
  'Chinese',
];

type Props = {
  access_token: string | undefined;
};

export default function ProfilePage({ access_token }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [ageTypes, setAgeTypes] = useState<AgeType[]>([]);
  const [fetchError, setFetchError] = useState<string>('');
  const { user, setUser, logout, plan, userPlan } = useUserStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const deleteCookie = useDeleteCookie();
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [cancelSubLoading, setCancelSubLoading] = useState(false);

  const defaultAgeTypes: AgeType[] = [
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
        // Filter out 'child' before mapping
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
        setAgeTypes(mappedAgeTypes || []);
      } catch (error) {
        console.error('Error fetching age types:', error);
        setFetchError('Failed to load age types');
        // Use default age types as fallback
        setAgeTypes(defaultAgeTypes);
      }
    };

    fetchAgeTypes();
  }, []);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    defaultValues: {
      name: user?.data?.attributes?.name || '',
      age_type: user?.data?.attributes?.age_type || '',
      language: user?.data?.attributes?.language || '',
      parent_ok: user?.data?.attributes?.parent_ok || false,
      avatar: user?.data?.attributes?.avatar?.toString() || '',
    },
  });

  const watchedAgeType = watch('age_type');

  const updateProfileMutation = useMutation({
    mutationFn: updateUser,
    mutationKey: ['profile'],
    onSuccess: (data: User) => {
      setUser({
        data: data.data,
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error) => {
      console.error('Profile update failed:', error);
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    const updateData: Partial<ProfileFormData> = { ...data };

    // Automatically set parent_ok for teen and parent
    if (data.age_type === 'teen' || data.age_type === 'parent') {
      updateData.parent_ok = true;
    } else {
      updateData.parent_ok = false;
    }

    const payload: UpdatePayload = {
      token: access_token,
      data: updateData,
    };
    updateProfileMutation.mutate(payload);
  };

  const handleCancel = () => {
    reset();
    setIsEditing(false);
  };

  const handleBackNavigation = () => {
    router.push('/');
  };

  const getCurrentAgeTypeInfo = () => {
    if (!user?.data?.attributes?.age_type)
      return { label: 'Not specified', emoji: '❓' };

    const ageTypeInfo = ageTypes.find(
      (at) => at.value === user.data.attributes.age_type
    );
    return (
      ageTypeInfo || {
        label: user.data.attributes.age_type.replace('_', ' '),
        emoji: '👤',
      }
    );
  };

  const currentAgeTypeInfo = getCurrentAgeTypeInfo();

  const handleDeleteUser = async () => {
    if (!access_token) {
      toast.error('Authentication required to delete account');
      return;
    }

    setDeleteLoading(true);
    try {
      const response = await useApi(
        `/users`,
        {
          method: 'DELETE',
        },
        access_token
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: 'Failed to delete account' }));
        throw new Error(
          errorData.message || `Server error: ${response.status}`
        );
      }

      // Clear all user data
      logout();

      // Clear cookies
      deleteCookie('access_token');

      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.clear();
      }

      // Redirect to home
      router.push('/');

      toast.success('Account deleted successfully');
    } catch (error) {
      console.error('Error deleting account:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to delete account. Please try again.';
      toast.error(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!access_token) return;
    try {
      setCancelSubLoading(true);
      const cancelRes = await useApi(
        '/orders/active/cancel',
        { method: 'PATCH' },
        access_token
      );
      if (!cancelRes.ok) {
        // silently ignore; optionally surface UI feedback later
        return;
      }
      const userRes = await useApi(
        '/user',
        { method: 'GET', headers: { 'Cache-Control': 'no-cache' } },
        access_token
      );
      if (userRes.ok) {
        const json = await userRes.json();
        if (json?.data) {
          setUser({ data: json.data });
        }
      }
    } catch (_e) {
      // ignore
    } finally {
      setCancelSubLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <button
            onClick={handleBackNavigation}
            className="p-2.5 cursor-pointer hover:bg-slate-100 rounded-xl transition-all text-slate-700 hover:text-slate-900 shadow-sm hover:shadow-md border border-slate-200/50"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Profile Settings</h1>

          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="cursor-pointer p-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 rounded-xl transition-all shadow-lg hover:shadow-xl text-white active:scale-95"
            >
              <Edit3 className="h-5 w-5" />
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleCancel}
                className="p-3 bg-slate-200 hover:bg-slate-300 rounded-xl transition-all shadow-md hover:shadow-lg text-slate-700 active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
              <button
                onClick={handleSubmit(onSubmit)}
                disabled={!isDirty || updateProfileMutation.isPending}
                className="p-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl transition-all shadow-lg hover:shadow-xl text-white active:scale-95"
              >
                {updateProfileMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Check className="h-5 w-5" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
        {/* Avatar Section */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-lg border border-slate-200/60 backdrop-blur-sm relative overflow-hidden">
          {/* Decorative gradient overlay */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-pink-100/30 to-purple-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="text-center relative z-10">
            <div className="relative mb-6 inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 rounded-full blur-xl opacity-30 animate-pulse"></div>
              <Image
                src={user?.data?.attributes?.avatar || '/default-avatar.png'}
                alt="Profile"
                width={120}
                height={120}
                className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full mx-auto border-4 border-white shadow-xl ring-4 ring-pink-100/50"
              />
              {isEditing && (
                <button className="absolute bottom-2 right-1/2 translate-x-1/2 bg-gradient-to-r from-pink-500 to-purple-500 w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-xl hover:shadow-2xl transition-all hover:scale-110 active:scale-95">
                  <Edit3 className="h-5 w-5 text-white" />
                </button>
              )}
            </div>

            {!isEditing ? (
              <div className="space-y-2">
                <h2 className="text-3xl sm:text-4xl font-bold mb-2 text-slate-900 tracking-tight">
                  {user?.data?.attributes?.name || 'Anonymous User'}
                </h2>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
                  <span className="text-slate-500 text-xs font-mono tracking-wider">
                    ID: {user?.data?.id?.slice(0, 8)}...
                  </span>
                </div>
              </div>
            ) : (
              <div className="max-w-md mx-auto space-y-3">
                <Controller
                  control={control}
                  name="name"
                  rules={{ required: 'Name is required' }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <input
                      type="text"
                      placeholder="Enter your name"
                      value={value}
                      onChange={onChange}
                      onBlur={onBlur}
                      className="w-full p-4 bg-white border-2 border-slate-300 rounded-2xl text-center text-xl font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm focus:shadow-md"
                    />
                  )}
                />
                {errors.name && (
                  <div className="flex items-center gap-2 text-red-500 text-sm">
                    <X className="h-4 w-4" />
                    <span>{errors.name.message}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Profile Information */}
        <div className="grid gap-5 sm:gap-6">
          {/* Age Type */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-slate-200/60 backdrop-blur-sm hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-pink-100/50">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Age Type</h3>
                <p className="text-xs text-slate-500 mt-0.5">Your age category</p>
              </div>
            </div>

            {!isEditing ? (
              <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-pink-50/50 to-purple-50/50 rounded-2xl border border-pink-100/50">
                <span className="text-3xl">{currentAgeTypeInfo.emoji}</span>
                <div>
                  <p className="text-slate-900 font-semibold">{currentAgeTypeInfo.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Current selection</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {fetchError && (
                  <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-2xl text-red-700 text-sm flex items-start gap-3">
                    <X className="h-5 w-5 shrink-0 mt-0.5" />
                    <span>{fetchError}</span>
                  </div>
                )}
                <Controller
                  control={control}
                  name="age_type"
                  rules={{ required: 'Age type is required' }}
                  render={({ field: { onChange, value } }) => (
                    <div className="space-y-3">
                      {ageTypes.map((ageType) => (
                        <label
                          key={ageType.value}
                          className={`group flex items-center space-x-4 p-4 border-2 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-md ${
                            value === ageType.value
                              ? 'border-pink-400 bg-gradient-to-r from-pink-50 via-purple-50 to-pink-50 shadow-lg ring-2 ring-pink-200/50'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="age_type"
                            value={ageType.value}
                            checked={value === ageType.value}
                            onChange={() => onChange(ageType.value)}
                            className="sr-only"
                          />
                          <div className={`text-3xl transition-transform duration-300 ${value === ageType.value ? 'scale-110' : 'group-hover:scale-105'}`}>
                            {ageType.emoji}
                          </div>
                          <div className="flex-1">
                            <span className={`block text-base ${value === ageType.value ? 'text-slate-900 font-semibold' : 'text-slate-700 font-medium'}`}>
                              {ageType.label}
                            </span>
                          </div>
                          {value === ageType.value && (
                            <div className="w-6 h-6 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center shadow-md ring-2 ring-pink-200">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                />
                {errors.age_type && (
                  <div className="flex items-center gap-2 text-red-500 text-sm mt-2">
                    <X className="h-4 w-4" />
                    <span>{errors.age_type.message}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Language */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-slate-200/60 backdrop-blur-sm hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-blue-100/50">
                <Globe className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Language</h3>
                <p className="text-xs text-slate-500 mt-0.5">Preferred language</p>
              </div>
            </div>

            {!isEditing ? (
              <div className="p-4 bg-gradient-to-r from-blue-50/50 to-cyan-50/50 rounded-2xl border border-blue-100/50">
                <p className="text-slate-900 font-semibold text-lg">
                  {user?.data?.attributes?.language || 'Not specified'}
                </p>
              </div>
            ) : (
              <div>
                <Controller
                  control={control}
                  name="language"
                  render={({ field: { onChange, value } }) => (
                    <select
                      value={value}
                      onChange={onChange}
                      className="w-full p-4 bg-white border-2 border-slate-300 rounded-2xl text-slate-900 font-medium focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm focus:shadow-md appearance-none cursor-pointer"
                    >
                      <option value="">Select language</option>
                      {languageOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )}
                />
              </div>
            )}
          </div>

          {/* Parent Approval */}
          {(user?.data?.attributes?.age_type === 'teen' ||
            user?.data?.attributes?.age_type === 'parent' ||
            isEditing) && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-slate-200/60 backdrop-blur-sm hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-yellow-100/50">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Parent Approval</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Required for children and teenagers
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className={`px-4 py-2 rounded-2xl text-sm font-bold shadow-md ${
                    user?.data?.attributes?.parent_ok
                      ? 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 ring-2 ring-emerald-200/50'
                      : 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-700 ring-2 ring-yellow-200/50'
                  }`}>
                    {user?.data?.attributes?.parent_ok ? (
                      <span className="flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        Approved
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Pending
                      </span>
                    )}
                  </div>

                  {isEditing && (
                    <div className="flex flex-col items-end gap-2">
                      <Controller
                        control={control}
                        name="parent_ok"
                        render={({ field: { onChange, value } }) => (
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={
                                value ||
                                watchedAgeType === 'teen' ||
                                watchedAgeType === 'parent'
                              }
                              onChange={onChange}
                              disabled={
                                watchedAgeType === 'teen' ||
                                watchedAgeType === 'parent'
                              }
                            />
                            <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all after:shadow-md peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-emerald-600 peer-disabled:opacity-50 shadow-inner"></div>
                          </label>
                        )}
                      />
                      {(watchedAgeType === 'teen' ||
                        watchedAgeType === 'parent') && (
                        <p className="text-xs text-slate-500 text-right">
                          Auto-enabled for minors
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Subscription */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-slate-200/60 backdrop-blur-sm hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-emerald-100/50">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Subscription</h3>
              <p className="text-xs text-slate-500 mt-0.5">Your current plan</p>
            </div>
          </div>

          {plan ? (
            <div className="space-y-4">
              <div className="p-5 bg-gradient-to-br from-emerald-50/50 to-green-50/50 rounded-2xl border border-emerald-100/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-600">Current plan</span>
                  <span className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs font-bold rounded-full shadow-md">
                    Active
                  </span>
                </div>
                <h4 className="text-2xl font-bold text-slate-900 mb-2">{getPlanName(plan)}</h4>
                {getPlanDescription(plan) && (
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {getPlanDescription(plan)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {getPlanPrice(plan) !== undefined && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">Price</p>
                    <p className="text-lg font-bold text-slate-900">{getPlanPrice(plan)}</p>
                  </div>
                )}
                {getPlanDuration(plan) && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">Duration</p>
                    <p className="text-lg font-bold text-slate-900">
                      {getPlanDuration(plan)} {getPlanDurationUnit(plan)}
                    </p>
                  </div>
                )}
                {(() => {
                  const userPlanAttrs = getUserPlanAttributes(userPlan);
                  if (!userPlanAttrs?.start_date || !userPlanAttrs?.end_date)
                    return null;
                  return (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 sm:col-span-2">
                      <p className="text-xs text-slate-500 mb-1">Period</p>
                      <p className="text-lg font-bold text-slate-900">
                        {new Date(userPlanAttrs.start_date).toLocaleDateString()} - {new Date(userPlanAttrs.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  );
                })()}
              </div>

              {(() => {
                const slug = getPlanSlug(plan);
                return slug && slug !== 'free' && slug !== 'bonus';
              })() && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      if (!cancelSubLoading) handleCancelSubscription();
                    }}
                    className="text-red-600 hover:text-red-700 underline decoration-red-400/60 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed font-semibold transition-colors"
                    disabled={cancelSubLoading}
                  >
                    {cancelSubLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Unsubscribing…
                      </span>
                    ) : (
                      'Unsubscribe'
                    )}
                  </button>
                </div>
              )}

              {(() => {
                const slug = getPlanSlug(plan);
                return !slug || slug === 'free' || slug === 'bonus';
              })() && (
                <div className="pt-2">
                  <Button
                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
                    onClick={() => router.push('/plans?from=settings')}
                  >
                    Upgrade to Premium
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center">
              <p className="text-slate-600 font-medium">No active subscription</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-4 sm:pt-6 space-y-3">
          <button
            onClick={() => {
              logout();
              deleteCookie('access_token');
              router.push('/');
            }}
            className="w-full cursor-pointer bg-white hover:bg-slate-50 border-2 border-slate-300 hover:border-slate-400 text-slate-700 font-bold py-4 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            Sign Out
          </button>
          <Dialog>
            <DialogTrigger className="w-full cursor-pointer bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 border-2 border-red-300 hover:border-red-400 text-red-600 font-bold py-4 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-[0.98]">
              Delete Account
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-slate-900 text-lg sm:text-xl">
                  Are you absolutely sure?
                </DialogTitle>
                <DialogDescription className="text-slate-600 text-sm">
                  This action cannot be undone. This will permanently delete
                  your account from our servers.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                <DialogClose asChild>
                  <Button 
                    variant={'outline'} 
                    className="w-full sm:w-auto text-slate-700 border-slate-300 hover:bg-slate-50"
                  >
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  onClick={() => {
                    handleDeleteUser();
                  }}
                  disabled={deleteLoading}
                  className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white"
                >
                  {deleteLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Yes, Delete Account'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Error Message */}
        {updateProfileMutation.isError && (
          <div className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 text-red-700 p-5 rounded-2xl shadow-lg">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <X className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="font-bold text-lg mb-1">Update Failed</p>
                <p className="text-sm leading-relaxed">
                  Please try again or contact support if the problem persists.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
