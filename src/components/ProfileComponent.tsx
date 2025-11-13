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
    setDeleteLoading(true);
    await useApi(
      `/users`,
      {
        method: 'DELETE',
      },
      access_token
    );
    setDeleteLoading(false);
    logout();
    router.push('/');
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
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={handleBackNavigation}
            className="p-2 cursor-pointer hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>

          <h1 className="text-xl font-bold">Profile Settings</h1>

          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="cursor-pointer p-2 bg-pink-500 hover:bg-pink-600 rounded-lg transition-colors"
            >
              <Edit3 className="h-5 w-5" />
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleCancel}
                className="p-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <button
                onClick={handleSubmit(onSubmit)}
                disabled={!isDirty || updateProfileMutation.isPending}
                className="p-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {updateProfileMutation.isPending ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <Check className="h-5 w-5" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Avatar Section */}
        <div className="bg-gray-800 rounded-2xl p-6">
          <div className="text-center">
            <div className="relative mb-4">
              <Image
                src={user?.data?.attributes?.avatar || '/default-avatar.png'}
                alt="Profile"
                width={96}
                height={96}
                className="w-24 h-24 rounded-full mx-auto border-4 border-gray-700"
              />
              {isEditing && (
                <button className="absolute bottom-0 right-1/2 translate-x-1/2 translate-y-1/2 bg-pink-500 w-8 h-8 rounded-full flex items-center justify-center border-2 border-gray-800">
                  <Edit3 className="h-4 w-4" />
                </button>
              )}
            </div>

            {!isEditing ? (
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  {user?.data?.attributes?.name || 'Anonymous User'}
                </h2>
                <p className="text-gray-400 text-sm font-mono">
                  ID: {user?.data?.id?.slice(0, 8)}...
                </p>
              </div>
            ) : (
              <div className="max-w-md mx-auto">
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
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-center text-lg font-bold focus:outline-none focus:border-pink-500"
                    />
                  )}
                />
                {errors.name && (
                  <p className="text-red-400 text-sm mt-2">
                    {errors.name.message}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Profile Information */}
        <div className="grid gap-6">
          {/* Age Type */}
          <div className="bg-gray-800 rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                <Calendar className="h-5 w-5 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold">Age Type</h3>
            </div>

            {!isEditing ? (
              <div className="flex items-center space-x-3 ml-13">
                <span className="text-2xl">{currentAgeTypeInfo.emoji}</span>
                <p className="text-gray-300">{currentAgeTypeInfo.label}</p>
              </div>
            ) : (
              <div className="ml-13">
                {fetchError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {fetchError}
                  </div>
                )}
                <Controller
                  control={control}
                  name="age_type"
                  rules={{ required: 'Age type is required' }}
                  render={({ field: { onChange, value } }) => (
                    <div className="space-y-2">
                      {ageTypes.map((ageType) => (
                        <label
                          key={ageType.value}
                          className={`flex items-center space-x-3 p-3 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                            value === ageType.value
                              ? 'border-pink-400 bg-pink-50/10'
                              : 'border-gray-600 hover:border-gray-500'
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
                          <span className="text-2xl">{ageType.emoji}</span>
                          <span className="text-gray-300">{ageType.label}</span>
                          {value === ageType.value && (
                            <div className="ml-auto w-4 h-4 bg-pink-500 rounded-full flex items-center justify-center">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                />
                {errors.age_type && (
                  <p className="text-red-400 text-sm mt-2">
                    {errors.age_type.message}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Language */}
          <div className="bg-gray-800 rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Globe className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold">Language</h3>
            </div>

            {!isEditing ? (
              <p className="text-gray-300 ml-13">
                {user?.data?.attributes?.language || 'Not specified'}
              </p>
            ) : (
              <div className="ml-13">
                <Controller
                  control={control}
                  name="language"
                  render={({ field: { onChange, value } }) => (
                    <select
                      value={value}
                      onChange={onChange}
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl focus:outline-none focus:border-pink-500"
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
            <div className="bg-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                    <Shield className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Parent Approval</h3>
                    <p className="text-sm text-gray-400">
                      Required for children and teenagers
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      user?.data?.attributes?.parent_ok
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}
                  >
                    {user?.data?.attributes?.parent_ok ? 'Approved' : 'Pending'}
                  </span>

                  {isEditing && (
                    <div className="flex flex-col items-end">
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
                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500 peer-disabled:opacity-50"></div>
                          </label>
                        )}
                      />
                      {(watchedAgeType === 'teen' ||
                        watchedAgeType === 'parent') && (
                        <p className="text-xs text-gray-400 mt-1">
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
        <div className="bg-gray-800 rounded-2xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <Calendar className="h-5 w-5 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold">Subscription</h3>
          </div>

          {plan ? (
            <div className="ml-13 space-y-2">
              <p className="text-gray-200">
                <span className="text-gray-400">Current plan:</span>{' '}
                <span className="font-semibold">{(plan as any)?.attributes?.name}</span>
              </p>
              {(plan as any)?.attributes?.description && (
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{(plan as any)?.attributes?.description}</p>
              )}
              <div className="text-sm text-gray-300 space-y-1">
                {(plan as any)?.attributes?.price !== undefined && (
                  <div>
                    <span className="text-gray-400">Price:</span> {(plan as any)?.attributes?.price}
                  </div>
                )}
                {(plan as any)?.attributes?.duration && (
                  <div>
                    <span className="text-gray-400">Duration:</span> {(plan as any)?.attributes?.duration} {(plan as any)?.attributes?.duration_unit}
                  </div>
                )}
                {(userPlan as any)?.attributes?.start_date && (
                  <div>
                    <span className="text-gray-400">Period:</span>{' '}
                    {new Date((userPlan as any)?.attributes?.start_date).toLocaleDateString()} - {new Date((userPlan as any)?.attributes?.end_date).toLocaleDateString()}
                  </div>
                )}
              </div>

              {(() => {
                const slug = (((plan as any)?.attributes?.slug) ?? ((plan as any)?.data?.attributes?.slug)) as string | undefined;
                return slug && slug !== 'free' && slug !== 'bonus';
              })() && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      if (!cancelSubLoading) handleCancelSubscription();
                    }}
                    className="text-red-400 hover:text-red-300 underline decoration-red-400/60 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={cancelSubLoading}
                  >
                    {cancelSubLoading ? 'Unsubscribing…' : 'Unsubscribe'}
                  </button>
                </div>
              )}

              {(() => {
                const slug = (((plan as any)?.attributes?.slug) ?? ((plan as any)?.data?.attributes?.slug)) as string | undefined;
                return !slug || slug === 'free' || slug === 'bonus';
              })() && (
                <div className="pt-2">
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => router.push('/plans?from=settings')}
                  >
                    Upgrade to Premium
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="ml-13 text-gray-300">No active subscription</p>
          )}
        </div>

        {/* Logout Button */}
        <div className="pt-6 flex items-center gap-4">
          <button
            onClick={() => {
              logout();
              deleteCookie('access_token');
              router.push('/');
            }}
            className="w-full cursor-pointer bg-blue-400/50  border-red-500/30 hover:bg-red-500/30 text-white font-semibold py-4 rounded-xl transition-colors"
          >
            Sign Out
          </button>
          <Dialog>
            <DialogTrigger className="w-full cursor-pointer bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 text-red-400 font-semibold py-4 rounded-xl transition-colors">
              Delete Account
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-black">
                  Are you absolutely sure?
                </DialogTitle>
                <DialogDescription>
                  This action cannot be undone. This will permanently delete
                  your account from our servers.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose>
                  <Button variant={'outline'} className="text-black">
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  onClick={() => {
                    handleDeleteUser();
                  }}
                  className="bg-red-500"
                >
                  {deleteLoading && (
                    <Loader2 className="mr-2 h-6 w-6 animate-spin text-pink-500" />
                  )}
                  Yes, Delete chat
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Error Message */}
        {updateProfileMutation.isError && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-400 p-4 rounded-xl">
            <p className="font-semibold">Update Failed</p>
            <p className="text-sm">
              Please try again or contact support if the problem persists.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
