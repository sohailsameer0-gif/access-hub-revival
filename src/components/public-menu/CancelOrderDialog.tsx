import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  orderIds: string[];
  onCancelled: () => void;
}

const REASONS = [
  'Changed my mind',
  'Wrong item ordered',
  'Taking too long',
  'Ordered by mistake',
  'Found a better option',
  'Other',
];

export default function CancelOrderDialog({ open, onClose, orderIds, onCancelled }: Props) {
  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) { toast.error('Please select a reason'); return; }
    if (reason === 'Other' && details.trim().length < 3) { toast.error('Please describe the reason'); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          cancellation_reason: reason,
          cancellation_reason_text: details.trim() || null,
          cancelled_by: 'customer',
          cancelled_at: new Date().toISOString(),
        } as any)
        .in('id', orderIds);
      if (error) throw error;
      toast.success('Order cancelled');
      onCancelled();
      onClose();
      setReason(''); setDetails('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to cancel');
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel order?</DialogTitle>
          <DialogDescription>This will cancel your current order. Please tell us why.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-sm">Reason *</Label>
            <div className="grid grid-cols-1 gap-1.5 mt-2">
              {REASONS.map(r => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`text-left text-sm rounded-lg border px-3 py-2 transition-colors ${reason === r ? 'border-primary bg-primary/5 font-semibold' : 'hover:bg-muted'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-sm">Details {reason === 'Other' ? '*' : '(optional)'}</Label>
            <Textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={300} rows={3} placeholder="Anything else?" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Keep Order</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={submitting || !reason}>
            {submitting ? 'Cancelling...' : 'Confirm Cancel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
