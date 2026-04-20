import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logActivity } from '@/lib/activityLog';

// ===== Outlets =====
export function useAdminOutlets() {
  return useQuery({
    queryKey: ['admin', 'outlets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outlets')
        .select('*, subscriptions(*), outlet_settings(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminOutletDetail(id?: string) {
  return useQuery({
    queryKey: ['admin', 'outlet', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outlets')
        .select('*, subscriptions(*), outlet_settings(*)')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useUpdateOutletAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      approval_status?: 'pending' | 'approved' | 'rejected';
      suspended?: boolean;
      suspended_reason?: string | null;
      is_active?: boolean;
    }) => {
      const { id, ...updates } = params;
      // Fetch current state for human-readable label
      const { data: existing } = await supabase
        .from('outlets').select('name').eq('id', id).maybeSingle();
      const { error } = await supabase.from('outlets').update(updates).eq('id', id);
      if (error) throw error;

      // Determine action type for log
      let action: any = null;
      if (updates.approval_status === 'approved') action = 'outlet.approve';
      else if (updates.approval_status === 'rejected') action = 'outlet.reject';
      else if (updates.suspended === true) action = 'outlet.suspend';
      else if (updates.suspended === false) action = 'outlet.reactivate';
      if (action) {
        await logActivity({
          action,
          entity_type: 'outlet',
          entity_id: id,
          entity_label: existing?.name ?? null,
          metadata: updates,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

// ===== Users (via user_roles + outlets) =====
export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const { data: roles, error: rolesErr } = await supabase
        .from('user_roles')
        .select('user_id, role, created_at');
      if (rolesErr) throw rolesErr;

      const { data: outlets } = await supabase
        .from('outlets')
        .select('id, name, owner_id, phone, suspended, approval_status, created_at');

      // Group by user_id
      const userMap = new Map<string, any>();
      (roles ?? []).forEach(r => {
        const ex = userMap.get(r.user_id) ?? { user_id: r.user_id, roles: [], created_at: r.created_at, outlets: [] };
        ex.roles.push(r.role);
        userMap.set(r.user_id, ex);
      });
      (outlets ?? []).forEach(o => {
        const ex = userMap.get(o.owner_id);
        if (ex) ex.outlets.push(o);
      });
      return Array.from(userMap.values());
    },
  });
}

// ===== Orders (platform-wide) =====
export function useAdminOrders(filters?: { outletId?: string; orderType?: string; from?: string; to?: string }) {
  return useQuery({
    queryKey: ['admin', 'orders', filters],
    queryFn: async () => {
      let q = supabase
        .from('orders')
        .select('*, outlets(name), tables(table_number)')
        .order('created_at', { ascending: false })
        .limit(500);
      if (filters?.outletId) q = q.eq('outlet_id', filters.outletId);
      if (filters?.orderType) q = q.eq('order_type', filters.orderType as any);
      if (filters?.from) q = q.gte('created_at', filters.from);
      if (filters?.to) q = q.lte('created_at', filters.to);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ===== Payments (platform-wide) =====
export function useAdminPayments() {
  return useQuery({
    queryKey: ['admin', 'payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, orders(id, total, order_type, transaction_id), outlets(name), payment_proofs(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpdatePaymentAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; status: 'paid' | 'rejected' | 'pending_verification' | 'unpaid' }) => {
      const { data: existing } = await supabase
        .from('payments')
        .select('amount, outlets(name)')
        .eq('id', params.id)
        .maybeSingle();
      const { error } = await supabase.from('payments').update({ status: params.status }).eq('id', params.id);
      if (error) throw error;
      const outletName = (existing as any)?.outlets?.name ?? null;
      if (params.status === 'paid' || params.status === 'rejected') {
        await logActivity({
          action: params.status === 'paid' ? 'payment.approve' : 'payment.reject',
          entity_type: 'payment',
          entity_id: params.id,
          entity_label: outletName ? `${outletName} · Rs. ${existing?.amount ?? 0}` : null,
          metadata: { status: params.status },
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

// ===== Subscriptions =====
export function useUpdateSubscriptionAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      plan?: 'free_demo' | 'basic' | 'standard' | 'pro';
      status?: 'active' | 'expired' | 'paid_active' | 'suspended';
      demo_end_date?: string | null;
    }) => {
      const { id, ...updates } = params;
      const { data: existing } = await supabase
        .from('subscriptions')
        .select('outlet_id, outlets(name)')
        .eq('id', id)
        .maybeSingle();
      const { error } = await supabase.from('subscriptions').update(updates).eq('id', id);
      if (error) throw error;
      await logActivity({
        action: updates.status === 'expired' ? 'subscription.expire' : 'subscription.update',
        entity_type: 'subscription',
        entity_id: id,
        entity_label: (existing as any)?.outlets?.name ?? null,
        metadata: updates,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

// ===== Platform Settings =====
export function usePlatformSettings() {
  return useQuery({
    queryKey: ['admin', 'platform_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('platform_settings').select('*').limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

import type { TablesUpdate } from '@/integrations/supabase/types';

export function useUpdatePlatformSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string } & TablesUpdate<'platform_settings'>) => {
      const { id, ...updates } = params;
      const { error } = await supabase.from('platform_settings').update(updates).eq('id', id);
      if (error) throw error;
      await logActivity({
        action: 'platform_settings.update',
        entity_type: 'platform_settings',
        entity_id: id,
        entity_label: 'Platform Settings',
        metadata: updates as any,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'platform_settings'] });
      qc.invalidateQueries({ queryKey: ['public_platform_settings'] });
      qc.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
}

// ===== Analytics for charts =====
export function useAdminAnalytics() {
  return useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const sinceIso = since.toISOString();

      const [paymentsRes, ordersRes, subsRes] = await Promise.all([
        supabase.from('payments').select('amount, status, created_at').gte('created_at', sinceIso),
        supabase.from('orders').select('status, order_type, created_at').gte('created_at', sinceIso),
        supabase.from('subscriptions').select('plan, status'),
      ]);

      // Revenue by day (paid only)
      const revenueByDay: Record<string, number> = {};
      const ordersByDay: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        revenueByDay[key] = 0;
        ordersByDay[key] = 0;
      }
      (paymentsRes.data ?? []).forEach((p: any) => {
        if (p.status !== 'paid') return;
        const key = String(p.created_at).slice(0, 10);
        if (key in revenueByDay) revenueByDay[key] += Number(p.amount || 0);
      });
      (ordersRes.data ?? []).forEach((o: any) => {
        const key = String(o.created_at).slice(0, 10);
        if (key in ordersByDay) ordersByDay[key] += 1;
      });

      const revenueSeries = Object.entries(revenueByDay).map(([date, value]) => ({
        date: date.slice(5),
        revenue: value,
        orders: ordersByDay[date] ?? 0,
      }));

      // Orders by status
      const statusCounts: Record<string, number> = {};
      (ordersRes.data ?? []).forEach((o: any) => {
        statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
      });
      const ordersByStatus = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

      // Subscription mix
      const planCounts: Record<string, number> = {};
      (subsRes.data ?? []).forEach((s: any) => {
        planCounts[s.plan] = (planCounts[s.plan] ?? 0) + 1;
      });
      const planMix = Object.entries(planCounts).map(([name, value]) => ({ name, value }));

      return { revenueSeries, ordersByStatus, planMix };
    },
  });
}

// ===== Dashboard stats =====
export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const [outlets, payments, orders] = await Promise.all([
        supabase.from('outlets').select('id, approval_status, suspended, is_active'),
        supabase.from('payments').select('id, amount, status, method'),
        supabase.from('orders').select('id, total, status'),
      ]);
      const { data: subs } = await supabase.from('subscriptions').select('plan, status');

      const outletList = outlets.data ?? [];
      const paymentList = payments.data ?? [];
      const orderList = orders.data ?? [];
      const subList = subs ?? [];

      return {
        totalOutlets: outletList.length,
        activeOutlets: outletList.filter(o => o.approval_status === 'approved' && !o.suspended && o.is_active).length,
        pendingApproval: outletList.filter(o => o.approval_status === 'pending').length,
        suspendedOutlets: outletList.filter(o => o.suspended).length,
        demoUsers: subList.filter(s => s.plan === 'free_demo').length,
        paidUsers: subList.filter(s => s.status === 'paid_active').length,
        totalOrders: orderList.length,
        totalCollection: paymentList.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount || 0), 0),
        pendingPaymentVerifications: paymentList.filter(p => p.status === 'pending_verification').length,
      };
    },
  });
}
