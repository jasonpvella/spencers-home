import { NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useCurrentUser } from '@/hooks/useAuth';
import type { ReactNode } from 'react';

const ADMIN_ROLES = ['state_admin', 'agency_admin', 'platform_admin'] as const;

interface Props {
  children: ReactNode;
}

export default function AppShell({ children }: Props) {
  const user = useCurrentUser();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut(auth);
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-gray-900 text-sm">Spencer's Home</span>
            <div className="flex items-center gap-1">
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `text-sm px-3 py-1.5 rounded-md transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 font-medium'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `text-sm px-3 py-1.5 rounded-md transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 font-medium'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`
                }
              >
                Gallery
              </NavLink>
              {user && ADMIN_ROLES.includes(user.role as typeof ADMIN_ROLES[number]) && (
                <NavLink
                  to="/admin/users"
                  className={({ isActive }) =>
                    `text-sm px-3 py-1.5 rounded-md transition-colors ${
                      isActive
                        ? 'bg-brand-50 text-brand-700 font-medium'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`
                  }
                >
                  Users
                </NavLink>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <span className="text-xs text-gray-400 hidden sm:block">
                {user.displayName} · {user.role.replace(/_/g, ' ')}
              </span>
            )}
            <button
              onClick={handleSignOut}
              className="text-xs text-gray-500 hover:text-gray-800 transition-colors px-2 py-1 rounded"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main>{children}</main>
    </div>
  );
}
