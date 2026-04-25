import { useState } from 'react';
import { useOutlet } from '@/hooks/useData';
import { useStaff, useCreateStaff, useUpdateStaff, useDeleteStaff, type StaffRole } from '@/hooks/useStaff';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Bike, UserCheck, Plus, Pencil, Trash2, Phone } from 'lucide-react';
import { toast } from 'sonner';

export default function StaffManagement() {
  const { data: outlet } = useOutlet();
  const [tab, setTab] = useState<StaffRole>('rider');
  const { data: staff } = useStaff(outlet?.id, tab);
  const create = useCreateStaff();
  const update = useUpdateStaff();
  const del = useDeleteStaff();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<{ id?: string; name: string; phone: string; notes: string } | null>(null);

  const openNew = () => { setEditing({ name: '', phone: '', notes: '' }); setDialogOpen(true); };
  const openEdit = (s: any) => { setEditing({ id: s.id, name: s.name, phone: s.phone || '', notes: s.notes || '' }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!editing || !editing.name.trim()) { toast.error('Name is required'); return; }
    try {
      if (editing.id) {
        await update.mutateAsync({ id: editing.id, name: editing.name.trim(), phone: editing.phone.trim(), notes: editing.notes.trim() });
        toast.success(`${tab === 'rider' ? 'Rider' : 'Waiter'} updated`);
      } else {
        await create.mutateAsync({ outlet_id: outlet!.id, role: tab, name: editing.name.trim(), phone: editing.phone.trim(), notes: editing.notes.trim() });
        toast.success(`${tab === 'rider' ? 'Rider' : 'Waiter'} added`);
      }
      setDialogOpen(false); setEditing(null);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this staff member? Past orders assigned to them will keep their name on record.')) return;
    try { await del.mutateAsync(id); toast.success('Removed'); } catch (e: any) { toast.error(e.message); }
  };

  const handleToggleActive = async (s: any) => {
    try { await update.mutateAsync({ id: s.id, is_active: !s.is_active }); } catch (e: any) { toast.error(e.message); }
  };

  if (!outlet) return <p className="text-muted-foreground">Please set up your outlet first.</p>;

  const Icon = tab === 'rider' ? Bike : UserCheck;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Staff</h1>
        <p className="text-muted-foreground">Manage your riders and waiters. Assign them to orders from the Orders page.</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as StaffRole)}>
        <TabsList>
          <TabsTrigger value="rider" className="gap-2"><Bike className="h-4 w-4" /> Riders</TabsTrigger>
          <TabsTrigger value="waiter" className="gap-2"><UserCheck className="h-4 w-4" /> Waiters</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Add {tab === 'rider' ? 'Rider' : 'Waiter'}</Button>
          </div>

          {(!staff || staff.length === 0) ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Icon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No {tab === 'rider' ? 'riders' : 'waiters'} added yet.</p>
            </CardContent></Card>
          ) : (
            <div className="grid gap-3">
              {staff.map((s) => (
                <Card key={s.id} className={!s.is_active ? 'opacity-60' : ''}>
                  <CardContent className="py-4 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground truncate">{s.name}</p>
                          {!s.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                        </div>
                        {s.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {s.phone}</p>}
                        {s.notes && <p className="text-xs text-muted-foreground mt-0.5">{s.notes}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        Active <Switch checked={s.is_active} onCheckedChange={() => handleToggleActive(s)} />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit' : 'Add'} {tab === 'rider' ? 'Rider' : 'Waiter'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Name *</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Full name" /></div>
              <div><Label>Phone</Label><Input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} placeholder="03XX-XXXXXXX" /></div>
              <div><Label>Notes</Label><Input value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} placeholder="Optional" /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={create.isPending || update.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
