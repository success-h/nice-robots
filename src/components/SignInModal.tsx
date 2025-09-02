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
      <DialogContent className="sm:max-w-[425px] p-6 text-center bg-gray-900">
        {/* Header */}
        <DialogHeader className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-pink-500 rounded-full flex items-center justify-center text-white">
            <Sparkles className="h-8 w-8" />
          </div>
          <DialogTitle className="text-3xl text-pink-500 text-center">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isSignUp
              ? 'Join Teens Robots to start chatting'
              : 'Sign in to continue your conversations'}
          </DialogDescription>
        </DialogHeader>
        {/* Body */}
        <div className="mt-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="mr-2 h-6 w-6 animate-spin text-pink-500" />
              <span>{isSignUp ? 'Creating account...' : 'Signing in...'}</span>
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
            <a href="#" className="text-pink-400 hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-pink-400 hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
        {/* Footer */}
        <div className="text-center pt-4 border-t mt-4">
          {isSignUp ? (
            <p className="text-sm text-gray-400">
              Already have an account?{' '}
              <Button
                variant="link"
                onClick={() => setIsSignUp(false)}
                className="p-0 h-auto text-pink-400 hover:text-pink-300"
              >
                Sign In
              </Button>
            </p>
          ) : (
            <p className="text-sm text-gray-400">
              Don&apos;t have an account?{' '}
              <Button
                variant="link"
                onClick={() => setIsSignUp(true)}
                className="p-0 h-auto text-pink-400 hover:text-pink-300"
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
