import { useState } from 'react';
import ReactPlayer from 'react-player';
import type { ChildProfile } from '@/types';

interface Props {
  child: ChildProfile;
}

export default function ProfileCard({ child }: Props) {
  const [playing, setPlaying] = useState(false);
  const hasVideo = Boolean(child.videoUrl);
  const hasPhoto = child.photoUrls.length > 0;

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm flex flex-col">
      {/* Media */}
      <div className="aspect-video bg-gray-100 relative">
        {hasVideo ? (
          <ReactPlayer
            url={child.videoUrl}
            width="100%"
            height="100%"
            playing={playing}
            controls
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            light={hasPhoto ? child.photoUrls[0] : true}
          />
        ) : hasPhoto ? (
          <img
            src={child.photoUrls[0]}
            alt={`${child.firstName}'s photo`}
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
          <span className="text-sm text-gray-400">{child.ageAtListing} years old</span>
        </div>

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
      </div>
    </div>
  );
}
