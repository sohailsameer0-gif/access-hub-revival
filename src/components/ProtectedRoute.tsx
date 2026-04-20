import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useOutletAccess } from '@/hooks/useOutletAccess';
import { useOutlet } from '@/hooks/useData';
import { Loader2 } from 'lucide-react';
import OutletSuspended from '@/pages/OutletSuspended';

interface Props {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireOutletOwner?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false, requireOutletOwner = false }: Props) {
  const { user, loading, isAdmin, isOutletOwner } = useAuth();
  const location = useLocation();
  const { data: access, isLoading: accessLoading } = useOutletAccess();
  const { data: outlet, isLoading: outletLoading } = useOutlet();

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

  // Outlet-side guards
  if (requireOutletOwner) {
    if (outletLoading || accessLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    // 1) Suspension is the highest-priority block — short-circuits all other panel access.
    //    Show the suspended screen no matter which outlet route the user tries to hit.
    if (outlet && outlet.suspended === true) {
      return <OutletSuspended />;
    }

    // 2) OTP / verification gate: every outlet route requires verified status.
    if (access && access.status !== 'verified' && location.pathname !== '/outlet/verify') {
      return <Navigate to="/outlet/verify" replace />;
    }
  }

  return <>{children}</>;
}
