import type { Database as GeneratedDatabase } from './types';

type AppOrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'served'
  | 'closed'
  | 'ready_for_pickup'
  | 'picked_up'
  | 'out_for_delivery'
  | 'delivered';

type AppPaymentStatus = 'unpaid' | 'pending_verification' | 'paid' | 'rejected';

export type Database = Omit<GeneratedDatabase, 'public'> & {
  public: Omit<GeneratedDatabase['public'], 'Enums'> & {
    Enums: Omit<GeneratedDatabase['public']['Enums'], 'order_status' | 'payment_status'> & {
      order_status: AppOrderStatus;
      payment_status: AppPaymentStatus;
    };
  };
};