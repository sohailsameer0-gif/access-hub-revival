import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAdminOutlets, useUpdateOutletAdmin, useUpdateSubscriptionAdmin } from '@/hooks/useAdminData';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle, Ban, Play, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import OutletAccessCard from '@/components/admin/OutletAccessCard';
import ResetOutletActivityDialog from '@/components/admin/ResetOutletActivityDialog';

export default function AdminOutlets() {
  const { data: outlets, isLoading } = useAdminOutlets();
  const updateOutlet = useUpdateOutletAdmin();
  const updateSub = useUpdateSubscriptionAdmin();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const refreshNotifications = () => qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });

  const filtered = (outlets ?? []).filter((o: any) => {
    if (search && !o.name.toLowerCase().includes(search.toLowerCase()) && !o.slug.includes(search.toLowerCase())) return false;
    if (statusFilter === 'pending' && o.approval_status !== 'pending') return false;
    if (statusFilter === 'approved' && (o.approval_status !== 'approved' || o.suspended)) return false;
    if (statusFilter === 'suspended' && !o.suspended) return false;
    if (statusFilter === 'rejected' && o.approval_status !== 'rejected') return false;
    return true;
  });

  const handleApprove = async (o: any) => {
    await updateOutlet.mutateAsync({ id: o.id, approval_status: 'approved', suspended: false, is_active: true });
    toast.success(`${o.name} approved`);
  };
  const handleReject = async (o: any) => {
    await updateOutlet.mutateAsync({ id: o.id, approval_status: 'rejected', is_active: false });
    toast.success(`${o.name} rejected`);
  };
  const handleSuspend = async (o: any) => {
    const reason = window.prompt(
      `Suspend ${o.name}?\n\nThis will block the outlet from accessing the platform. Optionally enter a reason that will be shown to the owner:`,
      ''
    );
    if (reason === null) return; // user cancelled
    await updateOutlet.mutateAsync({
      id: o.id,
      suspended: true,
      suspended_reason: reason.trim() || null,
    });
    // subscription status is auto-mirrored by DB trigger; no manual update needed
    toast.success(`${o.name} suspended`);
  };
  const handleReactivate = async (o: any) => {
    await updateOutlet.mutateAsync({
      id: o.id,
      suspended: false,
      is_active: true,
      suspended_reason: null,
    });
    // subscription status is auto-restored by DB trigger
    toast.success(`${o.name} reactivated`);
  };

  const statusBadge = (o: any) => {
    if (o.suspended) return <Badge variant="destructive">Suspended</Badge>;
    if (o.approval_status === 'pending') return <Badge variant="outline" className="border-amber-500 text-amber-700">Pending</Badge>;
    if (o.approval_status === 'rejected') return <Badge variant="destructive">Rejected</Badge>;
    return <Badge variant="default" className="bg-green-600 hover:bg-green-600">Active</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">Outlets</h1>
        <p className="text-muted-foreground text-sm">Manage all platform outlets</p>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name or slug..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
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
                    <TableHead>Type</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Access / OTP</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((o: any) => {
                    const sub = o.subscriptions?.[0];
                    return (
                      <TableRow key={o.id}>
                        <TableCell>
                          <p className="font-medium text-foreground">{o.name}</p>
                          <p className="text-xs text-muted-foreground">{o.slug} · {o.city || '—'} · {o.phone || '—'}</p>
                        </TableCell>
                        <TableCell><span className="text-xs capitalize">{o.business_type}</span></TableCell>
                        <TableCell>
                          {sub && <Badge variant="outline" className="text-xs">{sub.plan} · {sub.status}</Badge>}
                        </TableCell>
                        <TableCell>{statusBadge(o)}</TableCell>
                        <TableCell>
                          <OutletAccessCard outletId={o.id} outletName={o.name} onChanged={refreshNotifications} />
                        </TableCell>
                        <TableCell><span className="text-xs text-muted-foreground">{format(new Date(o.created_at), 'dd MMM yyyy')}</span></TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1 flex-wrap">
                            {o.approval_status === 'pending' && (
                              <>
                                <Button size="sm" onClick={() => handleApprove(o)}><CheckCircle2 className="h-3 w-3 mr-1" />Approve</Button>
                                <Button size="sm" variant="outline" onClick={() => handleReject(o)}><XCircle className="h-3 w-3 mr-1" />Reject</Button>
                              </>
                            )}
                            {o.approval_status === 'approved' && !o.suspended && (
                              <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleSuspend(o)}><Ban className="h-3 w-3 mr-1" />Suspend</Button>
                            )}
                            {o.suspended && (
                              <Button size="sm" onClick={() => handleReactivate(o)}><Play className="h-3 w-3 mr-1" />Reactivate</Button>
                            )}
                            <ResetOutletActivityDialog outletId={o.id} outletName={o.name} />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No outlets found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
