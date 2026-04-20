import { useState } from 'react';
import { useAdminOutlets, useUpdateSubscriptionAdmin } from '@/hooks/useAdminData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdminPlans() {
  const { data: outlets, isLoading } = useAdminOutlets();
  const updateSub = useUpdateSubscriptionAdmin();
  const [editing, setEditing] = useState<any | null>(null);
  const [plan, setPlan] = useState<'free_demo' | 'basic' | 'standard' | 'pro'>('basic');
  const [status, setStatus] = useState<'active' | 'paid_active' | 'expired' | 'suspended'>('paid_active');
  const [extendDays, setExtendDays] = useState('30');

  const openEdit = (sub: any) => {
    setEditing(sub);
    setPlan(sub.plan);
    setStatus(sub.status);
    setExtendDays('30');
  };

  const handleSave = async () => {
    if (!editing) return;
    const newEnd = new Date(Date.now() + Number(extendDays || 0) * 24 * 60 * 60 * 1000).toISOString();
    await updateSub.mutateAsync({ id: editing.id, plan, status, demo_end_date: newEnd });
    toast.success('Subscription updated');
    setEditing(null);
  };

  const handleMarkExpired = async (sub: any) => {
    await updateSub.mutateAsync({ id: sub.id, status: 'expired' });
    toast.success('Marked expired');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">Plans & Subscriptions</h1>
        <p className="text-muted-foreground text-sm">Activate, extend or downgrade outlet plans</p>
      </div>

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
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Demo Ends</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(outlets ?? []).map((o: any) => {
                    const sub = o.subscriptions?.[0];
                    if (!sub) return null;
                    return (
                      <TableRow key={o.id}>
                        <TableCell>
                          <p className="font-medium">{o.name}</p>
                          <p className="text-xs text-muted-foreground">{o.slug}</p>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{sub.plan.replace('_', ' ')}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={sub.status === 'paid_active' ? 'default' : sub.status === 'suspended' ? 'destructive' : 'outline'} className={sub.status === 'paid_active' ? 'bg-green-600 hover:bg-green-600' : ''}>
                            {sub.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell><span className="text-xs text-muted-foreground">{sub.demo_end_date ? format(new Date(sub.demo_end_date), 'dd MMM yyyy') : '—'}</span></TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="outline" onClick={() => openEdit(sub)}>Manage</Button>
                            {sub.plan === 'free_demo' && sub.status !== 'expired' && (
                              <Button size="sm" variant="ghost" onClick={() => handleMarkExpired(sub)}>Mark Expired</Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={v => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Subscription</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={plan} onValueChange={v => setPlan(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free_demo">Free Trial</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="pro">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={v => setStatus(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active (demo)</SelectItem>
                  <SelectItem value="paid_active">Paid Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Extend by (days from today)</Label>
              <Input type="number" value={extendDays} onChange={e => setExtendDays(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
