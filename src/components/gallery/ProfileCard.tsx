import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { recordProfileView } from '@/services/children';
import type { ChildProfile } from '@/types';

interface Props {
  child: ChildProfile;
  stateId: string;
}

export default function ProfileCard({ child, stateId }: Props) {
  const hasVideo = Boolean(child.videoUrl);
  const hasPhoto = child.photoUrls.length > 0;
  const viewRecorded = useRef(false);

  useEffect(() => {
    if (viewRecorded.current) return;
    viewRecorded.current = true;
    recordProfileView(stateId, child.id).catch(() => undefined);
  }, [stateId, child.id]);

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm flex flex-col">
      {/* Media */}
      <div className="aspect-video bg-gray-100 relative">
        {hasVideo ? (
          <video
            src={child.videoUrl}
            poster={hasPhoto ? child.photoUrls[0] : undefined}
            controls
            className="w-full h-full object-cover"
          />
        ) : hasPhoto ? (
          <img
            src={child.photoUrls[0]}
            alt={`${child.firstName}'s photo`}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl text-gray-300">👤</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">{child.firstName}</h2>
          <span className="text-sm text-gray-400">
            {child.gender === 'sibling_group'
              ? (child.ages ? `Ages: ${child.ages}` : 'Sibling group')
              : `${child.ageAtListing} years old`}
          </span>
        </div>
        {child.gender === 'sibling_group' && (
          <span className="inline-block text-xs bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full mb-2">
            Sibling group
          </span>
        )}

        {child.bio && (
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-3 mb-3">{child.bio}</p>
        )}

        {child.interests.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
            {child.interests.slice(0, 4).map((interest) => (
              <span
                key={interest}
                className="text-xs bg-brand-50 text-brand-700 border border-brand-100 px-2 py-0.5 rounded-full"
              >
                {interest}
              </span>
            ))}
          </div>
        )}

        <Link
          to={`/c/${stateId}/${child.id}`}
          className="mt-3 w-full text-center text-sm bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 rounded-xl transition-colors"
        >
          Learn more about {child.firstName}
        </Link>
      </div>
    </div>
  );
}
