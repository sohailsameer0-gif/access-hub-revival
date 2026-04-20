import { useState } from 'react';
import { useAdminPlanRequests, useUpdatePlanRequest } from '@/hooks/useSubscription';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ExternalLink, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PLAN_LABEL, type PlanKey } from '@/lib/plans';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function AdminPlanRequests() {
  const { data: requests, isLoading } = useAdminPlanRequests();
  const update = useUpdatePlanRequest();
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  const list = (requests ?? []).filter(r => filter === 'all' ? true : r.status === filter);

  const openProof = async (path: string) => {
    const { data } = await supabase.storage.from('payment-proofs').createSignedUrl(path, 60 * 5);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    else toast.error('Could not open proof');
  };

  const handleApprove = async (id: string) => {
    await update.mutateAsync({ id, status: 'approved' });
    toast.success('Request approved — outlet plan activated');
  };

  const handleReject = async (id: string) => {
    await update.mutateAsync({ id, status: 'rejected' });
    toast.success('Request rejected');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">Plan Requests</h1>
          <p className="text-muted-foreground text-sm">Review and approve subscription upgrade requests from outlets</p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'default' : 'outline'}
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : list.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No {filter === 'all' ? '' : filter} requests</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Outlet</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Renewal Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <p className="font-medium">{r.outlets?.name ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">{r.outlets?.slug}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{PLAN_LABEL[r.requested_plan as PlanKey]}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">Rs. {Number(r.amount).toLocaleString()}</TableCell>
                      <TableCell className="text-xs capitalize">{r.method?.replace('_', ' ') ?? '—'}{r.transaction_id ? ` · ${r.transaction_id}` : ''}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(r.created_at), 'dd MMM, HH:mm')}</TableCell>
                      <TableCell>
                        <Badge
                          variant={r.status === 'approved' ? 'default' : r.status === 'rejected' ? 'destructive' : 'outline'}
                          className={r.status === 'approved' ? 'bg-green-600 hover:bg-green-600' : ''}
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
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
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          {r.proof_url && (
                            <Button size="sm" variant="ghost" onClick={() => openProof(r.proof_url)} title="View proof">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          {r.status === 'pending' && (
                            <>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" className="bg-green-600 hover:bg-green-700"><Check className="h-4 w-4" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Approve subscription?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This activates {PLAN_LABEL[r.requested_plan as PlanKey]} plan for {r.outlets?.name}. Status will become Paid Active.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleApprove(r.id)}>Approve</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              <Button size="sm" variant="destructive" onClick={() => handleReject(r.id)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
