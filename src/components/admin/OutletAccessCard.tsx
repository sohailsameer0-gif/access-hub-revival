import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, RefreshCw, Unlock, Copy, Check, KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logActivity } from '@/lib/activityLog';

interface AccessRow {
  status: 'pending' | 'approved' | 'rejected' | 'verified' | 'blocked';
  otp_plain_for_admin: string | null;
  otp_expires_at: string | null;
  otp_attempts: number;
  otp_max_attempts: number;
}

interface Props {
  outletId: string;
  outletName: string;
  onChanged?: () => void;
}

export default function OutletAccessCard({ outletId, outletName, onChanged }: Props) {
  const [row, setRow] = useState<AccessRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const fetchRow = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('outlet_access' as any)
      .select('status, otp_plain_for_admin, otp_expires_at, otp_attempts, otp_max_attempts')
      .eq('outlet_id', outletId)
      .maybeSingle();
    setRow((data as any) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    fetchRow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outletId]);

  const handleApprove = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc('admin_approve_outlet' as any, { _outlet_id: outletId });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${outletName} approved. Share the 6-digit code with the outlet.`);
    await logActivity({ action: 'outlet.access_approve' as any, entity_type: 'outlet', entity_id: outletId, entity_label: outletName });
    fetchRow();
    onChanged?.();
  };

  const handleReject = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('admin_reject_outlet' as any, { _outlet_id: outletId, _reason: rejectReason || null });
    setBusy(false);
    if (error) return toast.error(error.message);
    setRejectOpen(false);
    setRejectReason('');
    toast.success(`${outletName} rejected.`);
    await logActivity({ action: 'outlet.access_reject' as any, entity_type: 'outlet', entity_id: outletId, entity_label: outletName, metadata: { reason: rejectReason } });
    fetchRow();
    onChanged?.();
  };

  const handleRegenerate = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('admin_regenerate_outlet_otp' as any, { _outlet_id: outletId });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('New code generated.');
    await logActivity({ action: 'outlet.otp_regenerate' as any, entity_type: 'outlet', entity_id: outletId, entity_label: outletName });
    fetchRow();
    onChanged?.();
  };

  const copyCode = () => {
    if (!row?.otp_plain_for_admin) return;
    navigator.clipboard.writeText(row.otp_plain_for_admin);
    setCopied(true);
    toast.success('Code copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const statusBadge = () => {
    const s = row?.status ?? 'pending';
    const variants: Record<string, { cls: string; label: string }> = {
      pending: { cls: 'border-amber-500 text-amber-700', label: 'Pending review' },
      approved: { cls: 'border-blue-500 text-blue-700', label: 'Awaiting OTP' },
      verified: { cls: 'bg-green-600 hover:bg-green-600 text-white border-transparent', label: 'Verified' },
      rejected: { cls: 'bg-destructive text-destructive-foreground border-transparent', label: 'Rejected' },
      blocked: { cls: 'bg-destructive text-destructive-foreground border-transparent', label: 'Blocked' },
    };
    const v = variants[s];
    return <Badge variant="outline" className={v.cls}>{v.label}</Badge>;
  };

  if (loading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (!row) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <div className="space-y-2 min-w-[220px]">
      <div className="flex items-center gap-2 flex-wrap">
        {statusBadge()}
        {row.status === 'approved' && row.otp_attempts > 0 && (
          <span className="text-[10px] text-muted-foreground">{row.otp_attempts}/{row.otp_max_attempts} wrong</span>
        )}
      </div>

      {(row.status === 'approved' && row.otp_plain_for_admin) && (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-2 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] uppercase text-muted-foreground font-semibold">
            <KeyRound className="h-3 w-3" /> Verification code
          </div>
          <div className="flex items-center gap-2">
            <code className="text-base font-mono font-bold tracking-[0.25em] text-foreground">{row.otp_plain_for_admin}</code>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={copyCode}>
              {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
          {row.otp_expires_at && (
            <div className="text-[10px] text-muted-foreground">Expires {new Date(row.otp_expires_at).toLocaleString()}</div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {row.status === 'pending' && (
          <>
            <Button size="sm" disabled={busy} onClick={handleApprove}>
              <CheckCircle2 className="h-3 w-3 mr-1" />Approve
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setRejectOpen(true)}>
              <XCircle className="h-3 w-3 mr-1" />Reject
            </Button>
          </>
        )}
        {row.status === 'approved' && (
          <Button size="sm" variant="outline" disabled={busy} onClick={handleRegenerate}>
            <RefreshCw className="h-3 w-3 mr-1" />New code
          </Button>
        )}
        {row.status === 'blocked' && (
          <Button size="sm" disabled={busy} onClick={handleRegenerate}>
            <Unlock className="h-3 w-3 mr-1" />Unblock & new code
          </Button>
        )}
        {row.status === 'rejected' && (
          <Button size="sm" variant="outline" disabled={busy} onClick={handleApprove}>
            <CheckCircle2 className="h-3 w-3 mr-1" />Approve
          </Button>
        )}
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {outletName}?</DialogTitle>
            <DialogDescription>
              The outlet will see this reason on their verification screen. They will not be able to access the panel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Input id="reason" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="e.g. Incomplete profile information" maxLength={200} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={busy} onClick={handleReject}>Reject outlet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
