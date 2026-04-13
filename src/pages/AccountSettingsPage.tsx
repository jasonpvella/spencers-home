import { useState } from 'react';
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { auth, db } from '@/config/firebase';
import { useCurrentUser } from '@/hooks/useAuth';
import { useToast } from '@/components/shared/Toaster';

const nameSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type NameValues = z.infer<typeof nameSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

export default function AccountSettingsPage() {
  const user = useCurrentUser();
  const { toast } = useToast();
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const nameForm = useForm<NameValues>({
    resolver: zodResolver(nameSchema),
    defaultValues: { displayName: user?.displayName ?? '' },
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  async function onSaveName(values: NameValues) {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser || !user?.id) return;
    try {
      await updateProfile(firebaseUser, { displayName: values.displayName });
      await updateDoc(doc(db, 'users', user.id), { displayName: values.displayName });
      toast('Display name updated', 'success');
    } catch {
      toast('Failed to update display name', 'error');
    }
  }

  async function onChangePassword(values: PasswordValues) {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser?.email) return;
    setPasswordError(null);
    try {
      const credential = EmailAuthProvider.credential(firebaseUser.email, values.currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, values.newPassword);
      toast('Password updated', 'success');
      passwordForm.reset();
    } catch (e: unknown) {
      if (e instanceof Error && 'code' in e) {
        const code = (e as { code: string }).code;
        if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
          setPasswordError('Current password is incorrect.');
        } else if (code === 'auth/too-many-requests') {
          setPasswordError('Too many attempts. Please wait and try again.');
        } else {
          setPasswordError('Failed to update password. Please try again.');
        }
      } else {
        setPasswordError('Failed to update password. Please try again.');
      }
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Account Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">{user?.email}</p>
      </div>

      {/* Display name */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-4">Display Name</h2>
        <form onSubmit={nameForm.handleSubmit(onSaveName)} className="space-y-3">
          <div>
            <input
              type="text"
              {...nameForm.register('displayName')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Your full name"
            />
            {nameForm.formState.errors.displayName && (
              <p className="text-xs text-red-500 mt-1">{nameForm.formState.errors.displayName.message}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={nameForm.formState.isSubmitting}
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            {nameForm.formState.isSubmitting ? 'Saving…' : 'Save name'}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-4">Change Password</h2>
        <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Current password</label>
            <input
              type="password"
              autoComplete="current-password"
              {...passwordForm.register('currentPassword')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {passwordForm.formState.errors.currentPassword && (
              <p className="text-xs text-red-500 mt-1">{passwordForm.formState.errors.currentPassword.message}</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">New password</label>
            <input
              type="password"
              autoComplete="new-password"
              {...passwordForm.register('newPassword')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {passwordForm.formState.errors.newPassword && (
              <p className="text-xs text-red-500 mt-1">{passwordForm.formState.errors.newPassword.message}</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Confirm new password</label>
            <input
              type="password"
              autoComplete="new-password"
              {...passwordForm.register('confirmPassword')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {passwordForm.formState.errors.confirmPassword && (
              <p className="text-xs text-red-500 mt-1">{passwordForm.formState.errors.confirmPassword.message}</p>
            )}
          </div>
          {passwordError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {passwordError}
            </p>
          )}
          <button
            type="submit"
            disabled={passwordForm.formState.isSubmitting}
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            {passwordForm.formState.isSubmitting ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
