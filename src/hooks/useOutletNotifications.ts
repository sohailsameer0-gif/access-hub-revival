import { useEffect, useMemo, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { PLAN_LABEL, type PlanKey } from '@/lib/plans';

/**
 * Aggregated outlet-side notification feed.
 *
 * Sources:
 *  - subscriptions   → expiry reminder (≤2 days before paid_until) + expired
 *  - plan_requests   → status changes (approved/rejected) within last 14 days
 *  - orders          → new pending orders awaiting acceptance
 *
 * Read state is per-user in localStorage (timestamp). Anything created/updated
 * after lastSeenAt is "unread".
 */

export type OutletNotificationKind =
  | 'subscription_expiring'
  | 'subscription_expired'
  | 'plan_request_approved'
  | 'plan_request_rejected'
  | 'order_pending';

export interface OutletNotification {
  id: string;
  kind: OutletNotificationKind;
  title: string;
  description: string;
  createdAt: string;
  href: string;
  unread: boolean;
}

const LS_KEY = (uid: string) => `outlet_notifications_seen_at:${uid}`;

function getSeenAt(uid?: string): number {
  if (!uid || typeof window === 'undefined') return 0;
  const raw = localStorage.getItem(LS_KEY(uid));
  return raw ? Number(raw) || 0 : 0;
}

function setSeenAt(uid: string, ts: number) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_KEY(uid), String(ts));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function useOutletNotifications(outletId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [seenAt, setSeenAtState] = useState<number>(() => getSeenAt(user?.id));

  useEffect(() => {
    setSeenAtState(getSeenAt(user?.id));
  }, [user?.id]);

  const q = useQuery({
    queryKey: ['outlet', 'notifications', outletId],
    enabled: !!outletId,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<OutletNotification[]> => {
      const since14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const [subRes, reqRes, orderRes] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('id, plan, status, paid_until, demo_end_date, updated_at')
          .eq('outlet_id', outletId!)
          .maybeSingle(),
        supabase
          .from('plan_requests')
          .select('id, requested_plan, status, admin_note, updated_at')
          .eq('outlet_id', outletId!)
          .in('status', ['approved', 'rejected'])
          .gte('updated_at', since14d)
          .order('updated_at', { ascending: false })
          .limit(20),
        supabase
          .from('orders')
          .select('id, created_at, customer_name, total')
          .eq('outlet_id', outletId!)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      const list: OutletNotification[] = [];
      const now = Date.now();
      const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;

      // Subscription expiry reminder / expired
      const sub = subRes.data;
      if (sub) {
        const planLabel = PLAN_LABEL[sub.plan as PlanKey] ?? sub.plan;
        const endIso = sub.status === 'paid_active' ? sub.paid_until : sub.demo_end_date;
        if (endIso) {
          const endMs = new Date(endIso).getTime();
          const msLeft = endMs - now;
          if (sub.status === 'expired' || msLeft < 0) {
            list.push({
              id: `sub_expired:${sub.id}`,
              kind: 'subscription_expired',
              title: `${planLabel} plan has expired`,
              description: `Your ${planLabel} subscription expired on ${formatDate(endIso)}. Renew now to keep using all features.`,
              createdAt: endIso,
              href: '/outlet/subscribe',
              unread: true, // always nag until renewed
            });
          } else if (msLeft <= TWO_DAYS) {
            const daysLeft = Math.max(1, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
            list.push({
              id: `sub_expiring:${sub.id}:${endIso}`,
              kind: 'subscription_expiring',
              title: `${planLabel} plan expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
              description: `Your ${planLabel} subscription will expire on ${formatDate(endIso)}. Renew now to avoid interruption.`,
              // Use a stable timestamp 2 days before expiry so unread state is meaningful
              createdAt: new Date(endMs - TWO_DAYS).toISOString(),
              href: '/outlet/subscribe',
              unread: true,
            });
          }
        }
      }

      // Plan request status updates
      (reqRes.data ?? []).forEach((r: any) => {
        const planLabel = PLAN_LABEL[r.requested_plan as PlanKey] ?? r.requested_plan;
        if (r.status === 'approved') {
          list.push({
            id: `req_approved:${r.id}`,
            kind: 'plan_request_approved',
            title: `${planLabel} plan activated`,
            description: 'Your subscription request was approved. Plan is now active.',
            createdAt: r.updated_at,
            href: '/outlet/subscribe',
            unread: false,
          });
        } else if (r.status === 'rejected') {
          list.push({
            id: `req_rejected:${r.id}`,
            kind: 'plan_request_rejected',
            title: `${planLabel} request rejected`,
            description: r.admin_note ? `Reason: ${r.admin_note}` : 'Your subscription request was rejected. Please try again.',
            createdAt: r.updated_at,
            href: '/outlet/subscribe',
            unread: false,
          });
        }
      });

      // Pending orders
      (orderRes.data ?? []).forEach((o: any) => {
        list.push({
          id: `order:${o.id}`,
          kind: 'order_pending',
          title: 'New order awaiting action',
          description: `${o.customer_name || 'Customer'} · Rs. ${Number(o.total ?? 0).toLocaleString()}`,
          createdAt: o.created_at,
          href: '/outlet/orders',
          unread: false,
        });
      });

      list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      return list;
    },
  });

  const notifications = useMemo<OutletNotification[]>(() => {
    return (q.data ?? []).map(n => ({
      ...n,
      // Expired subscription stays unread until they actually renew
      unread: n.kind === 'subscription_expired' ? true : +new Date(n.createdAt) > seenAt,
    }));
  }, [q.data, seenAt]);

  const unreadCount = notifications.filter(n => n.unread).length;

  const markAllRead = useCallback(() => {
    if (!user?.id) return;
    const ts = Date.now();
    setSeenAt(user.id, ts);
    setSeenAtState(ts);
  }, [user?.id]);

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['outlet', 'notifications'] });
  }, [qc]);

  return {
    notifications,
    unreadCount,
    isLoading: q.isLoading,
    markAllRead,
    refresh,
  };
}
