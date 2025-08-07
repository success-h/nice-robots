'use client';

import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { X } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import useUserStore, { User } from '@/zustand/useStore';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SignInModal({
  isOpen,
  onClose,
  onSuccess,
}: SignInModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { setUser } = useUserStore();

  const signinGoogle = async (idToken: string) => {
    console.log('first');
    try {
      const response = await useApi('/users/auth/google', {
        method: 'POST',
        body: JSON.stringify({ id_token: idToken }),
      });
      return response.json();
    } catch (error) {
      return error;
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setIsLoading(true);
      console.log({ credentialResponse });
      if (credentialResponse?.credential) {
        const res: User = await signinGoogle(credentialResponse.credential);
        if (res) {
          console.log({ res });
          setUser(res);
          onSuccess();
        } else {
          console.error('No user data in response');
        }
      }
    } catch (error: any) {
      console.error('Authentication error:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    console.log('Google authentication was unsuccessful');
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto bg-pink-500 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold">TR</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-gray-400">
            {isSignUp
              ? 'Join Teens Robots to start chatting'
              : 'Sign in to continue your conversations'}
          </p>
        </div>

        {/* Google Sign-in */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-4 px-6 rounded-xl bg-gray-700 w-full">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-pink-500 mr-3"></div>
              <span className="text-gray-300">
                {isSignUp ? 'Creating account...' : 'Signing in...'}
              </span>
            </div>
          ) : (
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="filled_black"
                size="large"
                text={isSignUp ? 'signup_with' : 'signin_with'}
                shape="rectangular"
                width="300"
              />
            </div>
          )}

          {/* Terms */}
          <p className="text-xs text-center text-gray-500">
            By continuing, you agree to our{' '}
            <a href="#" className="text-pink-400 hover:text-pink-300">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-pink-400 hover:text-pink-300">
              Privacy Policy
            </a>
          </p>

          {/* Toggle between sign in/up */}
          <div className="text-center pt-4 border-t border-gray-700">
            {isSignUp ? (
              <p className="text-gray-400">
                Already have an account?{' '}
                <button
                  onClick={() => setIsSignUp(false)}
                  className="text-pink-400 hover:text-pink-300 font-semibold"
                >
                  Sign In
                </button>
              </p>
            ) : (
              <p className="text-gray-400">
                Don&apos;t have an account?{' '}
                <button
                  onClick={() => setIsSignUp(true)}
                  className="text-pink-400 hover:text-pink-300 font-semibold"
                >
                  Create Account
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
