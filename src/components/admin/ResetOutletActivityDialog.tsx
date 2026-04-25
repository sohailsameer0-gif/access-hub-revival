import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Eraser, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const TYPES: { id: string; label: string; description: string }[] = [
  { id: 'orders', label: 'Orders', description: 'All orders, order items, payments and bill requests for this outlet.' },
  { id: 'payments', label: 'Payments only', description: 'Standalone payments + proofs (skip if Orders is checked).' },
  { id: 'plan_requests', label: 'Plan Requests', description: 'Subscription requests submitted by this outlet.' },
  { id: 'activity_logs', label: 'Activity Logs', description: 'Audit log entries that reference this outlet.' },
];

interface Props {
  outletId: string;
  outletName: string;
  trigger?: React.ReactNode;
}

export default function ResetOutletActivityDialog({ outletId, outletName, trigger }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setSelected({}); setReason(''); };

  const toggle = (id: string) => setSelected(s => ({ ...s, [id]: !s[id] }));

  const trimmedReason = reason.trim();
  const selectedTypes = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
  const canSubmit = selectedTypes.length > 0 && trimmedReason.length >= 3 && !submitting;

  const handleSubmit = async () => {
    if (selectedTypes.length === 0) {
      toast.error('Select at least one data type to clear');
      return;
    }
    if (trimmedReason.length < 3) {
      toast.error('Please enter a reason (minimum 3 characters)');
      return;
    }
    const types = selectedTypes;
    setSubmitting(true);
    try {
      const { data, error } = await (supabase as any).rpc('admin_reset_outlet_activity', {
        _outlet_id: outletId,
        _types: types,
        _reason: trimmedReason,
      });
      if (error) {
        // Surface the real Postgres error so admin sees the root cause
        throw new Error(error.message || 'Reset failed');
      }
      if (!data?.ok) throw new Error(data?.message ?? 'Reset failed');
      toast.success(`Activity cleared for ${outletName}`);
      qc.invalidateQueries({ queryKey: ['admin'] });
      qc.invalidateQueries({ queryKey: ['admin', 'activity_resets'] });
      qc.invalidateQueries({ queryKey: ['admin', 'outlets'] });
      setOpen(false);
      reset();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to reset activity');
    } finally {
      setSubmitting(false);
    }
  };

  const trimmedLen = trimmedReason.length;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="text-destructive">
            <Eraser className="h-3 w-3 mr-1" /> Reset Activity
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" /> Reset activity for {outletName}
          </DialogTitle>
          <DialogDescription>
            This permanently deletes the selected activity data. The outlet profile, menu, tables and subscription are NOT touched.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm font-medium text-foreground">Select data to clear</p>
          <div className="space-y-2">
            {TYPES.map(t => (
              <label
                key={t.id}
                htmlFor={`reset-${t.id}`}
                className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-accent/40"
              >
                <Checkbox
                  id={`reset-${t.id}`}
                  checked={!!selected[t.id]}
                  onCheckedChange={() => toggle(t.id)}
                />
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="space-y-1.5 pt-2">
            <Label htmlFor="reset-reason">Reason (shown to outlet)</Label>
            <Textarea
              id="reset-reason"
              rows={3}
              placeholder="e.g. Test data cleared at owner request."
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
            <p className={`text-xs ${trimmedLen >= 3 ? 'text-muted-foreground' : 'text-destructive'}`}>
              {trimmedLen}/3 characters minimum
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Clearing…</> : 'Clear data'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
