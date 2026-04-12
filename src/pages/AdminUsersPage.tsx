import { useState, useEffect, useCallback } from 'react';
import { useCurrentUser } from '@/hooks/useAuth';
import { listUsersByState, setUserActive, setUserRole } from '@/services/users';
import { useToast } from '@/components/shared/Toaster';
import type { User, UserRole } from '@/types';

const ROLE_LABELS: Record<UserRole, string> = {
  caseworker: 'Caseworker',
  supervisor: 'Supervisor',
  agency_admin: 'Agency Admin',
  state_admin: 'State Admin',
  platform_admin: 'Platform Admin',
};

const ASSIGNABLE_ROLES: UserRole[] = ['caseworker', 'supervisor', 'agency_admin', 'state_admin'];

export default function AdminUsersPage() {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const stateId = currentUser?.stateId ?? '';
  const currentUserId = currentUser?.id ?? '';

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const loadUsers = useCallback(() => {
    if (!stateId) return;
    setLoading(true);
    listUsersByState(stateId)
      .then(setUsers)
      .catch(() => toast('Failed to load users', 'error'))
      .finally(() => setLoading(false));
  }, [stateId, toast]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  async function toggleActive(user: User) {
    if (user.id === currentUserId) {
      toast('You cannot deactivate your own account', 'error');
      return;
    }
    setUpdating(user.id);
    try {
      await setUserActive(user.id, !user.active, currentUserId, stateId);
      toast(`${user.displayName} ${!user.active ? 'activated' : 'deactivated'}`, 'success');
      loadUsers();
    } catch {
      toast('Failed to update user', 'error');
    } finally {
      setUpdating(null);
    }
  }

  async function changeRole(user: User, role: UserRole) {
    if (user.id === currentUserId) {
      toast('You cannot change your own role', 'error');
      return;
    }
    setUpdating(user.id);
    try {
      await setUserRole(user.id, role, currentUserId, stateId);
      toast(`${user.displayName} → ${ROLE_LABELS[role]}`, 'success');
      loadUsers();
    } catch {
      toast('Failed to update role', 'error');
    } finally {
      setUpdating(null);
    }
  }

  const pending = users.filter((u) => !u.active);
  const active = users.filter((u) => u.active);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">User Management</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          State: {stateId} · {users.length} user{users.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Pending approvals */}
      {pending.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl mb-6 overflow-hidden">
          <div className="px-4 py-3 border-b border-yellow-100">
            <p className="text-sm font-medium text-yellow-800">
              {pending.length} pending approval{pending.length > 1 ? 's' : ''}
            </p>
          </div>
          <ul className="divide-y divide-yellow-100">
            {pending.map((user) => (
              <li key={user.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{user.displayName}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {user.role === 'platform_admin' ? (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">
                      Platform Admin
                    </span>
                  ) : (
                    <select
                      value={user.role}
                      onChange={(e) => changeRole(user, e.target.value as UserRole)}
                      disabled={updating === user.id}
                      className="text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      {ASSIGNABLE_ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  )}
                  {user.role !== 'platform_admin' && (
                    <button
                      onClick={() => toggleActive(user)}
                      disabled={updating === user.id}
                      className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg disabled:opacity-50 transition-colors"
                    >
                      {updating === user.id ? '…' : 'Approve'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Active users */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-700">Active users ({active.length})</p>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 px-4 py-8 text-center">Loading…</p>
        ) : active.length === 0 ? (
          <p className="text-sm text-gray-400 px-4 py-8 text-center">No active users yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {active.map((user) => (
              <li key={user.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {user.displayName}
                    {user.id === currentUserId && (
                      <span className="ml-1.5 text-xs text-gray-400">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {user.role === 'platform_admin' ? (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">
                      Platform Admin
                    </span>
                  ) : (
                    <select
                      value={user.role}
                      onChange={(e) => changeRole(user, e.target.value as UserRole)}
                      disabled={updating === user.id || user.id === currentUserId}
                      className="text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                    >
                      {ASSIGNABLE_ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  )}
                  {user.id !== currentUserId && user.role !== 'platform_admin' && (
                    <button
                      onClick={() => toggleActive(user)}
                      disabled={updating === user.id}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors px-2"
                    >
                      {updating === user.id ? '…' : 'Deactivate'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
