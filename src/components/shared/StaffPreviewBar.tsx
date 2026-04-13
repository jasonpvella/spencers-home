import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types';

const STAFF_ROLES: UserRole[] = ['caseworker', 'supervisor', 'agency_admin', 'state_admin', 'platform_admin'];

export default function StaffPreviewBar() {
  const { user, loading } = useAuthStore();

  if (loading || !user || !STAFF_ROLES.includes(user.role)) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-10 bg-brand-900 flex items-center justify-between px-4">
      <span className="text-white text-sm">Viewing public site</span>
      <Link to="/dashboard" className="text-white text-sm font-medium underline underline-offset-2 hover:text-white/80">
        Back to Dashboard
      </Link>
    </div>
  );
}
