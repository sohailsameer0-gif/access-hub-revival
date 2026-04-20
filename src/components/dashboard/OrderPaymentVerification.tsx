import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, Image, CheckCircle, XCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PaymentProof {
  id: string;
  image_url: string;
}

interface OrderPayment {
  id: string;
  method: string;
  amount: number;
  status: string;
  created_at?: string | null;
  payment_proofs?: PaymentProof[];
}

interface OrderPaymentVerificationProps {
  payments: OrderPayment[];
  transactionId?: string | null;
  onApprove: (paymentId: string) => Promise<void>;
  onReject: (paymentId: string) => Promise<void>;
}

const statusLabelMap: Record<string, string> = {
  pending_verification: 'Pending Verify',
  paid: 'Verified',
  rejected: 'Rejected',
};

export default function OrderPaymentVerification({
  payments,
  transactionId,
  onApprove,
  onReject,
}: OrderPaymentVerificationProps) {
  const onlinePayments = payments
    .filter((payment) => payment.method !== 'cash')
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  if (onlinePayments.length === 0) return null;

  return (
    <div className="space-y-2">
      {onlinePayments.map((payment) => {
        const latestProof = payment.payment_proofs?.[payment.payment_proofs.length - 1] || null;

        return (
          <div key={payment.id} className="rounded-xl border border-border bg-secondary/5 p-3 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">Online Payment</Badge>
                <Badge
                  variant={
                    payment.status === 'paid'
                      ? 'default'
                      : payment.status === 'pending_verification'
                        ? 'secondary'
                        : 'destructive'
                  }
                >
                  {statusLabelMap[payment.status] || payment.status}
                </Badge>
              </div>
              {payment.created_at && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(payment.created_at), { addSuffix: true })}
                </span>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-3 text-xs text-muted-foreground">
              <p className="flex items-center gap-1">
                <CreditCard className="h-3.5 w-3.5" />
                {payment.method.replace('_', ' ')}
              </p>
              <p>Amount: Rs. {Number(payment.amount || 0).toLocaleString()}</p>
              {transactionId && <p className="font-mono">TRX: {transactionId}</p>}
            </div>

            {latestProof ? (
              <a
                href={latestProof.image_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                <Image className="h-3.5 w-3.5" /> View Payment Proof
              </a>
            ) : (
              <p className="text-xs text-destructive">Payment proof is missing for this submission.</p>
            )}

            {payment.status === 'pending_verification' && (
              <div className="flex gap-2 flex-wrap border-t pt-3">
                <Button size="sm" className="gap-1" onClick={() => onApprove(payment.id)}>
                  <CheckCircle className="h-3.5 w-3.5" /> Approve
                </Button>
                <Button size="sm" variant="destructive" className="gap-1" onClick={() => onReject(payment.id)}>
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}