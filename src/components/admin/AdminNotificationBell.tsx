import { useNavigate } from 'react-router-dom';
import { Bell, Crown, Receipt, Store, CheckCheck, ShieldCheck, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAdminNotifications, type AdminNotificationKind } from '@/hooks/useAdminNotifications';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const KIND_ICON: Record<AdminNotificationKind, typeof Bell> = {
  plan_request: Crown,
  order_payment: Receipt,
  outlet_approval: Store,
  outlet_access_pending: ShieldCheck,
  outlet_access_blocked: Ban,
};

const KIND_COLOR: Record<AdminNotificationKind, string> = {
  plan_request: 'text-secondary bg-secondary/10',
  order_payment: 'text-primary bg-primary/10',
  outlet_approval: 'text-amber-600 bg-amber-50',
  outlet_access_pending: 'text-blue-600 bg-blue-50',
  outlet_access_blocked: 'text-destructive bg-destructive/10',
};

export default function AdminNotificationBell() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead } = useAdminNotifications();

  const handleClick = (id: string, href: string) => {
    markRead(id);
    navigate(href);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications (${unreadCount} unread)`}>
          <Bell className={cn('h-5 w-5', unreadCount > 0 && 'animate-bell-shake')} />
          {unreadCount > 0 && (
            <span
              className={cn(
                'absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full',
                'bg-destructive text-destructive-foreground text-[10px] font-bold leading-none',
                'flex items-center justify-center ring-2 ring-card animate-badge-pulse',
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <div>
            <p className="font-heading font-bold text-sm text-foreground">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} new` : 'All caught up'}
            </p>
          </div>
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
              <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[420px]">
          {notifications.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No new activity
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map(n => {
                const Icon = KIND_ICON[n.kind];
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => handleClick(n.id, n.href)}
                      className={cn(
                        'w-full text-left p-3 flex items-start gap-3 hover:bg-accent/50 transition-colors',
                        n.unread && 'bg-primary/5',
                      )}
                    >
                      <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', KIND_COLOR[n.kind])}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                          {n.unread && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{n.description}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
