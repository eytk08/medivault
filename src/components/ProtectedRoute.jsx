import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { PageSkeleton } from './ui/Skeleton';

export function ProtectedRoute() {
  const { user, loading } = useSession();
  const location = useLocation();
  if (loading) return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6"><PageSkeleton /></main>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <Outlet />;
}
