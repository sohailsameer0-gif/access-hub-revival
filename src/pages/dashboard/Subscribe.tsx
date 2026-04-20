import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useOutlet } from '@/hooks/useData';
import {
  useResolvedSubscription,
  useCreatePlanRequest,
  useMyPlanRequests,
} from '@/hooks/useSubscription';
import { useActivePaymentMethods, type AdminPaymentMethod } from '@/hooks/useAdminPaymentMethods';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Check, Crown, Loader2, ShieldCheck, Sparkles, Star, UploadCloud, Building2, Smartphone, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import {
  PLAN_LABEL,
  getPlanLimits,
  planFeatureList,
  type PlanKey,
} from '@/lib/plans';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const PAID_PLANS: Array<{ key: 'basic' | 'standard' | 'pro'; icon: typeof Star; tagline: string; highlight?: boolean }> = [
  { key: 'basic', icon: Star, tagline: 'For small outlets just getting started' },
  { key: 'standard', icon: Sparkles, tagline: 'For growing restaurants & cafes', highlight: true },
  { key: 'pro', icon: Crown, tagline: 'Unlimited everything for serious operators' },
];

const TYPE_ICON: Record<string, typeof Building2> = {
  bank_transfer: Building2,
  jazzcash: Smartphone,
  easypaisa: Smartphone,
  other: Wallet,
};

function methodTypeToEnum(type: string): 'cash' | 'bank_transfer' | 'jazzcash' | 'easypaisa' {
  if (type === 'jazzcash' || type === 'easypaisa' || type === 'bank_transfer') return type;
  return 'bank_transfer';
}

export default function Subscribe() {
  const navigate = useNavigate();
  const { data: outlet, isLoading: outletLoading } = useOutlet();
  const resolved = useResolvedSubscription(outlet?.id);
  const requestsQ = useMyPlanRequests(outlet?.id);
  const createReq = useCreatePlanRequest();
  const methodsQ = useActivePaymentMethods();

  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'standard' | 'pro' | null>(null);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [txnId, setTxnId] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const settings = resolved.settings;
  const sub = resolved.data;
  const methods = methodsQ.data ?? [];

  const pendingRequest = useMemo(
    () => (requestsQ.data ?? []).find(r => r.status === 'pending'),
    [requestsQ.data],
  );

  const selectedMethod: AdminPaymentMethod | null = useMemo(
    () => methods.find(m => m.id === selectedMethodId) ?? null,
    [methods, selectedMethodId],
  );

  // Auto-pick first method when dialog opens
  useEffect(() => {
    if (selectedPlan && !selectedMethodId && methods.length > 0) {
      setSelectedMethodId(methods[0].id);
    }
  }, [selectedPlan, selectedMethodId, methods]);

  if (outletLoading || resolved.isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!outlet) {
    return (
      <div className="text-center space-y-4 py-16">
        <p className="text-muted-foreground">Please create your outlet first.</p>
        <Button onClick={() => navigate('/outlet/profile')}>Create Outlet</Button>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!selectedPlan || !outlet) return;
    if (!selectedMethod) {
      toast.error('Please choose a payment method');
      return;
    }
    if (!proofFile) {
      toast.error('Please upload your payment proof');
      return;
    }
    const price = getPlanLimits(selectedPlan, settings).price ?? 0;

    setUploading(true);
    try {
      const ext = proofFile.name.split('.').pop() ?? 'jpg';
      const path = `${outlet.id}/plan-${selectedPlan}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('payment-proofs')
        .upload(path, proofFile, { upsert: false });
      if (upErr) throw upErr;

      await createReq.mutateAsync({
        outlet_id: outlet.id,
        requested_plan: selectedPlan,
        amount: price,
        method: methodTypeToEnum(selectedMethod.type),
        transaction_id: txnId || undefined,
        proof_url: path,
      });

      toast.success('Subscription request submitted! Admin will review it shortly.');
      setSelectedPlan(null);
      setSelectedMethodId(null);
      setTxnId('');
      setProofFile(null);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to submit request');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">Subscription Plans</h1>
        <p className="text-muted-foreground text-sm">
          Choose the plan that fits your business. Upgrade anytime — even during your free trial.
        </p>
      </div>

      {/* Current plan card */}
      {sub && (
        <Card className="border-primary/30 bg-accent/40">
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold font-heading">
                {sub.isDemo ? sub.daysLeft : <ShieldCheck className="h-5 w-5" />}
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Current plan: <span className="font-heading">{PLAN_LABEL[sub.plan]}</span>
                  {sub.isPaid && <Badge className="ml-2 bg-green-600 hover:bg-green-600">Active</Badge>}
                  {sub.isDemo && !sub.isExpired && <Badge variant="outline" className="ml-2">Trial</Badge>}
                  {sub.isExpired && <Badge variant="destructive" className="ml-2">Expired</Badge>}
                  {sub.isSuspended && <Badge variant="destructive" className="ml-2">Suspended</Badge>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {sub.isDemo
                    ? sub.isExpired
                      ? 'Your free trial ended. Upgrade to keep using all features.'
                      : `${sub.daysLeft} day${sub.daysLeft === 1 ? '' : 's'} of free trial remaining`
                    : sub.isPaid
                      ? 'You have full access to all features included in your plan.'
                      : 'Subscription inactive — please upgrade.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending request banner */}
      {pendingRequest && (
        <Card className="border-secondary/40 bg-secondary/5">
          <CardContent className="flex items-center gap-3 py-4">
            <Loader2 className="h-5 w-5 animate-spin text-secondary" />
            <div>
              <p className="font-medium text-foreground">Subscription request pending review</p>
              <p className="text-xs text-muted-foreground">
                Requested {PLAN_LABEL[pendingRequest.requested_plan as PlanKey]} for Rs. {Number(pendingRequest.amount).toLocaleString()} ·{' '}
                Submitted {format(new Date(pendingRequest.created_at), 'dd MMM, HH:mm')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No methods configured warning */}
      {!methodsQ.isLoading && methods.length === 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-4">
            <p className="font-medium text-foreground">Subscriptions are temporarily unavailable</p>
            <p className="text-xs text-muted-foreground mt-1">
              The platform admin hasn't configured any payment methods yet. Please contact support.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Plan cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {PAID_PLANS.map(({ key, icon: Icon, tagline, highlight }) => {
          const limits = getPlanLimits(key, settings);
          const isCurrent = sub?.plan === key && sub.isPaid;
          const features = planFeatureList(key, limits);
          const disabled = isCurrent || !!pendingRequest || methods.length === 0;
          return (
            <Card
              key={key}
              className={`relative shadow-card transition-shadow hover:shadow-card-hover flex flex-col ${
                highlight ? 'border-primary border-2' : ''
              }`}
            >
              {highlight && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-primary text-primary-foreground border-0">
                  Most Popular
                </Badge>
              )}
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${highlight ? 'text-primary' : 'text-muted-foreground'}`} />
                  <CardTitle className="font-heading">{PLAN_LABEL[key]}</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">{tagline}</p>
                <div className="pt-2">
                  <span className="text-3xl font-heading font-bold text-foreground">
                    Rs. {limits.price?.toLocaleString() ?? '—'}
                  </span>
                  <span className="text-sm text-muted-foreground"> / month</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4">
                <ul className="space-y-2 text-sm flex-1">
                  {features.map(f => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={highlight ? 'hero' : 'outline'}
                  className="w-full"
                  disabled={disabled}
                  onClick={() => setSelectedPlan(key)}
                >
                  {isCurrent ? 'Current Plan' : pendingRequest ? 'Request Pending' : 'Subscribe'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Past requests */}
      {(requestsQ.data?.length ?? 0) > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Subscription History</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {requestsQ.data!.map(r => (
              <div key={r.id} className="flex items-center justify-between gap-3 border-b last:border-b-0 pb-2 last:pb-0">
                <div>
                  <p className="text-sm font-medium">
                    {PLAN_LABEL[r.requested_plan as PlanKey]} · Rs. {Number(r.amount).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(r.created_at), 'dd MMM yyyy, HH:mm')} · {r.method?.replace('_', ' ')}
                  </p>
                </div>
                <Badge
                  variant={r.status === 'approved' ? 'default' : r.status === 'rejected' ? 'destructive' : 'outline'}
                  className={r.status === 'approved' ? 'bg-green-600 hover:bg-green-600' : ''}
                >
                  {r.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Subscribe dialog */}
      <Dialog open={!!selectedPlan} onOpenChange={v => { if (!v) { setSelectedPlan(null); setSelectedMethodId(null); } }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Subscribe to {selectedPlan ? PLAN_LABEL[selectedPlan] : ''} ·{' '}
              Rs. {selectedPlan ? getPlanLimits(selectedPlan, settings).price?.toLocaleString() : ''}
            </DialogTitle>
            <DialogDescription>
              Send the payment to one of the accounts below, then upload your proof. Your plan activates after admin approval.
            </DialogDescription>
          </DialogHeader>

          {/* Payment Method Picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Choose a payment method</Label>
            <div className="grid gap-2">
              {methods.map(m => {
                const Icon = TYPE_ICON[m.type] ?? Wallet;
                const active = selectedMethodId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMethodId(m.id)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
                      active ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-muted/40',
                    )}
                  >
                    <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', active ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground">{m.label}</p>
                      <p className="text-xs text-muted-foreground capitalize">{m.type.replace('_', ' ')}</p>
                    </div>
                    {active && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected method details */}
          {selectedMethod && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-sm">
              {selectedMethod.account_title && (
                <p><span className="text-muted-foreground">Title:</span> <span className="font-medium">{selectedMethod.account_title}</span></p>
              )}
              {selectedMethod.account_number && (
                <p><span className="text-muted-foreground">Account:</span> <span className="font-mono font-medium">{selectedMethod.account_number}</span></p>
              )}
              {selectedMethod.bank_name && (
                <p><span className="text-muted-foreground">Bank:</span> {selectedMethod.bank_name}</p>
              )}
              {selectedMethod.iban && (
                <p><span className="text-muted-foreground">IBAN:</span> <span className="font-mono">{selectedMethod.iban}</span></p>
              )}
              {selectedMethod.instructions && (
                <p className="text-xs text-muted-foreground pt-1 border-t mt-2">{selectedMethod.instructions}</p>
              )}
              {selectedMethod.qr_image_url && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-1">Scan QR to pay:</p>
                  <img src={selectedMethod.qr_image_url} alt="Payment QR" className="h-32 w-32 rounded-md border bg-background" />
                </div>
              )}
            </div>
          )}

          {/* Proof + transaction */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="txn">Transaction ID (optional)</Label>
              <Input id="txn" placeholder="e.g. TXN12345" value={txnId} onChange={e => setTxnId(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proof">Payment Proof (screenshot) *</Label>
              <label
                htmlFor="proof"
                className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-muted/40 transition-colors"
              >
                <UploadCloud className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {proofFile ? proofFile.name : 'Click to upload screenshot'}
                </span>
                <input
                  id="proof"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => setProofFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setSelectedPlan(null); setSelectedMethodId(null); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={uploading || createReq.isPending || !selectedMethod}>
              {uploading || createReq.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</> : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
