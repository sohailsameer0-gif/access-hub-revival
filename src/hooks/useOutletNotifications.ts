import { useEffect, useMemo, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { PLAN_LABEL, type PlanKey } from '@/lib/plans';

export type OutletNotificationKind =
  | 'subscription_expiring'
  | 'subscription_expired'
  | 'plan_request_approved'
  | 'plan_request_rejected'
  | 'activity_reset'
  | 'admin_message';

export interface OutletNotification {
  id: string;
  kind: OutletNotificationKind;
  title: string;
  description: string;
  createdAt: string;
  href: string;
  unread: boolean;
}

const SEEN_KEY = (uid: string) => `outlet_notifications_seen_at:${uid}`;
const READ_KEY = (uid: string) => `outlet_notifications_read_ids:${uid}`;

function getSeenAt(uid?: string): number {
  if (!uid || typeof window === 'undefined') return 0;
  const raw = localStorage.getItem(SEEN_KEY(uid));
  return raw ? Number(raw) || 0 : 0;
}
function setSeenAt(uid: string, ts: number) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SEEN_KEY(uid), String(ts));
}
function getReadIds(uid?: string): Set<string> {
  if (!uid || typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(READ_KEY(uid));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch { return new Set(); }
}
function setReadIds(uid: string, ids: Set<string>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(READ_KEY(uid), JSON.stringify(Array.from(ids)));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function useOutletNotifications(outletId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [seenAt, setSeenAtState] = useState<number>(() => getSeenAt(user?.id));
  const [readIds, setReadIdsState] = useState<Set<string>>(() => getReadIds(user?.id));

  useEffect(() => {
    setSeenAtState(getSeenAt(user?.id));
    setReadIdsState(getReadIds(user?.id));
  }, [user?.id]);

  const q = useQuery({
    queryKey: ['outlet', 'notifications', outletId],
    enabled: !!outletId,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<OutletNotification[]> => {
      const since14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      // NOTE: Order notifications are intentionally NOT shown in the bell icon.
      // Orders have their own counter + sound system in the Orders dashboard.
      const [subRes, reqRes, msgRes] = await Promise.all([
        supabase.from('subscriptions').select('id, plan, status, paid_until, demo_end_date, updated_at').eq('outlet_id', outletId!).maybeSingle(),
        supabase.from('plan_requests').select('id, requested_plan, status, admin_note, updated_at').eq('outlet_id', outletId!).in('status', ['approved', 'rejected']).gte('updated_at', since14d).order('updated_at', { ascending: false }).limit(20),
        (supabase as any).from('outlet_messages').select('id, kind, title, body, created_at, read_at').eq('outlet_id', outletId!).gte('created_at', since14d).order('created_at', { ascending: false }).limit(30),
      ]);

      const list: OutletNotification[] = [];
      const now = Date.now();
      const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;
      const sub = subRes.data;
      if (sub) {
        const planLabel = PLAN_LABEL[sub.plan as PlanKey] ?? sub.plan;
        const endIso = sub.status === 'paid_active' ? sub.paid_until : sub.demo_end_date;
        if (endIso) {
          const endMs = new Date(endIso).getTime();
          const msLeft = endMs - now;
          if (sub.status === 'expired' || msLeft < 0) {
            list.push({ id: `sub_expired:${sub.id}`, kind: 'subscription_expired', title: `${planLabel} plan has expired`, description: `Your ${planLabel} subscription expired on ${formatDate(endIso)}. Renew now to keep using all features.`, createdAt: endIso, href: '/outlet/subscribe', unread: true });
          } else if (msLeft <= TWO_DAYS) {
            const daysLeft = Math.max(1, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
            list.push({ id: `sub_expiring:${sub.id}:${endIso}`, kind: 'subscription_expiring', title: `${planLabel} plan expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`, description: `Your ${planLabel} subscription will expire on ${formatDate(endIso)}. Renew now to avoid interruption.`, createdAt: new Date(endMs - TWO_DAYS).toISOString(), href: '/outlet/subscribe', unread: true });
          }
        }
      }

      (reqRes.data ?? []).forEach((r: any) => {
        const planLabel = PLAN_LABEL[r.requested_plan as PlanKey] ?? r.requested_plan;
        if (r.status === 'approved') list.push({ id: `req_approved:${r.id}`, kind: 'plan_request_approved', title: `${planLabel} plan activated`, description: 'Your subscription request was approved. Plan is now active.', createdAt: r.updated_at, href: '/outlet/subscribe', unread: false });
        else if (r.status === 'rejected') list.push({ id: `req_rejected:${r.id}`, kind: 'plan_request_rejected', title: `${planLabel} request rejected`, description: r.admin_note ? `Reason: ${r.admin_note}` : 'Your subscription request was rejected. Please try again.', createdAt: r.updated_at, href: '/outlet/subscribe', unread: false });
      });

      // Order notifications removed from bell — handled by Orders dashboard counter + sound


      (msgRes.data ?? []).forEach((m: any) => {
        const kind: OutletNotificationKind = m.kind === 'activity_reset' ? 'activity_reset' : 'admin_message';
        list.push({
          id: `msg:${m.id}`,
          kind,
          title: m.title,
          description: m.body,
          createdAt: m.created_at,
          href: '/outlet',
          unread: !m.read_at,
        });
      });

      list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      return list;
    },
  });

  const notifications = useMemo<OutletNotification[]>(() => {
    return (q.data ?? []).map(n => {
      // Expired sub stays unread until they actually renew (sub disappears)
      if (n.kind === 'subscription_expired') {
        return { ...n, unread: !readIds.has(n.id) };
      }
      return { ...n, unread: !readIds.has(n.id) && +new Date(n.createdAt) > seenAt };
    });
  }, [q.data, seenAt, readIds]);

  const unreadCount = notifications.filter(n => n.unread).length;

  const markRead = useCallback((id: string) => {
    if (!user?.id) return;
    setReadIdsState(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      setReadIds(user.id, next);
      return next;
    });
  }, [user?.id]);

  const markAllRead = useCallback(() => {
    if (!user?.id) return;
    const ts = Date.now();
    setSeenAt(user.id, ts);
    setSeenAtState(ts);
    const allIds = new Set((q.data ?? []).map(n => n.id));
    setReadIds(user.id, allIds);
    setReadIdsState(allIds);
  }, [user?.id, q.data]);

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['outlet', 'notifications'] });
  }, [qc]);

  return { notifications, unreadCount, isLoading: q.isLoading, markRead, markAllRead, refresh };
}
