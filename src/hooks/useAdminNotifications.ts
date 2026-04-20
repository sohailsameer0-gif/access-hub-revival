import { useEffect, useMemo, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export type AdminNotificationKind =
  | 'plan_request'
  | 'order_payment'
  | 'outlet_approval'
  | 'outlet_access_pending'
  | 'outlet_access_blocked';

export interface AdminNotification {
  id: string;
  kind: AdminNotificationKind;
  title: string;
  description: string;
  createdAt: string;
  href: string;
  unread: boolean;
}

const SEEN_KEY = (uid: string) => `admin_notifications_seen_at:${uid}`;
const READ_KEY = (uid: string) => `admin_notifications_read_ids:${uid}`;

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

export function useAdminNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [seenAt, setSeenAtState] = useState<number>(() => getSeenAt(user?.id));
  const [readIds, setReadIdsState] = useState<Set<string>>(() => getReadIds(user?.id));

  useEffect(() => {
    setSeenAtState(getSeenAt(user?.id));
    setReadIdsState(getReadIds(user?.id));
  }, [user?.id]);

  const q = useQuery({
    queryKey: ['admin', 'notifications'],
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<AdminNotification[]> => {
      const [planReqs, pendingPayments, pendingOutlets, accessRows] = await Promise.all([
        supabase.from('plan_requests').select('id, requested_plan, amount, created_at, outlets(name)').eq('status', 'pending').order('created_at', { ascending: false }).limit(50),
        supabase.from('payments').select('id, amount, created_at, outlets(name), order_id').eq('status', 'pending_verification').order('created_at', { ascending: false }).limit(50),
        supabase.from('outlets').select('id, name, created_at').eq('approval_status', 'pending').order('created_at', { ascending: false }).limit(50),
        supabase.from('outlet_access' as any).select('outlet_id, status, blocked_at, created_at, outlets(name)').in('status', ['pending', 'blocked']).order('created_at', { ascending: false }).limit(50),
      ]);

      const list: AdminNotification[] = [];
      (planReqs.data ?? []).forEach((r: any) => list.push({ id: `plan_request:${r.id}`, kind: 'plan_request', title: 'New subscription request', description: `${r.outlets?.name ?? 'Outlet'} requested ${r.requested_plan} plan · Rs. ${Number(r.amount).toLocaleString()}`, createdAt: r.created_at, href: '/admin/plan-requests', unread: false }));
      (pendingPayments.data ?? []).forEach((p: any) => list.push({ id: `payment:${p.id}`, kind: 'order_payment', title: 'Order payment to verify', description: `${p.outlets?.name ?? 'Outlet'} · Rs. ${Number(p.amount).toLocaleString()}`, createdAt: p.created_at, href: '/admin/payments', unread: false }));
      (pendingOutlets.data ?? []).forEach((o: any) => list.push({ id: `outlet:${o.id}`, kind: 'outlet_approval', title: 'New outlet awaiting approval', description: o.name, createdAt: o.created_at, href: '/admin/outlets', unread: false }));
      (accessRows.data ?? []).forEach((a: any) => {
        if (a.status === 'pending') list.push({ id: `access_pending:${a.outlet_id}`, kind: 'outlet_access_pending', title: 'Outlet awaiting access approval', description: `${a.outlets?.name ?? 'Outlet'} needs to be approved & verified.`, createdAt: a.created_at, href: '/admin/outlets', unread: false });
        else if (a.status === 'blocked') list.push({ id: `access_blocked:${a.outlet_id}`, kind: 'outlet_access_blocked', title: 'Outlet locked out', description: `${a.outlets?.name ?? 'Outlet'} hit max OTP attempts. Issue a new code.`, createdAt: a.blocked_at ?? a.created_at, href: '/admin/outlets', unread: false });
      });

      list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      return list;
    },
  });

  const notifications = useMemo<AdminNotification[]>(() => {
    return (q.data ?? []).map(n => ({
      ...n,
      unread: !readIds.has(n.id) && +new Date(n.createdAt) > seenAt,
    }));
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
    qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });
  }, [qc]);

  return { notifications, unreadCount, isLoading: q.isLoading, markRead, markAllRead, refresh };
}
