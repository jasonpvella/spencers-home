import { signOut } from 'firebase/auth';
import { Navigate } from 'react-router-dom';
import { auth } from '@/config/firebase';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types';

interface Props {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function RequireAuth({ children, allowedRoles }: Props) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-sm text-gray-400">Loading…</span>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Account created but pending activation by state admin
  if (!user.active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Account pending approval</h2>
          <p className="text-sm text-gray-600">
            Your account has been created but is waiting for activation by your state
            administrator. You'll receive access once it's approved.
          </p>
          <p className="text-xs text-gray-400">Signed in as {user.email}</p>
          <button
            onClick={() => signOut(auth)}
            className="text-sm text-brand-600 hover:text-brand-800 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
