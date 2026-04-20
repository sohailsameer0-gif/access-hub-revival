import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useCallback } from 'react';

export type OutletAccessStatus = 'pending' | 'approved' | 'rejected' | 'verified' | 'blocked';

export interface OutletAccessRow {
  id: string;
  outlet_id: string;
  status: OutletAccessStatus;
  otp_expires_at: string | null;
  otp_attempts: number;
  otp_max_attempts: number;
  rejected_reason: string | null;
  verified_at: string | null;
  blocked_at: string | null;
  approved_at: string | null;
  last_password_changed_at: string | null;
  // Admin-only field — undefined for outlet owners
  otp_plain_for_admin?: string | null;
}

/**
 * Returns the outlet_access row for the currently signed-in outlet owner's outlet.
 * Returns null while loading or if the user has no outlet yet.
 */
export function useOutletAccess() {
  const { user, isOutletOwner } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ['outlet-access', user?.id],
    enabled: !!user?.id && isOutletOwner,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<OutletAccessRow | null> => {
      // Find this user's outlet first
      const { data: outlet } = await supabase
        .from('outlets')
        .select('id')
        .eq('owner_id', user!.id)
        .maybeSingle();
      if (!outlet) return null;

      const { data, error } = await supabase
        .from('outlet_access' as any)
        .select('*')
        .eq('outlet_id', outlet.id)
        .maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
  });

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['outlet-access', user?.id] });
  }, [qc, user?.id]);

  return { ...q, refresh };
}
