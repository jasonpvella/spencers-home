import { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import { useCurrentUser } from '@/hooks/useAuth';
import { listUsersByState, setUserActive, setUserRole } from '@/services/users';
import { useToast } from '@/components/shared/Toaster';
import type { User, UserRole } from '@/types';

const INVITABLE_ROLES: UserRole[] = ['caseworker', 'supervisor', 'state_admin'];

interface InviteFormState {
  displayName: string;
  email: string;
  role: UserRole;
}

function InviteModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState<InviteFormState>({ displayName: '', email: '', role: 'caseworker' });
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.displayName.trim() || !form.email.trim()) return;
    setSending(true);
    try {
      const inviteUser = httpsCallable(functions, 'inviteUser');
      await inviteUser(form);
      toast(`Invitation sent to ${form.email}`, 'success');
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send invitation';
      toast(msg, 'error');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Invite a user</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Full name</label>
            <input
              type="text"
              required
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Jane Smith"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email address</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="jane@agency.gov"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {INVITABLE_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="text-sm px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50 transition-colors"
            >
              {sending ? 'Sending…' : 'Send invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
  const [showInvite, setShowInvite] = useState(false);

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
      if (!user.active) {
        toast(`${user.displayName} approved — remember to notify them by email`, 'success');
      } else {
        toast(`${user.displayName} deactivated`, 'info');
      }
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
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onSuccess={() => { setShowInvite(false); loadUsers(); }}
        />
      )}

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            State: {stateId} · {users.length} user{users.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="text-sm px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition-colors flex-shrink-0"
        >
          Invite user
        </button>
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
              <li key={user.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{user.displayName}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                  <p className="text-xs text-yellow-700 mt-0.5">Requested: {ROLE_LABELS[user.role]}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {user.role === 'platform_admin' ? (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">
                      Platform Admin
                    </span>
                  ) : (
                    <select
                      value={user.role}
                      onChange={(e) => changeRole(user, e.target.value as UserRole)}
                      disabled={updating === user.id}
                      className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                      className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
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
              <li key={user.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {user.displayName}
                    {user.id === currentUserId && (
                      <span className="ml-1.5 text-xs text-gray-400">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {user.role === 'platform_admin' ? (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">
                      Platform Admin
                    </span>
                  ) : (
                    <select
                      value={user.role}
                      onChange={(e) => changeRole(user, e.target.value as UserRole)}
                      disabled={updating === user.id || user.id === currentUserId}
                      className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
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
