import { useAdminUsers, useUpdateOutletAdmin } from '@/hooks/useAdminData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Ban, Play } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdminUsers() {
  const { data: users, isLoading } = useAdminUsers();
  const updateOutlet = useUpdateOutletAdmin();

  const handleSuspendUser = async (userId: string, outlets: any[]) => {
    for (const o of outlets) {
      await updateOutlet.mutateAsync({ id: o.id, suspended: true });
    }
    toast.success('User suspended');
  };
  const handleReactivateUser = async (userId: string, outlets: any[]) => {
    for (const o of outlets) {
      await updateOutlet.mutateAsync({ id: o.id, suspended: false });
    }
    toast.success('User reactivated');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">Users</h1>
        <p className="text-muted-foreground text-sm">All platform user accounts</p>
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
                    <TableHead>User ID</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Outlets</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(users ?? []).map((u: any) => {
                    const allSuspended = u.outlets.length > 0 && u.outlets.every((o: any) => o.suspended);
                    return (
                      <TableRow key={u.user_id}>
                        <TableCell><span className="font-mono text-xs">{u.user_id.slice(0, 8)}…</span></TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {u.roles.map((r: string) => <Badge key={r} variant="outline" className="text-xs capitalize">{r.replace('_', ' ')}</Badge>)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {u.outlets.length === 0 ? <span className="text-xs text-muted-foreground">—</span> : (
                            <div className="space-y-0.5">
                              {u.outlets.map((o: any) => (
                                <p key={o.id} className="text-xs">{o.name} {o.phone && <span className="text-muted-foreground">· {o.phone}</span>}</p>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {allSuspended ? <Badge variant="destructive">Suspended</Badge> : <Badge variant="default" className="bg-green-600 hover:bg-green-600">Active</Badge>}
                        </TableCell>
                        <TableCell><span className="text-xs text-muted-foreground">{u.created_at ? format(new Date(u.created_at), 'dd MMM yyyy') : '—'}</span></TableCell>
                        <TableCell className="text-right">
                          {u.outlets.length > 0 && (
                            allSuspended
                              ? <Button size="sm" onClick={() => handleReactivateUser(u.user_id, u.outlets)}><Play className="h-3 w-3 mr-1" />Reactivate</Button>
                              : <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleSuspendUser(u.user_id, u.outlets)}><Ban className="h-3 w-3 mr-1" />Suspend</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!users || users.length === 0) && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No users found.</TableCell></TableRow>
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
