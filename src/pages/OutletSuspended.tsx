import { useAuth } from '@/lib/auth';
import { useOutlet } from '@/hooks/useData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Ban, LogOut, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Full-screen block shown to outlet owners whose outlet has been suspended.
 * No app navigation, no data mutations. Only sign-out and a contact CTA.
 */
export default function OutletSuspended() {
  const { signOut } = useAuth();
  const { data: outlet } = useOutlet();
  const navigate = useNavigate();

  const reason = outlet?.suspended_reason?.trim() || 'No reason was provided by the administrator.';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg shadow-card border-destructive/40">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
            <Ban className="h-7 w-7 text-destructive" />
          </div>
          <CardTitle className="font-heading text-2xl">Account Suspended</CardTitle>
          <CardDescription>
            {outlet?.name ? `${outlet.name} is currently` : 'Your outlet is currently'} suspended and cannot access the platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Reason
            </p>
            <p className="text-sm text-foreground">{reason}</p>
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              While suspended you cannot manage your menu, tables, orders, payments, or settings.
              Your public menu page is also disabled for new orders.
            </p>
            <p>
              If you believe this is a mistake, contact platform support and reference your outlet
              slug: <code className="px-1.5 py-0.5 bg-muted rounded text-xs">{outlet?.slug ?? '—'}</code>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button asChild variant="outline" className="flex-1">
              <a href="mailto:support@menuqr.app">
                <Mail className="h-4 w-4 mr-2" /> Contact Support
              </a>
            </Button>
            <Button onClick={handleSignOut} variant="default" className="flex-1">
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
