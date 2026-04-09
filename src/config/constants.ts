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
