import { Link, useParams } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useAuth';
import { useChild, useChildActions } from '@/hooks/useChildren';
import MediaUpload from '@/components/profile/MediaUpload';
import { useToast } from '@/components/shared/Toaster';
import { EDITABLE_STATUSES } from '@/config/constants';
import { getConsent } from '@/services/consent';
import { useState, useEffect } from 'react';
import type { ProfileStatus, ConsentRecord } from '@/types';

const STATUS_LABEL: Record<ProfileStatus, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  consent_obtained: 'Consent Obtained',
  published: 'Published',
  match_in_progress: 'Match in Progress',
  placed: 'Placed',
  archived: 'Archived',
};

const STATUS_COLOR: Record<ProfileStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending_review: 'bg-yellow-100 text-yellow-700',
  consent_obtained: 'bg-blue-100 text-blue-700',
  published: 'bg-green-100 text-green-700',
  match_in_progress: 'bg-purple-100 text-purple-700',
  placed: 'bg-teal-100 text-teal-700',
  archived: 'bg-gray-100 text-gray-400',
};

const CONSENT_COLOR: Record<string, string> = {
  not_obtained: 'bg-gray-100 text-gray-500',
  pending: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  expired: 'bg-red-100 text-red-600',
};

export default function ProfileDetailPage() {
  const { id: childId } = useParams<{ id: string }>();
  const user = useCurrentUser();
  const stateId = user?.stateId ?? '';
  const userId = user?.id ?? '';

  const { child, loading, error, reload } = useChild(stateId, childId ?? '');
  const { publish, update, saving } = useChildActions(stateId, userId);
  const { toast } = useToast();
  const [consentRecord, setConsentRecord] = useState<ConsentRecord | null>(null);

  useEffect(() => {
    if (child?.consentId && stateId) {
      getConsent(stateId, child.consentId)
        .then(setConsentRecord)
        .catch(() => undefined);
    } else {
      setConsentRecord(null);
    }
  }, [child?.consentId, stateId]);

  async function handlePublish() {
    if (!childId) return;
    try {
      await publish(childId);
      toast(`${child?.firstName ?? 'Profile'} is now published`, 'success');
      reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Publish failed', 'error');
    }
  }

  async function handleSubmitForReview() {
    if (!childId || !child) return;
    try {
      await update(childId, { status: 'pending_review' });
      toast('Submitted for review', 'success');
      reload();
    } catch {
      toast('Failed to submit for review', 'error');
    }
  }

  async function handleArchive() {
    if (!childId || !child) return;
    if (!window.confirm(`Archive ${child.firstName}'s profile? This removes it from all queues but does not delete any data.`)) return;
    try {
      await update(childId, { status: 'archived' });
      toast(`${child.firstName}'s profile archived`, 'info');
      reload();
    } catch {
      toast('Failed to archive profile', 'error');
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-sm text-gray-400 text-center">
        Loading…
      </div>
    );
  }

  if (error || !child) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-sm text-red-500 text-center">
        {error ?? 'Profile not found.'}
      </div>
    );
  }

  const canEdit = (EDITABLE_STATUSES as readonly string[]).includes(child.status);
  const canPublish = child.consentStatus === 'active' && child.status !== 'published';
  const canAddConsent = child.consentStatus !== 'active' && child.status !== 'published' && child.status !== 'archived';
  const canSubmitForReview = child.status === 'draft';
  const canArchive = child.status !== 'archived';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">
              Dashboard
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-700">{child.firstName}</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">{child.firstName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {child.ageAtListing} years old · {child.gender !== 'undisclosed' ? child.gender : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {canEdit && (
            <Link
              to={`/profile/${childId}/edit`}
              className="text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              Edit
            </Link>
          )}
          {canSubmitForReview && (
            <button
              onClick={handleSubmitForReview}
              disabled={saving}
              className="text-sm border border-brand-300 text-brand-700 hover:bg-brand-50 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
            >
              Submit for review
            </button>
          )}
          {canAddConsent && (
            <Link
              to={`/profile/${childId}/consent`}
              className="text-sm border border-blue-300 text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              Add consent
            </Link>
          )}
          {canPublish && (
            <button
              onClick={handlePublish}
              disabled={saving}
              className="text-sm bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
            >
              {saving ? 'Publishing…' : 'Publish'}
            </button>
          )}
        </div>
      </div>

      {/* Status badges */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[child.status]}`}>
          {STATUS_LABEL[child.status]}
        </span>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${CONSENT_COLOR[child.consentStatus]}`}>
          Consent: {child.consentStatus.replace(/_/g, ' ')}
        </span>
        {child.icwaFlag && (
          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-orange-100 text-orange-700">
            ICWA
          </span>
        )}
      </div>

      {/* Publish gate warning */}
      {child.consentStatus !== 'active' && child.status !== 'published' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-6 text-sm text-yellow-800">
          Active consent required before publishing.{' '}
          {canAddConsent && (
            <Link to={`/profile/${childId}/consent`} className="underline font-medium">
              Add consent now
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left col — profile info */}
        <div className="space-y-4">
          {/* Bio */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Bio</p>
            {child.bio ? (
              <p className="text-sm text-gray-700 leading-relaxed">{child.bio}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">No bio added yet.</p>
            )}
          </div>

          {/* Interests */}
          {child.interests.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Interests</p>
              <div className="flex flex-wrap gap-1.5">
                {child.interests.map((interest) => (
                  <span
                    key={interest}
                    className="text-xs bg-brand-50 text-brand-700 border border-brand-100 px-2 py-0.5 rounded-full"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ICWA notes */}
          {child.icwaFlag && child.icwaNotes && (
            <div className="bg-orange-50 rounded-xl border border-orange-100 p-5">
              <p className="text-xs font-medium text-orange-700 uppercase tracking-wide mb-2">ICWA Notes</p>
              <p className="text-sm text-orange-900 leading-relaxed">{child.icwaNotes}</p>
            </div>
          )}

          {/* Consent record */}
          {consentRecord && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Consent</p>
              <dl className="space-y-1.5 text-xs text-gray-500">
                <div className="flex justify-between">
                  <dt>Signed by</dt>
                  <dd className="text-gray-700">
                    {(consentRecord.formData?.signerName as string) ?? '—'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Authority</dt>
                  <dd className="text-gray-700 capitalize">{consentRecord.signerRole}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Signed</dt>
                  <dd>
                    {(consentRecord.signedAt as unknown as { toDate: () => Date }).toDate().toLocaleDateString()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Expires</dt>
                  <dd>
                    {(consentRecord.expiresAt as unknown as { toDate: () => Date }).toDate().toLocaleDateString()}
                  </dd>
                </div>
                {consentRecord.youthAssentObtained && (
                  <div className="flex justify-between">
                    <dt>Youth assent</dt>
                    <dd className="text-green-600">Obtained</dd>
                  </div>
                )}
                {consentRecord.icwaTribalNotified && (
                  <div className="flex justify-between">
                    <dt>ICWA tribal notif.</dt>
                    <dd className="text-green-600">Completed</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Record</p>
            <dl className="space-y-1.5 text-xs text-gray-500 mb-4">
              <div className="flex justify-between">
                <dt>Profile ID</dt>
                <dd className="font-mono text-gray-400">{child.id.slice(0, 12)}…</dd>
              </div>
              <div className="flex justify-between">
                <dt>Created by</dt>
                <dd>{child.createdBy}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Views</dt>
                <dd>{child.viewCount}</dd>
              </div>
            </dl>
            {canArchive && (
              <button
                onClick={handleArchive}
                disabled={saving}
                className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
              >
                Archive profile
              </button>
            )}
          </div>
        </div>

        {/* Right col — media */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Media</p>
          <MediaUpload child={child} userId={userId} onUpdate={reload} />
        </div>
      </div>
    </div>
  );
}
