import { useOutlet, useOrders, useUpdateOrder, useUpdatePayment } from '@/hooks/useData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ShoppingCart, Clock, MapPin, Phone, User, FileText, CreditCard, Image, UtensilsCrossed, Truck, ShoppingBag, Printer, CheckCircle, Receipt, Banknote } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import OrderPaymentVerification from '@/components/dashboard/OrderPaymentVerification';
import CashConfirmationDialog from '@/components/dashboard/CashConfirmationDialog';

import { STATUS_COLORS as statusColors, STATUS_DISPLAY_LABELS as statusDisplayLabels, getStatusesForOrderType, isValidStatusForOrderType, type OrderStatus } from '@/lib/orderStatusConstants';

const orderTypeLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  dine_in: { label: 'Dine-in', icon: <UtensilsCrossed className="h-3.5 w-3.5" />, color: 'bg-primary/10 text-primary border-primary/30' },
  delivery: { label: 'Delivery', icon: <Truck className="h-3.5 w-3.5" />, color: 'bg-secondary/15 text-secondary border-secondary/30' },
  takeaway: { label: 'Takeaway', icon: <ShoppingBag className="h-3.5 w-3.5" />, color: 'bg-accent text-accent-foreground border-accent' },
};

function printBillForOrder(order: any, outlet: any) {
  const settings = outlet?.outlet_settings?.[0] || outlet?.outlet_settings || null;
  const ot = order.order_type || (order.table_id ? 'dine_in' : 'delivery');
  const taxPct = ot === 'dine_in' ? (settings?.tax_rate || 0) : 0;
  const servicePct = ot === 'dine_in' ? (settings?.service_charge_rate || 0) : 0;
  const subtotal = order.subtotal || 0;
  const tax = Math.round(subtotal * taxPct / 100);
  const service = Math.round(subtotal * servicePct / 100);
  const delivery = ot === 'delivery' ? (order.delivery_charge || 0) : 0;
  const grandTotal = subtotal + tax + service + delivery;
  const billNo = `BILL-${order.id.slice(0, 8).toUpperCase()}`;
  const billDate = new Date(order.created_at).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' });
  const tableNum = order.tables?.table_number;
  const items = (order.order_items || []) as any[];

  const itemRows = items.map((i: any) =>
    `<div class="row"><span>${i.quantity}× ${i.item_name}</span><span>Rs.${i.total_price}</span></div>`
  ).join('');

  const paymentLabel = order.payment_status === 'paid' ? 'Paid' : order.payment_status === 'pending_verification' ? 'Pending Verification' : 'Unpaid';

  const html = `
    <div class="center"><h1>${outlet?.name || 'Restaurant'}</h1>
    ${outlet?.address ? `<p>${outlet.address}${outlet.city ? `, ${outlet.city}` : ''}</p>` : ''}
    ${outlet?.phone ? `<p>Tel: ${outlet.phone}</p>` : ''}</div>
    <div class="line"></div>
    <div class="row"><span>${billNo}</span><span>${billDate}</span></div>
    ${tableNum ? `<p>Table: ${tableNum}</p>` : ''}
    ${order.customer_name ? `<p>Customer: ${order.customer_name}</p>` : ''}
    <p>Payment: ${paymentLabel}</p>
    <div class="line"></div>
    <div class="items"><div class="row bold"><span>Item</span><span>Amount</span></div>${itemRows}</div>
    <div class="line"></div>
    <div class="row"><span>Subtotal</span><span>Rs.${subtotal.toLocaleString()}</span></div>
    ${taxPct > 0 ? `<div class="row"><span>Tax (${taxPct}%)</span><span>Rs.${tax.toLocaleString()}</span></div>` : ''}
    ${servicePct > 0 ? `<div class="row"><span>Service (${servicePct}%)</span><span>Rs.${service.toLocaleString()}</span></div>` : ''}
    ${delivery > 0 ? `<div class="row"><span>Delivery</span><span>Rs.${delivery.toLocaleString()}</span></div>` : ''}
    <div class="line"></div>
    <div class="row total-row"><span>GRAND TOTAL</span><span>Rs.${grandTotal.toLocaleString()}</span></div>
    <div class="line"></div>
    <div class="center small" style="margin-top:8px"><p>Thank you!</p><p>Powered by DineEase Pakistan</p></div>
  `;

  const printWindow = window.open('', '_blank');
  if (!printWindow) { toast.error('Please allow popups to print'); return; }
  printWindow.document.write(`
    <html><head><title>Bill - ${outlet?.name || ''}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Courier New', monospace; width: 80mm; padding: 4mm; font-size: 12px; color: #000; }
      .center { text-align: center; } .bold { font-weight: bold; }
      .line { border-top: 1px dashed #000; margin: 6px 0; }
      .row { display: flex; justify-content: space-between; padding: 1px 0; }
      .items .row { font-size: 11px; } h1 { font-size: 16px; margin-bottom: 2px; }
      .small { font-size: 10px; color: #555; } .total-row { font-size: 14px; font-weight: bold; }
      @media print { body { width: 80mm; } }
    </style></head><body>${html}</body></html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
}

export default function OrdersDashboard() {
  const { data: outlet } = useOutlet();
  const { data: orders } = useOrders(outlet?.id);
  const updateOrder = useUpdateOrder();
  const updatePayment = useUpdatePayment();
  const [viewTab, setViewTab] = useState<'active' | 'history'>('active');
  const [cashConfirmOrder, setCashConfirmOrder] = useState<{ orderId: string; paymentId: string; grandTotal: number; cashHandlingMode: string | null } | null>(null);
  const [cashConfirming, setCashConfirming] = useState(false);

  if (!outlet) return <p className="text-muted-foreground">Please set up your outlet first.</p>;

  const settings = (outlet as any).outlet_settings?.[0] || (outlet as any).outlet_settings || null;
  const rawTaxPct = settings?.tax_rate || 0;
  const rawServicePct = settings?.service_charge_rate || 0;

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    try {
      await updateOrder.mutateAsync({ id: orderId, status });
      toast.success(`Order updated to ${statusDisplayLabels[status] || status}`);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleMarkPaid = async (orderId: string) => {
    try {
      await updateOrder.mutateAsync({ id: orderId, payment_status: 'paid' });
      toast.success('Payment marked as paid');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleApprovePayment = async (orderId: string, paymentId: string) => {
    try {
      await updatePayment.mutateAsync({ id: paymentId, status: 'paid' });
      await updateOrder.mutateAsync({ id: orderId, payment_status: 'paid' });
      toast.success('Payment approved successfully');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRejectPayment = async (orderId: string, paymentId: string) => {
    try {
      await updatePayment.mutateAsync({ id: paymentId, status: 'rejected' });
      await updateOrder.mutateAsync({ id: orderId, payment_status: 'rejected' });
      toast.success('Payment rejected. Customer can resubmit proof.');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleConfirmCashPayment = async (amountReceived: number, changeReturned: number) => {
    if (!cashConfirmOrder) return;
    setCashConfirming(true);
    try {
      await updatePayment.mutateAsync({
        id: cashConfirmOrder.paymentId,
        status: 'paid',
        amount_received: amountReceived,
        change_returned: changeReturned,
      });
      await updateOrder.mutateAsync({ id: cashConfirmOrder.orderId, payment_status: 'paid' });
      toast.success('Cash payment confirmed successfully');
      setCashConfirmOrder(null);
    } catch (err: any) {
      toast.error(err.message);
    }
    setCashConfirming(false);
  };

  // Only "closed" moves to history — all other statuses are active/live
  const activeOrders = orders?.filter(o => o.status !== 'closed') || [];
  const historyOrders = orders?.filter(o => o.status === 'closed') || [];
  
  const displayOrders = viewTab === 'active' ? activeOrders : historyOrders;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Orders</h1>
        <p className="text-muted-foreground">{activeOrders.length} active · {historyOrders.length} completed · Auto-refreshes every 5s</p>
      </div>

      <div className="flex gap-2">
        <Button variant={viewTab === 'active' ? 'default' : 'outline'} size="sm" onClick={() => setViewTab('active')}>
          Active Orders ({activeOrders.length})
        </Button>
        <Button variant={viewTab === 'history' ? 'default' : 'outline'} size="sm" onClick={() => setViewTab('history')}>
          Order History ({historyOrders.length})
        </Button>
      </div>

      {displayOrders.length === 0 && (
        <Card className="shadow-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{viewTab === 'active' ? 'No live orders found. New orders will appear here automatically.' : 'No completed orders yet.'}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {displayOrders.map(order => {
          const ot = (order as any).order_type || (order.table_id ? 'dine_in' : 'delivery');
          const typeInfo = orderTypeLabels[ot] || orderTypeLabels.dine_in;
          const subtotal = order.subtotal || 0;
          // Billing rules: dine_in gets tax+service, delivery gets delivery charges, takeaway gets nothing extra
          const taxPct = ot === 'dine_in' ? rawTaxPct : 0;
          const servicePct = ot === 'dine_in' ? rawServicePct : 0;
          const tax = Math.round(subtotal * taxPct / 100);
          const service = Math.round(subtotal * servicePct / 100);
          const delivery = ot === 'delivery' ? ((order as any).delivery_charge || 0) : 0;
          const grandTotal = subtotal + tax + service + delivery;
          const hasBillRequest = order.bill_requests && (order.bill_requests as any[]).some((br: any) => br.status === 'requested');

          return (
            <Card key={order.id} className={`shadow-card ${order.status === 'pending' ? 'border-secondary/40 ring-1 ring-secondary/20' : ''} ${hasBillRequest ? 'border-primary/40 ring-1 ring-primary/20' : ''}`}>
              <CardContent className="py-4 space-y-3">
                {/* Bill Request Alert */}
                {hasBillRequest && (
                  <div className="bg-primary/10 rounded-lg p-2.5 text-sm text-primary font-semibold text-center flex items-center justify-center gap-2 border border-primary/20">
                    <Receipt className="h-4 w-4" /> Bill Requested by Customer
                  </div>
                )}

                {/* Top row */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`${typeInfo.color} flex items-center gap-1`}>
                      {typeInfo.icon} {typeInfo.label}
                    </Badge>
                    <Badge className={statusColors[order.status] || ''}>{statusDisplayLabels[order.status] || order.status}</Badge>
                    {order.tables && <Badge variant="outline">Table {order.tables.table_number}</Badge>}
                    <Badge variant={order.payment_status === 'paid' ? 'default' : order.payment_status === 'pending_verification' ? 'secondary' : order.payment_status === 'rejected' ? 'destructive' : 'outline'}>
                      {order.payment_status === 'pending_verification' ? '⏳ Pending Verify' : order.payment_status === 'rejected' ? '❌ Rejected' : order.payment_status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(order.created_at!), { addSuffix: true })}
                  </div>
                </div>

                {/* Customer info */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {order.customer_name && (
                    <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {order.customer_name}</span>
                  )}
                  {order.customer_phone && (
                    <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {order.customer_phone}</span>
                  )}
                  {(order as any).customer_address && (
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {(order as any).customer_address}</span>
                  )}
                  {(order as any).vehicle_number && (
                    <span className="flex items-center gap-1">🚗 {(order as any).vehicle_number}</span>
                  )}
                  {(order as any).pickup_time && (
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Pickup: {(order as any).pickup_time}</span>
                  )}
                </div>

                {/* Items */}
                <div className="space-y-1 bg-muted/50 rounded-lg p-2">
                  {order.order_items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-foreground">{item.quantity}× {item.item_name}</span>
                      <span className="text-muted-foreground">Rs. {item.total_price}</span>
                    </div>
                  ))}
                </div>

                {order.special_instructions && <p className="text-xs text-muted-foreground italic flex items-center gap-1"><FileText className="h-3 w-3" /> {order.special_instructions}</p>}

                {/* Transaction & Payment Proof */}
                {order.payments && (order.payments as any[]).length > 0 && (() => {
                  const cashPayments = (order.payments as any[]).filter((p: any) => p.method === 'cash');
                  const onlinePayments = (order.payments as any[]).filter((p: any) => p.method !== 'cash');
                  const pendingCash = cashPayments.find((p: any) => p.status === 'unpaid');
                  const paidCash = cashPayments.find((p: any) => p.status === 'paid');

                  return (
                    <>
                      {/* Cash payment status */}
                      {pendingCash && (
                        <div className="bg-secondary/10 rounded-lg p-3 space-y-2 border border-secondary/20">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Banknote className="h-4 w-4 text-secondary" />
                              <span className="text-sm font-semibold text-foreground">
                                {(pendingCash as any).cash_handling_mode === 'waiter' ? '🧑‍🍳 Cash Pending via Waiter' : '🏪 Awaiting Counter Payment'}
                              </span>
                            </div>
                            <Badge variant="secondary" className="text-xs">Cash Pending</Badge>
                          </div>
                          <Button
                            size="sm"
                            className="w-full gap-1 text-xs"
                            onClick={() => setCashConfirmOrder({
                              orderId: order.id,
                              paymentId: pendingCash.id,
                              grandTotal,
                              cashHandlingMode: (pendingCash as any).cash_handling_mode,
                            })}
                          >
                            <Banknote className="h-3.5 w-3.5" /> Confirm Cash Received
                          </Button>
                        </div>
                      )}

                      {/* Paid cash details */}
                      {paidCash && (
                        <div className="bg-primary/10 rounded-lg p-3 space-y-1 border border-primary/20">
                          <div className="flex items-center gap-2 mb-1">
                            <Banknote className="h-4 w-4 text-primary" />
                            <span className="text-sm font-semibold text-primary">
                              {(paidCash as any).cash_handling_mode === 'waiter' ? '✅ Paid via Waiter' : '✅ Paid at Counter'}
                            </span>
                          </div>
                          {(paidCash as any).amount_received != null && (
                            <>
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Amount Received</span><span>Rs. {Number((paidCash as any).amount_received).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Change Returned</span><span>Rs. {Number((paidCash as any).change_returned || 0).toLocaleString()}</span>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Online payment verification */}
                      {onlinePayments.length > 0 && (
                        <OrderPaymentVerification
                          payments={onlinePayments}
                          transactionId={(order as any).transaction_id}
                          onApprove={(paymentId) => handleApprovePayment(order.id, paymentId)}
                          onReject={(paymentId) => handleRejectPayment(order.id, paymentId)}
                        />
                      )}
                    </>
                  );
                })()}

                {/* Bill Summary with Tax */}
                <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Subtotal</span><span>Rs. {subtotal.toLocaleString()}</span>
                  </div>
                  {taxPct > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Tax ({taxPct}%)</span><span>Rs. {tax.toLocaleString()}</span>
                    </div>
                  )}
                  {servicePct > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Service ({servicePct}%)</span><span>Rs. {service.toLocaleString()}</span>
                    </div>
                  )}
                  {delivery > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Delivery</span><span>Rs. {delivery.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-foreground border-t pt-1">
                    <span>Grand Total</span><span>Rs. {grandTotal.toLocaleString()}</span>
                  </div>
                </div>

                {/* Footer: actions */}
                <div className="flex items-center justify-between border-t pt-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" className="gap-1 text-xs h-8" onClick={() => printBillForOrder(order, outlet)}>
                      <Printer className="h-3.5 w-3.5" /> Print Bill
                    </Button>
                    {order.payment_status !== 'paid' && (
                      <Button variant="default" size="sm" className="gap-1 text-xs h-8" onClick={() => handleMarkPaid(order.id)}>
                        <CheckCircle className="h-3.5 w-3.5" /> Mark Paid
                      </Button>
                    )}
                  </div>
                  {order.status !== 'closed' && (() => {
                    const statuses = getStatusesForOrderType(ot);
                     const selectedStatus = isValidStatusForOrderType(ot, order.status) ? order.status : statuses[0];
                    return (
                       <Select value={selectedStatus} onValueChange={(v: OrderStatus) => handleStatusChange(order.id, v)}>
                         <SelectTrigger className="w-44"><SelectValue>{statusDisplayLabels[selectedStatus] || selectedStatus}</SelectValue></SelectTrigger>
                        <SelectContent>
                          {statuses.map(s => <SelectItem key={s} value={s}>{statusDisplayLabels[s] || s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Cash Confirmation Dialog */}
      <CashConfirmationDialog
        open={!!cashConfirmOrder}
        onClose={() => setCashConfirmOrder(null)}
        grandTotal={cashConfirmOrder?.grandTotal || 0}
        cashHandlingMode={cashConfirmOrder?.cashHandlingMode || null}
        onConfirm={handleConfirmCashPayment}
        submitting={cashConfirming}
      />
    </div>
  );
}
