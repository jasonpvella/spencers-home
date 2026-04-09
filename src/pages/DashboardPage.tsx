import { Link } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useAuth';
import { useAllChildren } from '@/hooks/useChildren';
import { useExpiringConsents } from '@/hooks/useConsent';

export default function DashboardPage() {
  const user = useCurrentUser();
  const stateId = user?.stateId ?? '';
  const { children, loading } = useAllChildren(stateId);
  const { consents: expiringConsents } = useExpiringConsents(stateId, 30);

  const counts = {
    draft: children.filter((c) => c.status === 'draft').length,
    pending_review: children.filter((c) => c.status === 'pending_review').length,
    published: children.filter((c) => c.status === 'published').length,
    total: children.length,
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">{user?.stateId} — {user?.displayName}</p>
        </div>
        <Link
          to="/profile/new"
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          New Profile
        </Link>
      </div>

      {/* Expiring consent alerts */}
      {expiringConsents.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-6">
          <p className="text-sm font-medium text-yellow-800 mb-1">
            {expiringConsents.length} consent{expiringConsents.length > 1 ? 's' : ''} expiring within 30 days
          </p>
          <ul className="space-y-0.5">
            {expiringConsents.map((c) => {
              const expiresAt = (c.expiresAt as unknown as { toDate: () => Date }).toDate();
              const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const matchingChild = children.find((ch) => ch.id === c.childId);
              return (
                <li key={c.id} className="text-xs text-yellow-700">
                  <Link to={`/profile/${c.childId}`} className="underline hover:text-yellow-900">
                    {matchingChild?.firstName ?? c.childId}
                  </Link>{' '}
                  — expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total', value: counts.total },
          { label: 'Published', value: counts.published },
          { label: 'Pending Review', value: counts.pending_review },
          { label: 'Drafts', value: counts.draft },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-2xl font-semibold text-gray-900">{loading ? '—' : stat.value}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Children list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-700">All Profiles</h2>
        </div>
        {loading ? (
          <p className="text-sm text-gray-400 px-4 py-8 text-center">Loading…</p>
        ) : children.length === 0 ? (
          <p className="text-sm text-gray-400 px-4 py-8 text-center">No profiles yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {children.map((child) => (
              <li key={child.id}>
                <Link
                  to={`/profile/${child.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{child.firstName}</p>
                    <p className="text-xs text-gray-400">Age {child.ageAtListing}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(child.status)}`}>
                    {child.status.replace(/_/g, ' ')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function statusColor(status: string) {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    pending_review: 'bg-yellow-100 text-yellow-700',
    consent_obtained: 'bg-blue-100 text-blue-700',
    published: 'bg-green-100 text-green-700',
    match_in_progress: 'bg-purple-100 text-purple-700',
    placed: 'bg-teal-100 text-teal-700',
    archived: 'bg-gray-100 text-gray-400',
  };
  return map[status] ?? 'bg-gray-100 text-gray-600';
}
