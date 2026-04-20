import { supabase } from '@/integrations/supabase/client';

export type ActivityAction =
  | 'outlet.approve'
  | 'outlet.reject'
  | 'outlet.suspend'
  | 'outlet.reactivate'
  | 'outlet.access_approve'
  | 'outlet.access_reject'
  | 'outlet.otp_regenerate'
  | 'outlet.otp_verified'
  | 'outlet.access_blocked'
  | 'outlet.unblock'
  | 'subscription.update'
  | 'subscription.expire'
  | 'subscription.request_submitted'
  | 'payment.approve'
  | 'payment.reject'
  | 'payment_method.create'
  | 'payment_method.update'
  | 'payment_method.delete'
  | 'platform_settings.update'
  | 'user.suspend'
  | 'user.reactivate'
  | 'account.password_changed';

export interface LogActivityInput {
  action: ActivityAction;
  entity_type: 'outlet' | 'subscription' | 'payment' | 'payment_method' | 'user' | 'platform_settings';
  entity_id?: string | null;
  entity_label?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Best-effort audit logging. Failures are swallowed so a logging
 * problem never breaks the underlying admin action.
 */
export async function logActivity(input: LogActivityInput) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('activity_logs').insert({
      actor_id: user.id,
      actor_email: user.email ?? null,
      action: input.action,
      entity_type: input.entity_type,
      entity_id: input.entity_id ?? null,
      entity_label: input.entity_label ?? null,
      metadata: input.metadata ?? {},
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('activity_log insert failed', e);
  }
}
