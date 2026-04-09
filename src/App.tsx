import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthListener } from '@/hooks/useAuth';
import RequireAuth from '@/components/shared/RequireAuth';
import LoginPage from '@/pages/LoginPage';
import GalleryPage from '@/pages/GalleryPage';
import DashboardPage from '@/pages/DashboardPage';

function AppRoutes() {
  useAuthListener();

  return (
    <Routes>
      <Route path="/" element={<GalleryPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardPage />
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
