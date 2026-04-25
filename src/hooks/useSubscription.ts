import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import {
  DEFAULT_PLATFORM_SETTINGS,
  getPlanLimits,
  type PlanKey,
  type PlatformSettingsLike,
} from '@/lib/plans';

// Public read of platform settings (table has public SELECT policy)
export function usePublicPlatformSettings() {
  return useQuery({
    queryKey: ['public_platform_settings'],
    queryFn: async (): Promise<PlatformSettingsLike> => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? DEFAULT_PLATFORM_SETTINGS) as PlatformSettingsLike;
    },
    staleTime: 60_000,
  });
}

/**
 * Resolved subscription view — combines the outlet's subscription row with
 * platform-controlled limits. This is THE hook the outlet panel should use.
 */
export function useResolvedSubscription(outletId?: string) {
  const settingsQ = usePublicPlatformSettings();
  const subQ = useQuery({
    queryKey: ['subscription', outletId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('outlet_id', outletId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!outletId,
  });

  const settings = settingsQ.data ?? DEFAULT_PLATFORM_SETTINGS;
  const sub = subQ.data;

  if (!sub) {
    return {
      isLoading: subQ.isLoading || settingsQ.isLoading,
      data: null as null | {
        id: string;
        plan: PlanKey;
        status: string;
        demo_end_date: string | null;
        paid_until: string | null;
        isDemo: boolean;
        isExpired: boolean;
        isPaid: boolean;
        isSuspended: boolean;
        isPaidExpired: boolean;
        daysLeft: number;
        limits: ReturnType<typeof getPlanLimits>;
        settings: PlatformSettingsLike;
        canAccessApp: boolean;
      },
      settings,
    };
  }

  const now = Date.now();
  const demoEnd = sub.demo_end_date ? new Date(sub.demo_end_date).getTime() : null;
  const paidUntil = (sub as any).paid_until ? new Date((sub as any).paid_until).getTime() : null;
  const isDemo = sub.plan === 'free_demo';
  const isPaid = sub.status === 'paid_active';
  const isSuspended = sub.status === 'suspended';
  const isPaidExpired = !isPaid && !isDemo && sub.status === 'expired';
  const isDemoExpired = isDemo && demoEnd !== null && now > demoEnd;
  const isExpired = isDemoExpired || isPaidExpired;
  const referenceEnd = isPaid ? paidUntil : demoEnd;
  const daysLeft = referenceEnd
    ? Math.max(0, Math.ceil((referenceEnd - now) / (1000 * 60 * 60 * 24)))
    : 0;
  const limits = getPlanLimits(sub.plan as PlanKey, settings);

  return {
    isLoading: false,
    data: {
      id: sub.id,
      plan: sub.plan as PlanKey,
      status: sub.status,
      demo_end_date: sub.demo_end_date,
      paid_until: (sub as any).paid_until ?? null,
      isDemo,
      isExpired,
      isPaid,
      isSuspended,
      isPaidExpired,
      daysLeft,
      limits,
      settings,
      // Outlet can use the app if: paid_active (not lapsed), OR active (not suspended) free demo that hasn't expired
      canAccessApp: !isSuspended && (isPaid || (isDemo && !isDemoExpired)),
    },
    settings,
  };
}

// ===== Plan Requests (outlet creates, admin approves) =====
export function useMyPlanRequests(outletId?: string) {
  return useQuery({
    queryKey: ['plan_requests', outletId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_requests')
        .select('*')
        .eq('outlet_id', outletId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!outletId,
  });
}

export function useCreatePlanRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      outlet_id: string;
      requested_plan: 'basic' | 'standard' | 'pro';
      amount: number;
      method: 'cash' | 'bank_transfer' | 'jazzcash' | 'easypaisa';
      transaction_id?: string;
      proof_url?: string;
    }) => {
      const { data, error } = await supabase
        .from('plan_requests')
        .insert({ ...params, status: 'pending' })
        .select('id, outlet_id, requested_plan, amount, outlets(name)')
        .single();
      if (error) throw error;

      // Audit log: outlet submitted a subscription request
      try {
        const { logActivity } = await import('@/lib/activityLog');
        await logActivity({
          action: 'subscription.request_submitted',
          entity_type: 'subscription',
          entity_id: data.id,
          entity_label: (data as any)?.outlets?.name ?? null,
          metadata: {
            outlet_id: params.outlet_id,
            requested_plan: params.requested_plan,
            amount: params.amount,
            method: params.method,
            transaction_id: params.transaction_id ?? null,
          },
        });
      } catch { /* swallow */ }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plan_requests'] });
      qc.invalidateQueries({ queryKey: ['admin'] });
      qc.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
}

// ===== Admin: list all plan requests =====
export function useAdminPlanRequests() {
  return useQuery({
    queryKey: ['admin', 'plan_requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_requests')
        .select('*, outlets(name, slug, subscriptions(paid_until, status, plan))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpdatePlanRequest() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (params: { id: string; status: 'approved' | 'rejected'; admin_note?: string }) => {
      // Fetch request first so we can write a meaningful audit log
      const { data: existing } = await supabase
        .from('plan_requests')
        .select('id, requested_plan, amount, outlet_id, outlets(name)')
        .eq('id', params.id)
        .maybeSingle();

      // CRITICAL: use server-side RPC so the subscriptions table is updated
      // atomically with the plan_requests row. A plain UPDATE on plan_requests
      // would mark the request approved without ever activating the paid plan,
      // leaving the outlet stuck on free_demo.
      const rpcName = params.status === 'approved'
        ? 'admin_approve_plan_request'
        : 'admin_reject_plan_request';
      const { data: rpcResult, error } = await (supabase as any).rpc(rpcName, {
        _request_id: params.id,
        _admin_note: params.admin_note ?? null,
      });
      if (error) throw error;
      if (!rpcResult?.ok) throw new Error(rpcResult?.message ?? 'Action failed');

      // Best-effort audit log (server already logs, this keeps legacy entries)
      try {
        const { logActivity } = await import('@/lib/activityLog');
        await logActivity({
          action: params.status === 'approved' ? 'payment.approve' : 'payment.reject',
          entity_type: 'subscription',
          entity_id: params.id,
          entity_label: (existing as any)?.outlets?.name ?? null,
          metadata: {
            requested_plan: existing?.requested_plan,
            amount: existing?.amount,
            outlet_id: existing?.outlet_id,
            admin_note: params.admin_note ?? null,
          },
        });
      } catch { /* swallow logging errors */ }

      return user;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] });
      qc.invalidateQueries({ queryKey: ['plan_requests'] });
      qc.invalidateQueries({ queryKey: ['subscription'] });
      qc.invalidateQueries({ queryKey: ['outlet'] });
    },
  });
}
