import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DEFAULT_STATE_ID } from '@/config/constants';
import { usePublishedChildren } from '@/hooks/useChildren';
import ProfileCard from '@/components/gallery/ProfileCard';
import type { Gender } from '@/types';

type GenderFilter = Gender | 'all';
type VideoFilter = 'all' | 'video_only';
type CategoryParam = 'individuals' | 'siblings' | 'boys' | 'girls';

interface Filters {
  minAge: string;
  maxAge: string;
  gender: GenderFilter;
  video: VideoFilter;
}

const DEFAULT_FILTERS: Filters = {
  minAge: '',
  maxAge: '',
  gender: 'all',
  video: 'all',
};

const CATEGORY_LABELS: Record<CategoryParam, string> = {
  individuals: 'Individuals',
  siblings: 'Siblings',
  boys: 'Boys',
  girls: 'Girls',
};

export default function GalleryPage() {
  const [searchParams] = useSearchParams();
  const category = (searchParams.get('category') ?? '') as CategoryParam | '';
  const { children, loading, error } = usePublishedChildren(DEFAULT_STATE_ID);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const filtered = useMemo(() => {
    return children.filter((child) => {
      // Category pre-filter from landing page
      if (category === 'individuals' && child.siblingGroupIds && child.siblingGroupIds.length > 0) return false;
      if (category === 'siblings' && (!child.siblingGroupIds || child.siblingGroupIds.length === 0)) return false;
      if (category === 'boys' && child.gender !== 'male') return false;
      if (category === 'girls' && child.gender !== 'female') return false;
      // Manual filters
      if (filters.minAge !== '' && child.ageAtListing < Number(filters.minAge)) return false;
      if (filters.maxAge !== '' && child.ageAtListing > Number(filters.maxAge)) return false;
      if (filters.gender !== 'all' && child.gender !== filters.gender) return false;
      if (filters.video === 'video_only' && !child.videoUrl) return false;
      return true;
    });
  }, [children, filters, category]);

  const activeFilterCount = [
    filters.minAge !== '',
    filters.maxAge !== '',
    filters.gender !== 'all',
    filters.video !== 'all',
  ].filter(Boolean).length;

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <header className="bg-white border-b border-gray-200 px-4 py-6 text-center">
        <h1 className="text-3xl font-semibold text-gray-900">
          {category && CATEGORY_LABELS[category] ? `Meet Our ${CATEGORY_LABELS[category]}` : 'Meet Our Kids'}
        </h1>
        <p className="text-gray-500 mt-2 max-w-xl mx-auto text-sm">
          Every child here is waiting for a forever family. Watch their videos, learn their
          stories, and reach out to a caseworker if someone catches your heart.
        </p>
        {category && (
          <Link to="/gallery" className="mt-2 inline-block text-xs text-amber-600 hover:underline">
            ← View all children
          </Link>
        )}
      </header>

      {/* Filters */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-3">
          {/* Age range */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 whitespace-nowrap">Age</label>
            <input
              type="number"
              min={0}
              max={21}
              placeholder="Min"
              value={filters.minAge}
              onChange={(e) => setFilters((f) => ({ ...f, minAge: e.target.value }))}
              className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <span className="text-xs text-gray-400">–</span>
            <input
              type="number"
              min={0}
              max={21}
              placeholder="Max"
              value={filters.maxAge}
              onChange={(e) => setFilters((f) => ({ ...f, maxAge: e.target.value }))}
              className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Gender */}
          <select
            value={filters.gender}
            onChange={(e) => setFilters((f) => ({ ...f, gender: e.target.value as GenderFilter }))}
            className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            <option value="all">All genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="nonbinary">Non-binary</option>
          </select>

          {/* Video toggle */}
          <button
            type="button"
            onClick={() =>
              setFilters((f) => ({
                ...f,
                video: f.video === 'all' ? 'video_only' : 'all',
              }))
            }
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              filters.video === 'video_only'
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-brand-400'
            }`}
          >
            Video only
          </button>

          {/* Reset */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors ml-1"
            >
              Clear filters ({activeFilterCount})
            </button>
          )}

          {/* Result count */}
          {!loading && (
            <span className="text-xs text-gray-400 ml-auto">
              {filtered.length} {filtered.length === 1 ? 'child' : 'children'}
            </span>
          )}
        </div>
      </div>

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
        {!loading && !error && children.length > 0 && filtered.length === 0 && (
          <p className="text-center text-gray-400 text-sm">
            No profiles match those filters.{' '}
            <button onClick={resetFilters} className="underline hover:text-gray-600">
              Clear filters
            </button>
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((child) => (
            <ProfileCard key={child.id} child={child} stateId={DEFAULT_STATE_ID} />
          ))}
        </div>
      </main>
    </div>
  );
}
