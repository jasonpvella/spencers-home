import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useAuth';
import { useAllChildren } from '@/hooks/useChildren';
import { useExpiringConsents } from '@/hooks/useConsent';
import { getStateConfig } from '@/services/stateConfig';
import { listUsersByState } from '@/services/users';
import { reassignChild } from '@/services/children';
import { useToast } from '@/components/shared/Toaster';
import type { ChildProfile, User } from '@/types';

// AFCARS sex codes: 1=Male, 2=Female, 99=Unknown/Other
function afcarsSex(gender: ChildProfile['gender']): string {
  if (gender === 'male') return '1';
  if (gender === 'female') return '2';
  return '99';
}

// AFCARS ICWA eligibility codes: 1=Yes, 2=No, 99=Unknown
function afcarsIcwa(flag: boolean): string {
  return flag ? '1' : '2';
}

function exportAFCARS(children: ChildProfile[], stateId: string) {
  const now = new Date();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const yr = String(now.getFullYear());

  const active = children.filter((c) => c.status !== 'archived');

  // AFCARS adoption file field names (federal 45 CFR Part 1355).
  // Fields we cannot populate are exported blank — states must complete
  // DOB, race/ethnicity, placement dates, and legal basis before submission.
  const header = [
    'RPTFIPS',    // State identifier (stateId — map to FIPS before submission)
    'AFCARSID',   // Unique child record ID
    'REPDATMO',   // Reporting period month
    'REPDATYR',   // Reporting period year
    'SEX',        // 1=Male 2=Female 99=Unknown
    'ICWAELIG',   // 1=Yes 2=No 99=Unknown
    'AGE',        // Age at listing
    'STATUS',     // Platform status (non-AFCARS — for state reference)
    'CONSENT',    // Consent status (non-AFCARS — for state reference)
    'LISTED_DATE',// Published date if available (non-AFCARS — for state reference)
    'VIEWS',      // View count (non-AFCARS)
    'INQUIRIES',  // Inquiry count (non-AFCARS)
    // ── Fields states must complete before AFCARS submission ──
    'DOB',        // Date of birth (not collected — complete before submission)
    'FCID',       // Local agency ID (not collected — complete before submission)
    'TERMDT',     // TPR date (not collected — complete before submission)
    'AMIAKN',     // American Indian/Alaska Native (not collected)
    'ASIAN',      // Asian (not collected)
    'BLKAFRAM',   // Black/African American (not collected)
    'HAWAIIPI',   // Hawaiian/Pacific Islander (not collected)
    'WHITE',      // White (not collected)
    'HISORGIN',   // Hispanic origin (not collected)
  ];

  const rows = active.map((c) => {
    const publishedAt = c.publishedAt
      ? (c.publishedAt as unknown as { toDate: () => Date }).toDate().toISOString().slice(0, 10)
      : '';
    return [
      stateId,
      c.id,
      mo,
      yr,
      afcarsSex(c.gender),
      afcarsIcwa(c.icwaFlag),
      String(c.ageAtListing),
      c.status,
      c.consentStatus,
      publishedAt,
      String(c.viewCount ?? 0),
      String(c.inquiryCount ?? 0),
      '', '', '', '', '', '', '', '', '', // unmapped fields
    ];
  });

  const csv = [header, ...rows]
    .map((r) => r.map((v) => `"${v}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `afcars-export-${stateId}-${now.toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportAdoptUSKidsCSV(children: ChildProfile[]) {
  const published = children.filter((c) => c.status === 'published');
  const header = ['first_name', 'age', 'gender', 'interests', 'bio'];
  const rows = published.map((c) => [
    c.firstName,
    String(c.ageAtListing),
    c.gender === 'undisclosed' ? '' : c.gender,
    c.interests.join('; '),
    (c.bio ?? '').replace(/"/g, '""'),
  ]);
  const csv = [header, ...rows]
    .map((r) => r.map((v) => `"${v}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `adoptusskids-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const SUPERVISOR_ROLES = ['supervisor', 'agency_admin', 'state_admin', 'platform_admin'] as const;
type SupervisorRole = typeof SUPERVISOR_ROLES[number];

function isSupervisorRole(role: string | undefined): role is SupervisorRole {
  return SUPERVISOR_ROLES.includes(role as SupervisorRole);
}

export default function DashboardPage() {
  const user = useCurrentUser();
  const stateId = user?.stateId ?? '';
  const userId = user?.id ?? '';
  const { toast } = useToast();

  // Load state config to determine caseworker visibility mode.
  // Defaults to 'own' (most restrictive) until config resolves.
  const [visibilityMode, setVisibilityMode] = useState<'own' | 'pool'>('own');
  useEffect(() => {
    if (!stateId) return;
    getStateConfig(stateId)
      .then((config) => setVisibilityMode(config?.caseworkerProfileVisibility ?? 'own'))
      .catch(() => {}); // non-critical — safe default is 'own'
  }, [stateId]);

  // Caseworkers in 'own' mode only see their own profiles.
  // Supervisor+ see everything regardless of mode.
  const isCaseworker = user?.role === 'caseworker';
  const ownedByUid = isCaseworker && visibilityMode === 'own' ? userId : undefined;

  const { children, loading } = useAllChildren(stateId, ownedByUid);
  const { consents: expiringConsents } = useExpiringConsents(stateId, 30);
  const [search, setSearch] = useState('');

  // Caseworker list for the reassignment dropdown — only loaded for supervisors/admins.
  const canReassign = isSupervisorRole(user?.role);
  const [caseworkers, setCaseworkers] = useState<User[]>([]);
  useEffect(() => {
    if (!stateId || !canReassign) return;
    listUsersByState(stateId)
      .then((users) => setCaseworkers(users.filter((u) => u.role === 'caseworker' && u.active)))
      .catch(() => {}); // non-critical
  }, [stateId, canReassign]);

  async function handleReassign(childId: string, newOwnerId: string) {
    if (!stateId || !userId) return;
    try {
      await reassignChild(stateId, childId, newOwnerId, userId);
      toast('Profile reassigned', 'success');
    } catch {
      toast('Failed to reassign profile', 'error');
    }
  }

  const counts = {
    draft: children.filter((c) => c.status === 'draft').length,
    pending_review: children.filter((c) => c.status === 'pending_review').length,
    published: children.filter((c) => c.status === 'published').length,
    inquiries: children.reduce((sum, c) => sum + (c.inquiryCount ?? 0), 0),
    total: children.length,
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return children;
    return children.filter(
      (c) => c.firstName.toLowerCase().includes(q) || c.status.includes(q)
    );
  }, [children, search]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">{user?.stateId} — {user?.displayName}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {user?.role === 'platform_admin' && (
            <Link
              to="/admin/sponsors"
              className="text-sm text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-400 px-3 py-2 rounded-lg transition-colors"
            >
              Sponsors
            </Link>
          )}
          {(user?.role === 'state_admin' || user?.role === 'platform_admin') && (
            <>
              <button
                type="button"
                disabled={loading || children.filter((c) => c.status !== 'archived').length === 0}
                onClick={() => exportAFCARS(children, stateId)}
                className="text-sm text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-400 px-3 py-2 rounded-lg transition-colors disabled:opacity-40"
                title="Export AFCARS-ready CSV (partial — complete DOB, race, and legal fields before federal submission)"
              >
                <span className="hidden sm:inline">Export </span>AFCARS CSV
              </button>
              <button
                type="button"
                disabled={loading || counts.published === 0}
                onClick={() => exportAdoptUSKidsCSV(children)}
                className="text-sm text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-400 px-3 py-2 rounded-lg transition-colors disabled:opacity-40"
                title={counts.published === 0 ? 'No published profiles to export' : undefined}
              >
                <span className="hidden sm:inline">Export </span>AdoptUSKids CSV
              </button>
            </>
          )}
          <Link
            to="/profile/new"
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            New Profile
          </Link>
        </div>
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
          { label: 'New Inquiries', value: counts.inquiries },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-2xl font-semibold text-gray-900">{loading ? '—' : stat.value}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Children list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
          <h2 className="text-sm font-medium text-gray-700 flex-shrink-0">All Profiles</h2>
          <input
            type="search"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-auto w-full max-w-[180px] border border-gray-300 rounded-lg px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        {loading ? (
          <p className="text-sm text-gray-400 px-4 py-8 text-center">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-400 px-4 py-8 text-center">
            {search ? 'No matches.' : 'No profiles yet.'}
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filtered.map((child) => (
              <li key={child.id} className="flex items-center hover:bg-gray-50 transition-colors">
                <Link
                  to={`/profile/${child.id}`}
                  className="flex flex-1 items-center justify-between px-4 py-3 min-w-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{child.firstName}</p>
                    <p className="text-xs text-gray-400">
                      Age {child.ageAtListing}
                      {child.inquiryCount > 0 && (
                        <span className="ml-2 text-brand-600 font-medium">
                          {child.inquiryCount} inquiry{child.inquiryCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className={`ml-3 flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(child.status)}`}>
                    {child.status.replace(/_/g, ' ')}
                  </span>
                </Link>
                {canReassign && caseworkers.length > 0 && (
                  <div className="px-3 flex-shrink-0">
                    <select
                      value={child.ownedBy}
                      onChange={(e) => handleReassign(child.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      title="Assigned caseworker"
                    >
                      {caseworkers.map((cw) => (
                        <option key={cw.id} value={cw.id}>{cw.displayName}</option>
                      ))}
                    </select>
                  </div>
                )}
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
