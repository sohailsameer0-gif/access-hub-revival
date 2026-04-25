import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type StaffRole = 'rider' | 'waiter';

export interface OutletStaff {
  id: string;
  outlet_id: string;
  role: StaffRole;
  name: string;
  phone: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useStaff(outletId?: string, role?: StaffRole) {
  return useQuery({
    queryKey: ['outlet_staff', outletId, role || 'all'],
    queryFn: async () => {
      let q = supabase.from('outlet_staff' as any).select('*').eq('outlet_id', outletId!);
      if (role) q = q.eq('role', role);
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as OutletStaff[];
    },
    enabled: !!outletId,
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { outlet_id: string; role: StaffRole; name: string; phone?: string; notes?: string }) => {
      const { data, error } = await supabase.from('outlet_staff' as any).insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outlet_staff'] }),
  });
}

export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; name?: string; phone?: string; is_active?: boolean; notes?: string }) => {
      const { id, ...updates } = params;
      const { error } = await supabase.from('outlet_staff' as any).update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outlet_staff'] }),
  });
}

export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('outlet_staff' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outlet_staff'] }),
  });
}

export function useAssignOrderStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { order_id: string; rider_id?: string | null; waiter_id?: string | null }) => {
      const { order_id, ...updates } = params;
      const { error } = await supabase.from('orders').update(updates as any).eq('id', order_id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}
