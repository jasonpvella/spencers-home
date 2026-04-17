import { Link } from 'react-router-dom';
import type { ChildProfile } from '@/types';

interface Props {
  child: ChildProfile;
  stateId: string;
}

export default function ProfileCard({ child, stateId }: Props) {
  const hasVideo = Boolean(child.videoUrl);
  const hasPhoto = child.photoUrls.length > 0;

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
      {/* Media — fixed h-48 so height never depends on viewport width or image load state */}
      <div className="relative h-48 bg-gray-100 overflow-hidden">
        {hasPhoto ? (
          <img
            src={child.photoUrls[0]}
            alt={`${child.firstName}'s photo`}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl text-gray-300">👤</span>
          </div>
        )}
        {hasVideo && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-full">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <polygon points="2,1 9,5 2,9" />
            </svg>
            Video
          </div>
        )}
      </div>

      {/* Info — all blocks have fixed heights so total card height is identical every render */}
      <div className="p-4">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900 truncate">{child.firstName}</h2>
          <span className="text-sm text-gray-400 ml-2 shrink-0">
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
        <p className="text-sm text-gray-600 line-clamp-2 h-[2.75rem] mb-3 overflow-hidden">{child.bio}</p>
        <div className="flex gap-1.5 mb-3 overflow-hidden h-6">
          {child.interests.slice(0, 3).map((interest) => (
            <span
              key={interest}
              className="text-xs bg-brand-50 text-brand-700 border border-brand-100 px-2 py-0.5 rounded-full whitespace-nowrap"
            >
              {interest}
            </span>
          ))}
        </div>
        <Link
          to={`/c/${stateId}/${child.id}`}
          className="w-full text-center text-sm bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 rounded-xl transition-colors block"
        >
          Learn more about {child.firstName}
        </Link>
      </div>
    </div>
  );
}
