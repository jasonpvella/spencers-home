import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { auth, db } from '@/config/firebase';
import { DEFAULT_STATE_ID } from '@/config/constants';

const schema = z.object({
  displayName: z.string().min(2, 'Full name required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  stateId: z.string().min(2, 'State ID required'),
});
type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { stateId: DEFAULT_STATE_ID },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, values.email, values.password);
      // Create user Firestore doc — active: false until approved by state_admin
      await setDoc(doc(db, 'users', cred.user.uid), {
        email: values.email,
        displayName: values.displayName,
        role: 'caseworker',
        stateId: values.stateId.toUpperCase(),
        active: false,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });
      setDone(true);
    } catch (e: unknown) {
      if (e instanceof Error && 'code' in e) {
        const code = (e as { code: string }).code;
        if (code === 'auth/email-already-in-use') {
          setError('An account with this email already exists.');
        } else if (code === 'auth/weak-password') {
          setError('Password is too weak. Use at least 8 characters.');
        } else {
          setError('Something went wrong. Please try again.');
        }
      } else {
        setError('Something went wrong. Please try again.');
      }
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center space-y-4">
          <div className="text-4xl">✓</div>
          <h2 className="text-lg font-semibold text-gray-900">Request received</h2>
          <p className="text-sm text-gray-600">
            Your account has been created and is pending approval by your state administrator.
            You'll be able to sign in once it's activated.
          </p>
          <Link
            to="/login"
            className="block text-sm text-brand-600 hover:text-brand-800 transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Request access</h1>
          <p className="text-sm text-gray-500 mt-1">
            Your account will be activated by your state administrator.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
              Full name
            </label>
            <input
              id="displayName"
              type="text"
              autoComplete="name"
              {...register('displayName')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {errors.displayName && <p className="text-xs text-red-500 mt-1">{errors.displayName.message}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Work email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label htmlFor="stateId" className="block text-sm font-medium text-gray-700 mb-1">
              State ID
            </label>
            <input
              id="stateId"
              type="text"
              maxLength={2}
              {...register('stateId')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase"
              placeholder="NE"
            />
            {errors.stateId && <p className="text-xs text-red-500 mt-1">{errors.stateId.message}</p>}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 px-4 rounded-lg text-sm disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Creating account…' : 'Request access'}
          </button>

          <p className="text-center text-xs text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 hover:text-brand-800">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
