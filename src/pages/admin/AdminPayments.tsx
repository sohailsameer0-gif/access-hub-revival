import { useState, useMemo } from 'react';
import { useAdminPayments, useUpdatePaymentAdmin } from '@/hooks/useAdminData';
import { useAdminPlanRequests, useUpdatePlanRequest } from '@/hooks/useSubscription';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, XCircle, Eye, Loader2, Crown, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { PLAN_LABEL, type PlanKey } from '@/lib/plans';

export default function AdminPayments() {
  const { data: payments, isLoading } = useAdminPayments();
  const { data: planRequests, isLoading: prLoading } = useAdminPlanRequests();
  const updatePayment = useUpdatePaymentAdmin();
  const updatePlanReq = useUpdatePlanRequest();

  const [filter, setFilter] = useState<string>('pending_verification');
  const [planFilter, setPlanFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'orders'>('subscriptions');

  const filteredOrderPayments = useMemo(
    () => (payments ?? []).filter((p: any) => filter === 'all' || p.status === filter),
    [payments, filter],
  );

  const filteredPlanRequests = useMemo(
    () => (planRequests ?? []).filter((r: any) => planFilter === 'all' || r.status === planFilter),
    [planRequests, planFilter],
  );

  const pendingSubs = (planRequests ?? []).filter((r: any) => r.status === 'pending').length;
  const pendingOrders = (payments ?? []).filter((p: any) => p.status === 'pending_verification').length;

  const handleApproveOrder = async (id: string) => {
    await updatePayment.mutateAsync({ id, status: 'paid' });
    toast.success('Payment approved');
  };
  const handleRejectOrder = async (id: string) => {
    await updatePayment.mutateAsync({ id, status: 'rejected' });
    toast.success('Payment rejected');
  };

  const handleApproveSub = async (id: string) => {
    await updatePlanReq.mutateAsync({ id, status: 'approved' });
    toast.success('Subscription approved — outlet plan activated');
  };
  const handleRejectSub = async (id: string) => {
    await updatePlanReq.mutateAsync({ id, status: 'rejected' });
    toast.success('Subscription request rejected');
  };

  const openProof = async (path: string) => {
    if (path.startsWith('http')) { setProofUrl(path); return; }
    const { data } = await supabase.storage.from('payment-proofs').createSignedUrl(path, 60 * 5);
    if (data?.signedUrl) setProofUrl(data.signedUrl);
    else toast.error('Could not open proof');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">Payment Verifications</h1>
        <p className="text-muted-foreground text-sm">Review subscription payments from outlets and order payments from customers</p>
      </div>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)}>
        <TabsList className="grid grid-cols-2 w-full md:w-[420px]">
          <TabsTrigger value="subscriptions" className="gap-2">
            <Crown className="h-4 w-4" /> Subscriptions
            {pendingSubs > 0 && <Badge className="ml-1 h-5 px-1.5 bg-destructive text-destructive-foreground border-0">{pendingSubs}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <Receipt className="h-4 w-4" /> Order Payments
            {pendingOrders > 0 && <Badge className="ml-1 h-5 px-1.5 bg-destructive text-destructive-foreground border-0">{pendingOrders}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* SUBSCRIPTIONS TAB */}
        <TabsContent value="subscriptions" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4">
              <Select value={planFilter} onValueChange={v => setPlanFilter(v as any)}>
                <SelectTrigger className="w-full md:w-64"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {prLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Outlet</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>TRX ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Renewal Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPlanRequests.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <p className="font-medium">{r.outlets?.name ?? '—'}</p>
                            <p className="text-xs text-muted-foreground">{r.outlets?.slug}</p>
                          </TableCell>
                          <TableCell><Badge variant="outline">{PLAN_LABEL[r.requested_plan as PlanKey]}</Badge></TableCell>
                          <TableCell className="font-medium">Rs. {Number(r.amount).toLocaleString()}</TableCell>
                          <TableCell><span className="text-xs capitalize">{r.method?.replace('_', ' ') ?? '—'}</span></TableCell>
                          <TableCell><span className="text-xs font-mono">{r.transaction_id || '—'}</span></TableCell>
                          <TableCell>
                            <Badge
                              variant={r.status === 'approved' ? 'default' : r.status === 'rejected' ? 'destructive' : 'outline'}
                              className={r.status === 'approved' ? 'bg-green-600 hover:bg-green-600' : ''}
                            >
                              {r.status}
                            </Badge>
                          </TableCell>
                          <TableCell><span className="text-xs text-muted-foreground">{format(new Date(r.created_at), 'dd MMM HH:mm')}</span></TableCell>
                          <TableCell>
                            {(() => {
                              const sub = r.outlets?.subscriptions?.[0] ?? r.outlets?.subscriptions;
                              const paidUntil = sub?.paid_until;
                              if (!paidUntil) return <span className="text-xs text-muted-foreground">—</span>;
                              const days = Math.ceil((new Date(paidUntil).getTime() - Date.now()) / 86_400_000);
                              const expired = days < 0;
                              const soon = days >= 0 && days <= 7;
                              return (
                                <div className="flex flex-col">
                                  <span className="text-xs font-medium">{format(new Date(paidUntil), 'dd MMM yyyy')}</span>
                                  <span className={`text-[10px] ${expired ? 'text-destructive' : soon ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                    {expired ? `Expired ${Math.abs(days)}d ago` : `${days}d left`}
                                  </span>
                                </div>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 justify-end">
                              {r.proof_url && (
                                <Button size="sm" variant="outline" onClick={() => openProof(r.proof_url)}>
                                  <Eye className="h-3 w-3 mr-1" /> Proof
                                </Button>
                              )}
                              {r.status === 'pending' && (
                                <>
                                  <Button size="sm" onClick={() => handleApproveSub(r.id)}><CheckCircle2 className="h-3 w-3 mr-1" />Approve</Button>
                                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleRejectSub(r.id)}><XCircle className="h-3 w-3 mr-1" />Reject</Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredPlanRequests.length === 0 && (
                        <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No subscription requests.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ORDER PAYMENTS TAB */}
        <TabsContent value="orders" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-full md:w-64"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All payments</SelectItem>
                  <SelectItem value="pending_verification">Pending Verification</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Outlet</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>TRX ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrderPayments.map((p: any) => {
                        const proof = p.payment_proofs?.[0];
                        return (
                          <TableRow key={p.id}>
                            <TableCell>
                              <p className="font-medium">{p.outlets?.name ?? '—'}</p>
                              <p className="text-xs text-muted-foreground">Order #{p.order_id?.slice(0, 8)}</p>
                            </TableCell>
                            <TableCell><span className="text-xs capitalize">{p.method?.replace('_', ' ') ?? '—'}</span></TableCell>
                            <TableCell><span className="font-medium">Rs. {Number(p.amount).toLocaleString()}</span></TableCell>
                            <TableCell><span className="text-xs font-mono">{p.orders?.transaction_id || '—'}</span></TableCell>
                            <TableCell>
                              <Badge variant={p.status === 'paid' ? 'default' : p.status === 'rejected' ? 'destructive' : 'outline'} className={p.status === 'paid' ? 'bg-green-600 hover:bg-green-600' : ''}>
                                {p.status.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell><span className="text-xs text-muted-foreground">{format(new Date(p.created_at), 'dd MMM HH:mm')}</span></TableCell>
                            <TableCell>
                              <div className="flex gap-1 justify-end">
                                {proof && <Button size="sm" variant="outline" onClick={() => setProofUrl(proof.image_url)}><Eye className="h-3 w-3 mr-1" />Proof</Button>}
                                {p.status === 'pending_verification' && (
                                  <>
                                    <Button size="sm" onClick={() => handleApproveOrder(p.id)}><CheckCircle2 className="h-3 w-3 mr-1" />Approve</Button>
                                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleRejectOrder(p.id)}><XCircle className="h-3 w-3 mr-1" />Reject</Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {filteredOrderPayments.length === 0 && (
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No payments.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!proofUrl} onOpenChange={v => !v && setProofUrl(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Payment Proof</DialogTitle></DialogHeader>
          {proofUrl && <img src={proofUrl} alt="Payment proof" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
