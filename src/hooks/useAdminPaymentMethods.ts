import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logActivity } from '@/lib/activityLog';

export interface AdminPaymentMethod {
  id: string;
  type: string;
  label: string;
  account_title: string | null;
  account_number: string | null;
  iban: string | null;
  bank_name: string | null;
  instructions: string | null;
  qr_image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type AdminPaymentMethodInput = Omit<
  AdminPaymentMethod,
  'id' | 'created_at' | 'updated_at'
>;

const TABLE = 'admin_payment_methods' as const;

/** Outlet-side: only enabled methods, ordered. */
export function useActivePaymentMethods() {
  return useQuery({
    queryKey: ['admin_payment_methods', 'active'],
    queryFn: async (): Promise<AdminPaymentMethod[]> => {
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as AdminPaymentMethod[];
    },
    staleTime: 30_000,
  });
}

/** Admin-side: all methods including disabled. */
export function useAllPaymentMethods() {
  return useQuery({
    queryKey: ['admin_payment_methods', 'all'],
    queryFn: async (): Promise<AdminPaymentMethod[]> => {
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as AdminPaymentMethod[];
    },
  });
}

export function useUpsertPaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Partial<AdminPaymentMethodInput> & { id?: string },
    ) => {
      const isUpdate = !!input.id;
      let row: any;
      if (isUpdate) {
        const { id, ...rest } = input;
        const { data, error } = await (supabase as any)
          .from(TABLE).update(rest).eq('id', id).select().single();
        if (error) throw error;
        row = data;
      } else {
        const { data, error } = await (supabase as any)
          .from(TABLE).insert(input).select().single();
        if (error) throw error;
        row = data;
      }
      try {
        await logActivity({
          action: isUpdate ? 'payment_method.update' : 'payment_method.create',
          entity_type: 'payment_method',
          entity_id: row.id,
          entity_label: row.label ?? null,
          metadata: { type: row.type, is_active: row.is_active },
        });
      } catch { /* swallow */ }
      return row;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin_payment_methods'] }),
  });
}

export function useDeletePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: existing } = await (supabase as any)
        .from(TABLE).select('label').eq('id', id).maybeSingle();
      const { error } = await (supabase as any).from(TABLE).delete().eq('id', id);
      if (error) throw error;
      try {
        await logActivity({
          action: 'payment_method.delete',
          entity_type: 'payment_method',
          entity_id: id,
          entity_label: existing?.label ?? null,
        });
      } catch { /* swallow */ }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin_payment_methods'] }),
  });
}

export function useTogglePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data: existing } = await (supabase as any)
        .from(TABLE).select('label').eq('id', id).maybeSingle();
      const { error } = await (supabase as any)
        .from(TABLE).update({ is_active }).eq('id', id);
      if (error) throw error;
      try {
        await logActivity({
          action: 'payment_method.update',
          entity_type: 'payment_method',
          entity_id: id,
          entity_label: existing?.label ?? null,
          metadata: { is_active },
        });
      } catch { /* swallow */ }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin_payment_methods'] }),
  });
}
