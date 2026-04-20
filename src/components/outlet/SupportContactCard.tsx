import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Mail, LifeBuoy } from 'lucide-react';
import { usePublicPlatformSettings } from '@/hooks/useSubscription';

function toWhatsAppLink(raw: string): string {
  // Keep digits and leading +
  const digits = raw.replace(/[^\d+]/g, '').replace(/^\+/, '');
  return `https://wa.me/${digits}`;
}

interface Props {
  /** Visual variant. `compact` is a smaller inline card suitable for sidebars. */
  variant?: 'default' | 'compact';
  className?: string;
}

export default function SupportContactCard({ variant = 'default', className }: Props) {
  const { data: settings } = usePublicPlatformSettings();
  const whatsapp = (settings?.support_whatsapp ?? '').trim();
  const email = (settings?.support_email ?? '').trim();

  if (!whatsapp && !email) return null;

  if (variant === 'compact') {
    return (
      <div className={className}>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <LifeBuoy className="h-3.5 w-3.5 text-primary" /> Admin Support
          </p>
          <div className="mt-2 flex flex-col gap-1.5">
            {whatsapp && (
              <a
                href={toWhatsAppLink(whatsapp)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-foreground hover:text-primary transition-colors"
              >
                <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                {whatsapp}
              </a>
            )}
            {email && (
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-1.5 text-xs text-foreground hover:text-primary transition-colors truncate"
              >
                <Mail className="h-3.5 w-3.5 text-primary" />
                <span className="truncate">{email}</span>
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <LifeBuoy className="h-5 w-5 text-primary" /> Admin Support
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Need help with your account, subscription, or payments? Reach out to the official admin support below.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {whatsapp && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a href={toWhatsAppLink(whatsapp)} target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                WhatsApp: {whatsapp}
              </a>
            </Button>
          )}
          {email && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a href={`mailto:${email}`}>
                <Mail className="h-4 w-4 text-primary" />
                {email}
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
