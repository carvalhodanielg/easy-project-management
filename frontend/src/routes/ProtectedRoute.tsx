import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { EmailVerificationBanner } from '../components/EmailVerificationBanner';

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <>
      <EmailVerificationBanner />
      <Outlet />
    </>
  );
}
