import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthListener } from '@/hooks/useAuth';
import RequireAuth from '@/components/shared/RequireAuth';
import AppShell from '@/components/shared/AppShell';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import GalleryPage from '@/pages/GalleryPage';
import DashboardPage from '@/pages/DashboardPage';
import ProfileFormPage from '@/pages/ProfileFormPage';
import ProfileDetailPage from '@/pages/ProfileDetailPage';
import ConsentFormPage from '@/pages/ConsentFormPage';
import AdminUsersPage from '@/pages/AdminUsersPage';
import type { ReactNode } from 'react';

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}

function AppRoutes() {
  useAuthListener();

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<GalleryPage />} />
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

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
