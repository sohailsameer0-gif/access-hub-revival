import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import type { OrderStatus } from '@/lib/orderStatusConstants';

export function useOutlet() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['outlet', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('outlets')
        .select('*, subscriptions(*), outlet_settings(*)')
        .eq('owner_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    // Re-check suspension/approval state regularly so admin actions take effect quickly
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  });
}

export function useCreateOutlet() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (values: { name: string; slug: string; business_type: 'restaurant' | 'hotel' | 'fast_food' | 'cafe' | 'bakery' | 'other'; city?: string; phone?: string; description?: string; address?: string; whatsapp?: string; google_maps_link?: string }) => {
      const { data, error } = await supabase
        .from('outlets')
        .insert({ ...values, owner_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outlet'] }),
  });
}

export function useUpdateOutlet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; name?: string; slug?: string; description?: string; address?: string; city?: string; phone?: string; whatsapp?: string; google_maps_link?: string; logo_url?: string; cover_image_url?: string; business_type?: 'restaurant' | 'hotel' | 'fast_food' | 'cafe' | 'bakery' | 'other' }) => {
      const { id, ...updates } = params;
      const { error } = await supabase.from('outlets').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outlet'] }),
  });
}

export function useMenuCategories(outletId?: string) {
  return useQuery({
    queryKey: ['menu_categories', outletId],
    queryFn: async () => {
      const { data, error } = await supabase.from('menu_categories').select('*').eq('outlet_id', outletId!).order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!outletId,
  });
}

export function useMenuItems(outletId?: string) {
  return useQuery({
    queryKey: ['menu_items', outletId],
    queryFn: async () => {
      const { data, error } = await supabase.from('menu_items').select('*, menu_categories(name)').eq('outlet_id', outletId!).order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!outletId,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { name: string; outlet_id: string; sort_order?: number }) => {
      const { data, error } = await supabase.from('menu_categories').insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu_categories'] }),
  });
}

export function useCreateMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { name: string; outlet_id: string; category_id: string; price: number; description?: string; discounted_price?: number; image_url?: string; tags?: string[] }) => {
      const { data, error } = await supabase.from('menu_items').insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu_items'] }),
  });
}

export function useUpdateMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; name?: string; description?: string; price?: number; discounted_price?: number | null; image_url?: string; is_available?: boolean; tags?: string[]; category_id?: string }) => {
      const { id, ...updates } = params;
      const { error } = await supabase.from('menu_items').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu_items'] }),
  });
}

export function useDeleteMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('menu_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu_items'] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('menu_categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu_categories'] }),
  });
}

export function useTables(outletId?: string) {
  return useQuery({
    queryKey: ['tables', outletId],
    queryFn: async () => {
      const { data, error } = await supabase.from('tables').select('*').eq('outlet_id', outletId!).order('table_number');
      if (error) throw error;
      return data;
    },
    enabled: !!outletId,
  });
}

export function useCreateTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { table_number: string; name?: string; outlet_id: string }) => {
      const { data, error } = await supabase.from('tables').insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tables'] }),
  });
}

export function useDeleteTable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tables').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tables'] }),
  });
}

export function useOrders(outletId?: string) {
  return useQuery({
    queryKey: ['orders', outletId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*), tables(table_number), bill_requests(*), payments(*, payment_proofs(*)), rider:rider_id(id, name, phone), waiter:waiter_id(id, name, phone)')
        .eq('outlet_id', outletId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!outletId,
    refetchInterval: 5000,
  });
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; status?: OrderStatus; payment_status?: 'unpaid' | 'pending_verification' | 'paid' | 'rejected' }) => {
      const { id, ...updates } = params;
      const { error } = await supabase.from('orders').update(updates as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function usePublicOutlet(slug: string) {
  return useQuery({
    queryKey: ['public_outlet', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outlets')
        .select('*, outlet_settings(*)')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });
}

export function usePublicMenu(outletId?: string) {
  return useQuery({
    queryKey: ['public_menu', outletId],
    queryFn: async () => {
      const { data: categories } = await supabase.from('menu_categories').select('*').eq('outlet_id', outletId!).order('sort_order');
      const { data: items } = await supabase.from('menu_items').select('*').eq('outlet_id', outletId!).eq('is_available', true).order('sort_order');
      return { categories: categories || [], items: items || [] };
    },
    enabled: !!outletId,
  });
}

export function useSubscriptionStatus(outletId?: string) {
  return useQuery({
    queryKey: ['subscription', outletId],
    queryFn: async () => {
      const { data, error } = await supabase.from('subscriptions').select('*').eq('outlet_id', outletId!).single();
      if (error) throw error;
      const now = new Date();
      const endDate = new Date(data.demo_end_date!);
      const isExpired = data.plan === 'free_demo' && now > endDate;
      const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      return { ...data, isExpired, daysLeft, isDemo: data.plan === 'free_demo', isPaid: data.status === 'paid_active' };
    },
    enabled: !!outletId,
  });
}

export function useAllOutlets() {
  return useQuery({
    queryKey: ['admin_outlets'],
    queryFn: async () => {
      const { data, error } = await supabase.from('outlets').select('*, subscriptions(*)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAllOrders() {
  return useQuery({
    queryKey: ['admin_orders'],
    queryFn: async () => {
      const { data, error } = await supabase.from('orders').select('*, outlets(name), order_items(*)').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });
}

export function useAllPayments() {
  return useQuery({
    queryKey: ['admin_payments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('payments').select('*, orders(id), outlets(name), payment_proofs(*)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; plan?: 'free_demo' | 'basic' | 'pro'; status?: 'active' | 'expired' | 'paid_active' | 'suspended' }) => {
      const { id, ...updates } = params;
      const { error } = await supabase.from('subscriptions').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_outlets'] });
      qc.invalidateQueries({ queryKey: ['subscription'] });
    },
  });
}

export function useUpdatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; status?: 'unpaid' | 'pending_verification' | 'paid' | 'rejected'; amount_received?: number; change_returned?: number; cash_handling_mode?: string }) => {
      const { id, ...updates } = params;
      const { error } = await supabase.from('payments').update(updates as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_payments'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['outlet_payments'] });
    },
  });
}
