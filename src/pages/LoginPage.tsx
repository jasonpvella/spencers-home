import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { auth } from '@/config/firebase';
import { getSsoProvider, initiateSsoSignIn } from '@/services/sso';
import { useAuthStore } from '@/store/authStore';
import type { SsoProvider } from '@/types';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});
type LoginValues = z.infer<typeof loginSchema>;

const resetSchema = z.object({
  email: z.string().email('Invalid email'),
});
type ResetValues = z.infer<typeof resetSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [authError, setAuthError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [stateIdInput, setStateIdInput] = useState('');
  const [ssoProvider, setSsoProvider] = useState<SsoProvider | null>(null);
  const [ssoChecking, setSsoChecking] = useState(false);
  const [ssoError, setSsoError] = useState<string | null>(null);
  const ssoDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Redirect authenticated users (handles post-SSO redirect as well)
  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  function onStateIdChange(value: string) {
    setStateIdInput(value);
    setSsoProvider(null);
    setSsoError(null);
    if (ssoDebounce.current) clearTimeout(ssoDebounce.current);
    if (!value.trim()) return;
    ssoDebounce.current = setTimeout(async () => {
      setSsoChecking(true);
      try {
        const p = await getSsoProvider(value.trim().toLowerCase());
        setSsoProvider(p?.enabled ? p : null);
      } catch {
        // Non-fatal — SSO just won't show
      } finally {
        setSsoChecking(false);
      }
    }, 500);
  }

  async function onSsoSignIn() {
    if (!ssoProvider) return;
    setSsoError(null);
    try {
      await initiateSsoSignIn(ssoProvider);
      // Page will redirect to IdP — execution stops here
    } catch {
      setSsoError('Could not initiate SSO. Check with your administrator.');
    }
  }

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  const resetForm = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
  });

  async function onLogin(values: LoginValues) {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      navigate('/dashboard');
    } catch {
      setAuthError('Invalid email or password.');
    }
  }

  async function onReset(values: ResetValues) {
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, values.email);
      setResetSent(true);
    } catch {
      setAuthError('Could not send reset email. Check the address and try again.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Spencer's Home</h1>
          <p className="text-sm text-gray-500 mt-1">
            {mode === 'login' ? 'Sign in to continue' : 'Reset your password'}
          </p>
        </div>

        {mode === 'login' ? (
          <>
          <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...loginForm.register('email')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {loginForm.formState.errors.email && (
                <p className="text-xs text-red-500 mt-1">{loginForm.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => { setMode('reset'); setAuthError(null); }}
                  className="text-xs text-brand-600 hover:text-brand-800 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                {...loginForm.register('password')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {loginForm.formState.errors.password && (
                <p className="text-xs text-red-500 mt-1">{loginForm.formState.errors.password.message}</p>
              )}
            </div>

            {authError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={loginForm.formState.isSubmitting}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 px-4 rounded-lg text-sm disabled:opacity-50 transition-colors"
            >
              {loginForm.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>

            <p className="text-center text-xs text-gray-500">
              Need access?{' '}
              <Link to="/register" className="text-brand-600 hover:text-brand-800">
                Request an account
              </Link>
            </p>
          </form>

          {/* SSO sign-in */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center mb-3">Or sign in with your agency SSO</p>
            <div>
              <input
                type="text"
                value={stateIdInput}
                onChange={(e) => onStateIdChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="State ID (e.g. ne)"
                autoComplete="off"
              />
            </div>
            {ssoChecking && (
              <p className="text-xs text-gray-400 mt-2 text-center">Checking SSO…</p>
            )}
            {ssoProvider && (
              <button
                type="button"
                onClick={onSsoSignIn}
                className="mt-3 w-full border border-brand-600 text-brand-700 hover:bg-brand-50 font-medium py-2 px-4 rounded-lg text-sm transition-colors"
              >
                Sign in with {ssoProvider.displayName}
              </button>
            )}
            {ssoError && (
              <p className="text-xs text-red-600 mt-2 text-center">{ssoError}</p>
            )}
          </div>
          </>
        ) : (
          <div>
            {resetSent ? (
              <div className="text-center space-y-4">
                <p className="text-sm text-gray-700">
                  Reset link sent. Check your email and follow the instructions.
                </p>
                <button
                  onClick={() => { setMode('login'); setResetSent(false); }}
                  className="text-sm text-brand-600 hover:text-brand-800"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={resetForm.handleSubmit(onReset)} className="space-y-4">
                <div>
                  <label htmlFor="resetEmail" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="resetEmail"
                    type="email"
                    autoComplete="email"
                    {...resetForm.register('email')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  {resetForm.formState.errors.email && (
                    <p className="text-xs text-red-500 mt-1">{resetForm.formState.errors.email.message}</p>
                  )}
                </div>

                {authError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {authError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={resetForm.formState.isSubmitting}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 px-4 rounded-lg text-sm disabled:opacity-50 transition-colors"
                >
                  {resetForm.formState.isSubmitting ? 'Sending…' : 'Send reset link'}
                </button>

                <button
                  type="button"
                  onClick={() => { setMode('login'); setAuthError(null); }}
                  className="w-full text-sm text-gray-500 hover:text-gray-800 py-1"
                >
                  Back to sign in
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
