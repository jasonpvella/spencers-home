import { DEFAULT_STATE_ID } from '@/config/constants';
import { usePublishedChildren } from '@/hooks/useChildren';
import ProfileCard from '@/components/gallery/ProfileCard';

export default function GalleryPage() {
  const { children, loading, error } = usePublishedChildren(DEFAULT_STATE_ID);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-6 text-center">
        <h1 className="text-3xl font-semibold text-gray-900">Meet Our Kids</h1>
        <p className="text-gray-500 mt-2 max-w-xl mx-auto text-sm">
          Every child here is waiting for a forever family. Watch their videos, learn their
          stories, and reach out to a caseworker if someone catches your heart.
        </p>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        {loading && (
          <p className="text-center text-gray-400 text-sm">Loading…</p>
        )}
        {error && (
          <p className="text-center text-red-500 text-sm">{error}</p>
        )}
        {!loading && !error && children.length === 0 && (
          <p className="text-center text-gray-400 text-sm">No profiles published yet.</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {children.map((child) => (
            <ProfileCard key={child.id} child={child} />
          ))}
        </div>
      </main>
    </div>
  );
}
