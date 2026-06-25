'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authAPI } from '@/lib/api/auth';
import { removeToken, setToken } from '@/lib/auth';
import { verifyAdminAccess } from '@/lib/api/admin';
import { Shield, Loader2, AlertCircle } from 'lucide-react';

type GoogleCodeExchange = {
  key: string;
  promise: ReturnType<typeof authAPI.googleCodeSignIn>;
};

let googleCodeExchange: GoogleCodeExchange | null = null;

async function clearAdminSession() {
  try {
    await authAPI.logout();
  } catch {
    // Best effort: the backend may already have rejected or cleared the session.
  }
  removeToken();
}

function getAuthErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.error || error?.message || fallback;
}

function exchangeGoogleCodeOnce(data: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  state: string;
}) {
  const key = `${data.state}:${data.code}`;
  if (googleCodeExchange?.key !== key) {
    googleCodeExchange = {
      key,
      promise: authAPI.googleCodeSignIn({
        code: data.code,
        codeVerifier: data.codeVerifier,
        redirectUri: data.redirectUri,
      }),
    };
  }
  return googleCodeExchange.promise;
}

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('Completing sign-in...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get authorization code and state from URL
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const errorParam = searchParams.get('error');

        // Check for OAuth errors
        if (errorParam) {
          setError(`Google OAuth error: ${errorParam}`);
          setIsLoading(false);
          setTimeout(() => router.replace('/login'), 3000);
          return;
        }

        // Validate state (CSRF protection)
        const storedState = sessionStorage.getItem('oauth_state');
        if (!state || state !== storedState) {
          setError('Invalid state parameter. Please try again.');
          setIsLoading(false);
          sessionStorage.removeItem('oauth_state');
          sessionStorage.removeItem('oauth_code_verifier');
          setTimeout(() => router.replace('/login'), 3000);
          return;
        }

        if (!code) {
          setError('Authorization code not found. Please try again.');
          setIsLoading(false);
          sessionStorage.removeItem('oauth_state');
          sessionStorage.removeItem('oauth_code_verifier');
          setTimeout(() => router.replace('/login'), 3000);
          return;
        }

        setStatus('Exchanging authorization code...');

        // Exchange the authorization code through the backend so Google secrets stay server-side.
        const redirectUri = `${window.location.origin}/auth/google/callback`;
        const codeVerifier = sessionStorage.getItem('oauth_code_verifier');
        
        if (!codeVerifier) {
          throw new Error('Code verifier not found. Please try signing in again.');
        }

        setStatus('Authenticating with server...');

        const authResponse = await exchangeGoogleCodeOnce({
          code,
          codeVerifier,
          redirectUri,
          state,
        });

        setToken(authResponse.csrfToken);

        setStatus('Verifying admin access...');

        // Verify admin access
        try {
          const adminResponse = await verifyAdminAccess();
          
          if (!adminResponse.isAdmin) {
            await clearAdminSession();
            setError('Access denied. You are not an admin.');
            setIsLoading(false);
            sessionStorage.removeItem('oauth_state');
            sessionStorage.removeItem('oauth_code_verifier');
            setTimeout(() => router.replace('/login'), 3000);
            return;
          }

          if (adminResponse.requiresTwoFactor) {
            sessionStorage.removeItem('oauth_state');
            sessionStorage.removeItem('oauth_code_verifier');
            router.replace('/login?step=2fa');
            return;
          }

          // Clean up
          sessionStorage.removeItem('oauth_state');
          sessionStorage.removeItem('oauth_code_verifier');

          router.replace('/dashboard');
        } catch (adminErr: any) {
          await clearAdminSession();
          setError(getAuthErrorMessage(adminErr, 'Failed to verify admin access'));
          setIsLoading(false);
          setTimeout(() => router.replace('/login'), 3000);
        }
      } catch (err: any) {
        const message = getAuthErrorMessage(err, 'Authentication failed');
        console.warn('Google OAuth callback error:', message);
        removeToken();
        setError(message);
        setIsLoading(false);
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_code_verifier');
        setTimeout(() => router.replace('/login'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full border border-white/20">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mb-6">
            <Shield className="w-8 h-8 text-blue-400" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-4">
            {error ? 'Authentication Failed' : 'Signing In...'}
          </h2>
          
          {isLoading && (
            <div className="space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto" />
              <p className="text-gray-300">{status}</p>
            </div>
          )}
          
          {error && (
            <div className="space-y-4">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
              <p className="text-red-300">{error}</p>
              <p className="text-gray-400 text-sm">Redirecting to login...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    }>
      <GoogleCallbackContent />
    </Suspense>
  );
}
