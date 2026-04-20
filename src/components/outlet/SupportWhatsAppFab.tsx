import { MessageCircle } from 'lucide-react';
import { usePublicPlatformSettings } from '@/hooks/useSubscription';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function toWhatsAppLink(raw: string, prefilled?: string): string {
  const digits = raw.replace(/[^\d+]/g, '').replace(/^\+/, '');
  const text = prefilled ? `?text=${encodeURIComponent(prefilled)}` : '';
  return `https://wa.me/${digits}${text}`;
}

interface Props {
  /** Optional pre-filled message for WhatsApp */
  prefilledMessage?: string;
}

/**
 * Floating WhatsApp support button shown in the bottom-right corner.
 * Opens the official Admin Support WhatsApp chat directly.
 */
export default function SupportWhatsAppFab({ prefilledMessage }: Props) {
  const { data: settings } = usePublicPlatformSettings();
  const whatsapp = (settings?.support_whatsapp ?? '').trim();

  if (!whatsapp) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={toWhatsAppLink(whatsapp, prefilledMessage)}
            target="_blank"
            rel="noreferrer"
            aria-label="Contact Admin Support on WhatsApp"
            className="fixed bottom-5 right-5 z-50 group flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-emerald-500/30"
          >
            <MessageCircle className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
          </a>
        </TooltipTrigger>
        <TooltipContent side="left" className="font-medium">
          Chat with Admin Support
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
