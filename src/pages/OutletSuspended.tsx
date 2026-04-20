import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useOutlet } from '@/hooks/useData';
import { usePublicPlatformSettings } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Ban, LogOut, Mail, MessageCircle, Copy, Check, LifeBuoy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

function toWhatsAppLink(raw: string, prefilled?: string): string {
  const digits = raw.replace(/[^\d+]/g, '').replace(/^\+/, '');
  const text = prefilled ? `?text=${encodeURIComponent(prefilled)}` : '';
  return `https://wa.me/${digits}${text}`;
}

export default function OutletSuspended() {
  const { signOut } = useAuth();
  const { data: outlet } = useOutlet();
  const { data: settings } = usePublicPlatformSettings();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const whatsapp = (settings?.support_whatsapp ?? '').trim();
  const email = (settings?.support_email ?? '').trim();
  const reason = outlet?.suspended_reason?.trim() || 'No reason was provided by the administrator.';

  const prefilledMsg = `Hello Admin Support, my outlet "${outlet?.name ?? ''}" (slug: ${outlet?.slug ?? ''}) has been suspended. Reason: ${reason}. Please assist.`;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleCopyEmail = async () => {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      toast({ title: 'Email copied', description: email });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Could not copy', description: 'Please copy the email manually.', variant: 'destructive' });
    }
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
              If you believe this is a mistake, contact official support and reference your outlet
              slug: <code className="px-1.5 py-0.5 bg-muted rounded text-xs">{outlet?.slug ?? '—'}</code>
            </p>
          </div>

          {(whatsapp || email) && (
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <LifeBuoy className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Official Admin Support</p>
              </div>

              {whatsapp && (
                <Button
                  asChild
                  className="w-full justify-start gap-3 bg-emerald-500 hover:bg-emerald-600 text-white border-0 h-11"
                >
                  <a href={toWhatsAppLink(whatsapp, prefilledMsg)} target="_blank" rel="noreferrer">
                    <MessageCircle className="h-5 w-5" />
                    <span className="flex-1 text-left">
                      <span className="block text-sm font-semibold">WhatsApp</span>
                      <span className="block text-xs opacity-90">{whatsapp}</span>
                    </span>
                  </a>
                </Button>
              )}

              {email && (
                <div className="flex items-stretch gap-2">
                  <Button asChild variant="outline" className="flex-1 justify-start gap-3 h-11">
                    <a href={`mailto:${email}?subject=${encodeURIComponent('Outlet Suspended - ' + (outlet?.name ?? ''))}&body=${encodeURIComponent(prefilledMsg)}`}>
                      <Mail className="h-5 w-5 text-primary" />
                      <span className="flex-1 text-left">
                        <span className="block text-sm font-semibold text-foreground">Email</span>
                        <span className="block text-xs text-muted-foreground truncate">{email}</span>
                      </span>
                    </a>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyEmail}
                    aria-label="Copy support email"
                    className="h-11 px-3"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              )}
            </div>
          )}

          <Button onClick={handleSignOut} variant="ghost" className="w-full">
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
