export const DEFAULT_STATE_ID = import.meta.env.VITE_DEFAULT_STATE_ID ?? 'NE';
export const APP_ENV = import.meta.env.VITE_APP_ENV ?? 'development';

// Signed URL expiry durations (in seconds)
export const SIGNED_URL_TTL_PUBLIC = 60 * 60;       // 1 hour
export const SIGNED_URL_TTL_AUTH = 60 * 60 * 24;    // 24 hours

// Profile statuses that are visible on the public gallery
export const PUBLIC_GALLERY_STATUSES = ['published'] as const;

// Profile statuses that allow editing
export const EDITABLE_STATUSES = ['draft', 'pending_review', 'consent_obtained'] as const;

// Youth assent default age threshold
export const DEFAULT_YOUTH_ASSENT_AGE = 12;

// Default consent expiry (days)
export const DEFAULT_CONSENT_EXPIRY_DAYS = 365;

// Fixed interests list — adjust per state config in future
export const INTERESTS_LIST = [
  'Animals',
  'Art',
  'Cooking',
  'Crafts',
  'Dance',
  'Drawing',
  'Gaming',
  'Legos',
  'Movies',
  'Music',
  'Outdoors',
  'Photography',
  'Reading',
  'Science',
  'Singing',
  'Sports',
  'Swimming',
  'Theater',
] as const;

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'nonbinary', label: 'Non-binary' },
  { value: 'undisclosed', label: 'Prefer not to say' },
] as const;
