import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Banknote, CheckCircle } from 'lucide-react';

interface CashConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  grandTotal: number;
  cashHandlingMode: string | null;
  onConfirm: (amountReceived: number, changeReturned: number) => void;
  submitting?: boolean;
}

export default function CashConfirmationDialog({
  open, onClose, grandTotal, cashHandlingMode, onConfirm, submitting
}: CashConfirmationDialogProps) {
  const [amountReceived, setAmountReceived] = useState<string>(grandTotal.toString());
  const changeReturned = Math.max(0, Number(amountReceived || 0) - grandTotal);

  const modeLabel = cashHandlingMode === 'waiter' ? 'Paid via Waiter' : 'Paid at Counter';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            Confirm Cash Payment
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Mode</span>
              <span className="font-medium text-foreground">{modeLabel}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span>Grand Total</span>
              <span className="text-primary">Rs. {grandTotal.toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount-received">Amount Received from Customer</Label>
            <Input
              id="amount-received"
              type="number"
              min={grandTotal}
              value={amountReceived}
              onChange={e => setAmountReceived(e.target.value)}
              placeholder={`Min Rs. ${grandTotal}`}
              className="text-lg font-bold"
            />
          </div>

          <div className="bg-accent/30 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-foreground">Change to Return</span>
              <span className="text-lg font-extrabold text-primary">Rs. {changeReturned.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onConfirm(Number(amountReceived || 0), changeReturned)}
            disabled={submitting || Number(amountReceived || 0) < grandTotal}
            className="gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            {submitting ? 'Confirming...' : 'Confirm Cash Received'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
