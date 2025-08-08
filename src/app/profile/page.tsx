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
  Users,
  Globe,
  Shield,
  UserCheck,
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import useUserStore, { User } from '@/zustand/useStore';
import { useApi } from '../../hooks/useApi';
import Image from 'next/image';

type ProfileFormData = {
  name: string;
  age: number;
  gender: string;
  language: string;
  parent_ok: boolean;
  legal_age: boolean;
};

type UpdatePayload = {
  data: ProfileFormData;
  token: string;
  id: string;
};

const updateProfile = async ({ data, token }: UpdatePayload) => {
  try {
    const response = await useApi(
      '/users',
      {
        method: 'PATCH',
        body: JSON.stringify({
          data: {
            attributes: {
              name: data.name,
              age: Number(data.age),
              gender: data.gender,
              parent_ok: data.parent_ok,
              language: data.language,
              legal_age: data.legal_age,
            },
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

const genderOptions = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
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

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const { user, setUser, isLoggedIn, logout } = useUserStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  // // Redirect if not logged in
  // useEffect(() => {
  //   if (!isLoggedIn) {
  //     router.push('/');
  //   }
  // }, [isLoggedIn, router]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    defaultValues: {
      name: user?.data?.attributes?.name || '',
      age: user?.data?.attributes?.age || 0,
      gender: user?.data?.attributes?.gender || '',
      language: user?.data?.attributes?.language || '',
      parent_ok: user?.data?.attributes?.parent_ok || false,
      legal_age: user?.data?.attributes?.legal_age || false,
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    mutationKey: ['profile'],
    onSuccess: (data: User) => {
      setUser({
        access_token: user?.access_token!,
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
    const payload: UpdatePayload = {
      token: user?.access_token!,
      data,
      id: user?.data?.id!,
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

  // if (!isLoggedIn) {
  //   return null; // Will redirect
  // }

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
                  ID: {user?.data?.id.slice(0, 8)}...
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
          {/* Age */}
          <div className="bg-gray-800 rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                <Calendar className="h-5 w-5 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold">Age</h3>
            </div>

            {!isEditing ? (
              <p className="text-gray-300 ml-13">
                {user?.data?.attributes?.age || 'Not specified'}
              </p>
            ) : (
              <div className="ml-13">
                <Controller
                  control={control}
                  name="age"
                  rules={{
                    required: 'Age is required',
                    min: { value: 13, message: 'Age must be at least 13' },
                    max: { value: 120, message: 'Age must be less than 120' },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <input
                      type="number"
                      placeholder="Enter your age"
                      value={value || ''}
                      onChange={onChange}
                      onBlur={onBlur}
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl focus:outline-none focus:border-pink-500"
                    />
                  )}
                />
                {errors.age && (
                  <p className="text-red-400 text-sm mt-2">
                    {errors.age.message}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Gender */}
          <div className="bg-gray-800 rounded-2xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-pink-500/20 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-pink-400" />
              </div>
              <h3 className="text-lg font-semibold">Gender</h3>
            </div>

            {!isEditing ? (
              <p className="text-gray-300 ml-13">
                {user?.data?.attributes?.gender || 'Not specified'}
              </p>
            ) : (
              <div className="ml-13">
                <Controller
                  control={control}
                  name="gender"
                  render={({ field: { onChange, value } }) => (
                    <select
                      value={value}
                      onChange={onChange}
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl focus:outline-none focus:border-pink-500"
                    >
                      <option value="">Select gender</option>
                      {genderOptions.map((option) => (
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
          <div className="bg-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  <Shield className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Parent Approval</h3>
                  <p className="text-sm text-gray-400">
                    Required for users under 18
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
                  <Controller
                    control={control}
                    name="parent_ok"
                    render={({ field: { onChange, value } }) => (
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={value}
                          onChange={onChange}
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                      </label>
                    )}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Legal Age */}
          <div className="bg-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Legal Age Status</h3>
                  <p className="text-sm text-gray-400">
                    Confirms you are 18 or older
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    user?.data?.attributes?.legal_age
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}
                >
                  {user?.data?.attributes?.legal_age ? 'Legal Age' : 'Minor'}
                </span>

                {isEditing && (
                  <Controller
                    control={control}
                    name="legal_age"
                    render={({ field: { onChange, value } }) => (
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={value}
                          onChange={onChange}
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                      </label>
                    )}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <div className="pt-6">
          <button
            onClick={logout}
            className="w-full bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 text-red-400 font-semibold py-4 rounded-xl transition-colors"
          >
            Sign Out
          </button>
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
