// Centralized order status constants
// Database enum values must match exactly

export const DINE_IN_STATUSES = ['pending', 'accepted', 'preparing', 'ready', 'served', 'closed'] as const;
export const TAKEAWAY_STATUSES = ['pending', 'accepted', 'preparing', 'ready_for_pickup', 'picked_up', 'closed'] as const;
export const DELIVERY_STATUSES = ['pending', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'closed'] as const;

export const ALL_STATUSES = [
  'pending', 'accepted', 'preparing', 'ready', 'served', 'closed',
  'ready_for_pickup', 'picked_up', 'out_for_delivery', 'delivered',
] as const;

export type OrderStatus = typeof ALL_STATUSES[number];

export const STATUS_DISPLAY_LABELS: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready: 'Ready',
  served: 'Served',
  closed: 'Closed',
  ready_for_pickup: 'Ready for Pickup',
  picked_up: 'Picked Up',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
};

export const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-secondary/20 text-secondary border-secondary/30',
  accepted: 'bg-primary/10 text-primary border-primary/30',
  preparing: 'bg-secondary/15 text-secondary border-secondary/20',
  ready: 'bg-accent text-accent-foreground border-accent',
  ready_for_pickup: 'bg-accent text-accent-foreground border-accent',
  served: 'bg-muted text-muted-foreground border-muted',
  picked_up: 'bg-muted text-muted-foreground border-muted',
  out_for_delivery: 'bg-secondary/15 text-secondary border-secondary/20',
  delivered: 'bg-muted text-muted-foreground border-muted',
  closed: 'bg-muted text-muted-foreground border-muted',
};

export function getStatusesForOrderType(orderType: string): OrderStatus[] {
  if (orderType === 'takeaway') return [...TAKEAWAY_STATUSES];
  if (orderType === 'delivery') return [...DELIVERY_STATUSES];
  return [...DINE_IN_STATUSES];
}

export function getTrackingStatusesForOrderType(orderType: string): OrderStatus[] {
  return getStatusesForOrderType(orderType).filter((status) => status !== 'closed');
}

export function isValidStatusForOrderType(orderType: string, status: string): status is OrderStatus {
  return getStatusesForOrderType(orderType).includes(status as OrderStatus);
}

export function getStatusLabel(status: string): string {
  return STATUS_DISPLAY_LABELS[status] || status;
}
