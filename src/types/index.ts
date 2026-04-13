import type { Timestamp } from 'firebase/firestore';

// ─── Profile & Status ─────────────────────────────────────────────────────────

export type Gender = 'male' | 'female' | 'nonbinary' | 'undisclosed';

export type ProfileStatus =
  | 'draft'
  | 'pending_review'
  | 'consent_obtained'
  | 'published'
  | 'match_in_progress'
  | 'placed'
  | 'archived';

export type ConsentStatus =
  | 'not_obtained'
  | 'pending'
  | 'active'
  | 'expired';

export type ConsentAuthority =
  | 'caseworker'
  | 'supervisor'
  | 'director'
  | 'court';

export type UserRole =
  | 'caseworker'
  | 'supervisor'
  | 'agency_admin'
  | 'state_admin'
  | 'platform_admin';

// ─── Child Profile ─────────────────────────────────────────────────────────────

export interface ChildProfile {
  id: string;
  stateId: string;
  firstName: string;
  ageAtListing: number;
  gender: Gender;
  bio: string;
  interests: string[];
  siblingGroupIds?: string[];
  videoUrl?: string;
  photoUrls: string[];
  status: ProfileStatus;
  icwaFlag: boolean;
  icwaNotes?: string;
  consentId?: string;
  consentStatus: ConsentStatus;
  publishedAt?: Timestamp;
  lastUpdatedAt: Timestamp;
  createdAt: Timestamp;
  createdBy: string;
  viewCount: number;
  saveCount: number;
  inquiryCount: number;
}

// ─── Consent ───────────────────────────────────────────────────────────────────

export interface AuditEntry {
  action: string;
  performedBy: string;
  performedAt: Timestamp;
  details?: Record<string, unknown>;
}

export interface ConsentRecord {
  id: string;
  stateId: string;
  childId: string;
  signedBy: string;
  signerRole: ConsentAuthority;
  signedAt: Timestamp;
  expiresAt: Timestamp;
  formData: Record<string, unknown>;
  documentUrl?: string;
  youthAssentObtained?: boolean;
  icwaTribalNotified?: boolean;
  auditTrail: AuditEntry[];
}

// ─── State Config ──────────────────────────────────────────────────────────────

export interface GalleryTierConfig {
  showFullName: boolean;
  showAge: boolean;
  showBio: boolean;
  showVideo: boolean;
  showPhotos: boolean;
}

export interface StateConfig {
  stateId: string;
  stateName: string;
  agencyName: string;
  consentModel: ConsentAuthority;
  consentExpiryDays: number;
  requireYouthAssentAge: number;
  icwaEnabled: boolean;
  galleryTiers: {
    public: GalleryTierConfig;
    registered: GalleryTierConfig;
    agency: GalleryTierConfig;
  };
  branding: {
    primaryColor: string;
    logoUrl?: string;
    customDomain?: string;
  };
  piiRules: {
    firstNameOnly: boolean;
    noSchoolNames: boolean;
    noLocationIdentifiers: boolean;
    additionalRules: string[];
  };
}

// ─── User ──────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  stateId: string;
  active: boolean;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
}

// ─── Inquiry ───────────────────────────────────────────────────────────────────

export interface Inquiry {
  id: string;
  name: string;
  phone: string;
  email: string;
  inquirerState: string;
  message: string;
  submittedAt: Timestamp;
}

// ─── Notification ──────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;  // specific user ID, or 'admin:{stateId}' for admin-targeted notifications
  stateId: string;
  type?: 'inquiry' | 'registration';
  // Inquiry-specific
  childId?: string;
  childFirstName?: string;
  inquirerName?: string;
  // Registration-specific
  message?: string;
  read: boolean;
  createdAt: Timestamp;
}

// ─── Audit Log ─────────────────────────────────────────────────────────────────

export type SsoProviderType = 'saml' | 'oidc';

export interface SsoProvider {
  stateId: string;
  providerType: SsoProviderType;
  providerId: string;
  displayName: string;
  enabled: boolean;
  updatedAt?: Timestamp;
}

// ─── Sponsor ───────────────────────────────────────────────────────────────────

export interface Sponsor {
  id: string;
  name: string;
  logoUrl: string;
  linkUrl?: string;
  order: number;
  active: boolean;
  uploadedBy: string;
  createdAt: Timestamp;
}

export type AuditEventType =
  | 'profile_status_change'
  | 'consent_signed'
  | 'consent_expired'
  | 'media_upload'
  | 'media_delete'
  | 'user_role_change'
  | 'user_sso_login'
  | 'profile_view'
  | 'inquiry_submitted'
  | 'state_config_updated';

export interface AuditLog {
  id: string;
  stateId: string;
  eventType: AuditEventType;
  targetId: string;
  targetType: 'child' | 'consent' | 'user' | 'media' | 'state';
  performedBy: string;
  performedAt: Timestamp;
  details: Record<string, unknown>;
}
