import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthListener } from '@/hooks/useAuth';
import RequireAuth from '@/components/shared/RequireAuth';
import AppShell from '@/components/shared/AppShell';
import StaffPreviewBar from '@/components/shared/StaffPreviewBar';
import type { UserRole } from '@/types';
import type { ReactNode } from 'react';

// Wraps lazy imports so a stale-cache chunk error after a new deploy triggers
// a one-time reload rather than showing a blank error screen.
function lazyWithReload<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(() =>
    factory().catch(() => {
      if (!sessionStorage.getItem('chunk-reload')) {
        sessionStorage.setItem('chunk-reload', '1');
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      return factory();
    })
  );
}

const LandingPage = lazyWithReload(() => import('@/pages/LandingPage'));
const LoginPage = lazyWithReload(() => import('@/pages/LoginPage'));
const RegisterPage = lazyWithReload(() => import('@/pages/RegisterPage'));
const GalleryPage = lazyWithReload(() => import('@/pages/GalleryPage'));
const PublicProfilePage = lazyWithReload(() => import('@/pages/PublicProfilePage'));
const DashboardPage = lazyWithReload(() => import('@/pages/DashboardPage'));
const ProfileFormPage = lazyWithReload(() => import('@/pages/ProfileFormPage'));
const ProfileDetailPage = lazyWithReload(() => import('@/pages/ProfileDetailPage'));
const ConsentFormPage = lazyWithReload(() => import('@/pages/ConsentFormPage'));
const AdminUsersPage = lazyWithReload(() => import('@/pages/AdminUsersPage'));
const StateConfigPage = lazyWithReload(() => import('@/pages/StateConfigPage'));
const AdminSponsorsPage = lazyWithReload(() => import('@/pages/AdminSponsorsPage'));
const AccountSettingsPage = lazyWithReload(() => import('@/pages/AccountSettingsPage'));
const InquiriesPage = lazyWithReload(() => import('@/pages/InquiriesPage'));

const CASEWORKER_ROLES: UserRole[] = ['caseworker', 'supervisor', 'agency_admin', 'state_admin', 'platform_admin'];

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="text-sm text-gray-400">Loading…</span>
    </div>
  );
}

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <RequireAuth allowedRoles={CASEWORKER_ROLES}>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}

function AppRoutes() {
  useAuthListener();

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<><StaffPreviewBar /><LandingPage /></>} />
        <Route path="/gallery" element={<><StaffPreviewBar /><GalleryPage /></>} />
        <Route path="/c/:stateId/:childId" element={<><StaffPreviewBar /><PublicProfilePage /></>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Caseworker — auth required */}
        <Route
          path="/dashboard"
          element={
            <AuthShell>
              <DashboardPage />
            </AuthShell>
          }
        />
        <Route
          path="/profile/new"
          element={
            <AuthShell>
              <ProfileFormPage mode="create" />
            </AuthShell>
          }
        />
        <Route
          path="/profile/:id"
          element={
            <AuthShell>
              <ProfileDetailPage />
            </AuthShell>
          }
        />
        <Route
          path="/profile/:id/edit"
          element={
            <AuthShell>
              <ProfileFormPage mode="edit" />
            </AuthShell>
          }
        />
        <Route
          path="/profile/:id/consent"
          element={
            <AuthShell>
              <ConsentFormPage />
            </AuthShell>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RequireAuth allowedRoles={['state_admin', 'agency_admin', 'platform_admin']}>
              <AppShell>
                <AdminUsersPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/admin/state-config"
          element={
            <RequireAuth allowedRoles={['state_admin', 'platform_admin']}>
              <AppShell>
                <StateConfigPage />
              </AppShell>
            </RequireAuth>
          }
        />

        <Route
          path="/admin/sponsors"
          element={
            <RequireAuth allowedRoles={['platform_admin']}>
              <AppShell>
                <AdminSponsorsPage />
              </AppShell>
            </RequireAuth>
          }
        />

        <Route
          path="/inquiries"
          element={
            <AuthShell>
              <InquiriesPage />
            </AuthShell>
          }
        />
        <Route
          path="/settings"
          element={
            <AuthShell>
              <AccountSettingsPage />
            </AuthShell>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
