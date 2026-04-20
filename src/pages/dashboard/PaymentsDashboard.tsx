import { useState, useEffect } from 'react';
import { useOutlet, useOrders, useUpdateOrder, useUpdatePayment } from '@/hooks/useData';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, CheckCircle, XCircle, Clock, Image, User, Eye, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface PaymentWithProof {
  id: string;
  order_id: string;
  outlet_id: string;
  amount: number;
  method: string | null;
  status: string;
  created_at: string | null;
  proofs: { id: string; image_url: string }[];
  order?: {
    id: string;
    customer_name: string | null;
    table_id: string | null;
    transaction_id?: string | null;
    order_type: string;
    tables?: { table_number: string } | null;
  };
}

export default function PaymentsDashboard() {
  const { data: outlet } = useOutlet();
  const { data: orders } = useOrders(outlet?.id);
  const updateOrder = useUpdateOrder();
  const updatePayment = useUpdatePayment();
  const [payments, setPayments] = useState<PaymentWithProof[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    if (!outlet?.id) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('payments')
        .select('*, payment_proofs(*)')
        .eq('outlet_id', outlet.id)
        .order('created_at', { ascending: false });
      if (!data) return;
      // Enrich with order info
      const orderIds = [...new Set(data.map(p => p.order_id))];
      const { data: orderData } = await supabase
        .from('orders')
        .select('id, customer_name, table_id, order_type, tables(table_number)')
        .in('id', orderIds);
      const orderMap = new Map((orderData || []).map(o => [o.id, o]));
      setPayments(data.map(p => ({
        ...p,
        proofs: (p as any).payment_proofs || [],
        order: orderMap.get(p.order_id) as any,
      })));
    };
    fetch();
    const interval = setInterval(fetch, 5000);
    return () => clearInterval(interval);
  }, [outlet?.id]);

  if (!outlet) return <p className="text-muted-foreground">Please set up your outlet first.</p>;

  const paidOrders = orders?.filter(o => o.payment_status === 'paid') || [];
  const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const pendingPayments = payments.filter(p => p.status === 'pending_verification');
  const rejectedPayments = payments.filter(p => p.status === 'rejected');

  const handleApprove = async (payment: PaymentWithProof) => {
    try {
      await updatePayment.mutateAsync({ id: payment.id, status: 'paid' });
      await updateOrder.mutateAsync({ id: payment.order_id, payment_status: 'paid' });
      setPayments(prev => prev.map(p => p.id === payment.id ? { ...p, status: 'paid' } : p));
      toast.success('Payment approved!');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleReject = async (payment: PaymentWithProof) => {
    try {
      await supabase.from('payments').update({ status: 'rejected' }).eq('id', payment.id);
      await updateOrder.mutateAsync({ id: payment.order_id, payment_status: 'rejected' });
      setPayments(prev => prev.map(p => p.id === payment.id ? { ...p, status: 'rejected' } : p));
      toast.success('Payment rejected. Customer can resubmit.');
    } catch (err: any) { toast.error(err.message); }
  };

  const displayPayments = viewTab === 'pending'
    ? payments.filter(p => p.status === 'pending_verification')
    : payments;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Payments</h1>
        <p className="text-muted-foreground">Verify online payments & track revenue</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="shadow-card">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold font-heading text-foreground">Rs. {totalRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-secondary/30">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Pending Verification</p>
            <p className="text-2xl font-bold font-heading text-secondary">{pendingPayments.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Rejected</p>
            <p className="text-2xl font-bold font-heading text-destructive">{rejectedPayments.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Verified</p>
            <p className="text-2xl font-bold font-heading text-primary">{payments.filter(p => p.status === 'paid').length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button variant={viewTab === 'pending' ? 'default' : 'outline'} size="sm" onClick={() => setViewTab('pending')}>
          ⏳ Pending ({pendingPayments.length})
        </Button>
        <Button variant={viewTab === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setViewTab('all')}>
          All Payments ({payments.length})
        </Button>
      </div>

      {/* Payment List */}
      {displayPayments.length === 0 && (
        <Card className="shadow-card">
          <CardContent className="py-12 text-center text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{viewTab === 'pending' ? 'No pending verifications.' : 'No payments yet.'}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {displayPayments.map(payment => (
          <Card key={payment.id} className={`shadow-card ${payment.status === 'pending_verification' ? 'border-secondary/40 ring-1 ring-secondary/20' : ''}`}>
            <CardContent className="py-4 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono text-xs">
                    #{payment.order_id.slice(0, 8)}
                  </Badge>
                  <Badge className="capitalize">{(payment.method ?? 'unknown').replace('_', ' ')}</Badge>
                  <Badge variant={
                    payment.status === 'paid' ? 'default' :
                    payment.status === 'pending_verification' ? 'secondary' :
                    payment.status === 'rejected' ? 'destructive' : 'outline'
                  }>
                    {payment.status === 'pending_verification' ? '⏳ Pending' :
                     payment.status === 'paid' ? '✅ Verified' :
                     payment.status === 'rejected' ? '❌ Rejected' : payment.status}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {payment.created_at && formatDistanceToNow(new Date(payment.created_at), { addSuffix: true })}
                </span>
              </div>

              {/* Details */}
              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                <div className="space-y-1">
                  {payment.order?.customer_name && (
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <User className="h-3.5 w-3.5" /> {payment.order.customer_name}
                    </p>
                  )}
                  {payment.order?.tables && (
                    <p className="text-muted-foreground">🍽️ Table {payment.order.tables.table_number}</p>
                  )}
                  <p className="text-muted-foreground capitalize">
                    📦 {payment.order?.order_type?.replace('_', ' ') || 'Order'}
                  </p>
                </div>
                <div className="space-y-1 text-right sm:text-left">
                  <p className="font-heading font-bold text-lg text-foreground">Rs. {payment.amount.toLocaleString()}</p>
                  {payment.order?.transaction_id && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 sm:justify-start justify-end">
                      <CreditCard className="h-3 w-3" /> TXN: {payment.order.transaction_id}
                    </p>
                  )}
                </div>
              </div>

              {/* Payment Proof */}
              {payment.proofs.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {payment.proofs.map(proof => (
                    <button
                      key={proof.id}
                      onClick={() => setPreviewImage(proof.image_url)}
                      className="flex items-center gap-1.5 text-xs text-primary bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 hover:bg-primary/10 transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" /> View Payment Proof
                    </button>
                  ))}
                </div>
              )}

              {/* Actions for pending */}
              {payment.status === 'pending_verification' && (
                <div className="flex gap-2 pt-1 border-t">
                  <Button size="sm" className="gap-1" onClick={() => handleApprove(payment)}>
                    <CheckCircle className="h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button size="sm" variant="destructive" className="gap-1" onClick={() => handleReject(payment)}>
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreviewImage(null)} className="absolute -top-3 -right-3 z-10 h-8 w-8 rounded-full bg-background border shadow-md flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
            <img src={previewImage} alt="Payment proof" className="w-full rounded-2xl shadow-xl border" />
          </div>
        </div>
      )}
    </div>
  );
}
