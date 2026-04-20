import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useOutletAccess } from '@/hooks/useOutletAccess';
import { Loader2 } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireOutletOwner?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false, requireOutletOwner = false }: Props) {
  const { user, loading, isAdmin, isOutletOwner } = useAuth();
  const location = useLocation();
  const { data: access, isLoading: accessLoading } = useOutletAccess();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  // Admin-only area: outlet owners get redirected to their panel
  if (requireAdmin && !isAdmin) {
    return <Navigate to={isOutletOwner ? '/outlet' : '/auth'} replace />;
  }

  // Outlet-only area: admins get redirected to admin panel (strict separation)
  if (requireOutletOwner && !isOutletOwner) {
    return <Navigate to={isAdmin ? '/admin' : '/auth'} replace />;
  }

  // Outlet access gate: every outlet route requires verified status
  if (requireOutletOwner) {
    if (accessLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    // If access record exists and isn't verified, force user to /outlet/verify
    if (access && access.status !== 'verified' && location.pathname !== '/outlet/verify') {
      return <Navigate to="/outlet/verify" replace />;
    }
  }

  return <>{children}</>;
}
