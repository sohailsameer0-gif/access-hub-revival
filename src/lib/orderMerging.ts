/**
 * Order merging rules:
 *  - Dine-in: same outlet + same table_id + same session_id (when present), else same table_id within active window
 *  - Delivery: same outlet + same customer_phone + same calendar day
 *  - Takeaway: same outlet + same customer_phone + same calendar day
 *
 * Merging only applies to orders that are NOT cancelled. A "settled" order
 * (status === 'closed') stops a dine-in session — orders after that start a new bill.
 */

export type MergeableOrder = {
  id: string;
  outlet_id?: string | null;
  order_type?: string | null;
  table_id?: string | null;
  session_id?: string | null;
  customer_phone?: string | null;
  status?: string | null;
  created_at?: string | null;
};

const sameDay = (a?: string | null, b?: string | null) => {
  if (!a || !b) return false;
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear()
    && da.getMonth() === db.getMonth()
    && da.getDate() === db.getDate();
};

export function getMergeKey(order: MergeableOrder): string | null {
  const ot = order.order_type || (order.table_id ? 'dine_in' : 'delivery');
  if (order.status === 'cancelled') return null;
  if (ot === 'dine_in') {
    if (!order.table_id) return null;
    // Prefer session_id when present so that a fresh customer at the same table later does not get merged.
    return `dine|${order.table_id}|${order.session_id || 'no_session'}`;
  }
  if (ot === 'delivery' || ot === 'takeaway') {
    if (!order.customer_phone) return null;
    const day = order.created_at ? new Date(order.created_at).toISOString().slice(0, 10) : 'no_date';
    return `${ot}|${order.customer_phone}|${day}`;
  }
  return null;
}

/** Returns all orders that share the merge key with the given order (including itself). */
export function findMergedOrders<T extends MergeableOrder>(target: T, all: T[]): T[] {
  const key = getMergeKey(target);
  if (!key) return [target];
  // For dine-in we additionally stop merging once an order in the group is closed (session ended).
  const sameKey = all.filter(o => getMergeKey(o) === key);
  return sameKey.length ? sameKey : [target];
}
