'use client';

import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useApi } from '../hooks/useApi';
import useUserStore from '@/zustand/useStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { setCookie } from 'cookies-next';

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
  const { setUser, setToken } = useUserStore();

  const signinGoogle = async (idToken: string) => {
    try {
      const response = await useApi('/users/auth/google', {
        method: 'POST',
        body: JSON.stringify({ id_token: idToken }),
      });
      return response.json();
    } catch (error) {
      // In a real application, you'd want to handle this error more gracefully
      console.error('API call error:', error);
      return null;
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setIsLoading(true);
      if (credentialResponse?.credential) {
        const res = await signinGoogle(credentialResponse.credential);
        if (res && res?.data && res?.access_token) {
          setUser({ data: res?.data });
          setToken(res?.access_token);
          setCookie('access-token', res?.access_token!);
          onSuccess();
        } else {
          console.error('No user data or token in response');
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] p-4 sm:p-6 text-center bg-white">
        {/* Header */}
        <DialogHeader className="space-y-3 sm:space-y-4">
          <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center text-white shadow-lg">
            <Sparkles className="h-6 w-6 sm:h-8 sm:w-8" />
          </div>
          <DialogTitle className="text-2xl sm:text-3xl text-slate-900 text-center font-bold">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </DialogTitle>
          <DialogDescription className="text-center text-slate-600 text-sm sm:text-base">
            {isSignUp
              ? 'Join Nice Buddies to start chatting'
              : 'Sign in to continue your conversations'}
          </DialogDescription>
        </DialogHeader>
        {/* Body */}
        <div className="mt-4 sm:mt-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="mr-2 h-5 w-5 sm:h-6 sm:w-6 animate-spin text-pink-500" />
              <span className="text-sm sm:text-base text-slate-700">
                {isSignUp ? 'Creating account...' : 'Signing in...'}
              </span>
            </div>
          ) : (
            <div className="flex justify-center px-2">
              <div className="w-full max-w-[300px]">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="outline"
                  size="large"
                  text={isSignUp ? 'signup_with' : 'signin_with'}
                  shape="rectangular"
                  width="100%"
                />
              </div>
            </div>
          )}

          {/* Terms */}
          <p className="text-xs text-center text-slate-500 px-2">
            By continuing, you agree to our{' '}
            <a href="#" className="text-pink-500 hover:text-pink-600 hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-pink-500 hover:text-pink-600 hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
        {/* Footer */}
        <div className="text-center pt-3 sm:pt-4 border-t border-slate-200 mt-4">
          {isSignUp ? (
            <p className="text-sm text-slate-600">
              Already have an account?{' '}
              <Button
                variant="link"
                onClick={() => setIsSignUp(false)}
                className="p-0 h-auto text-pink-500 hover:text-pink-600 font-semibold"
              >
                Sign In
              </Button>
            </p>
          ) : (
            <p className="text-sm text-slate-600">
              Don&apos;t have an account?{' '}
              <Button
                variant="link"
                onClick={() => setIsSignUp(true)}
                className="p-0 h-auto text-pink-500 hover:text-pink-600 font-semibold"
              >
                Create Account
              </Button>
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
