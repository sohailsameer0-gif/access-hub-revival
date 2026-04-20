import { useState } from 'react';
import {
  useAllPaymentMethods,
  useUpsertPaymentMethod,
  useDeletePaymentMethod,
  useTogglePaymentMethod,
  type AdminPaymentMethod,
} from '@/hooks/useAdminPaymentMethods';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Plus, Pencil, Trash2, Loader2, Building2, Smartphone, Wallet, UploadCloud, X,
} from 'lucide-react';
import { toast } from 'sonner';

const TYPE_META: Record<string, { label: string; icon: typeof Building2 }> = {
  bank_transfer: { label: 'Bank Transfer', icon: Building2 },
  jazzcash: { label: 'JazzCash', icon: Smartphone },
  easypaisa: { label: 'EasyPaisa', icon: Smartphone },
  other: { label: 'Other', icon: Wallet },
};

const emptyForm = {
  id: undefined as string | undefined,
  type: 'bank_transfer',
  label: '',
  account_title: '',
  account_number: '',
  iban: '',
  bank_name: '',
  instructions: '',
  qr_image_url: '',
  is_active: true,
  sort_order: 0,
};

export default function AdminPaymentMethods() {
  const { data: methods, isLoading } = useAllPaymentMethods();
  const upsert = useUpsertPaymentMethod();
  const remove = useDeletePaymentMethod();
  const toggle = useTogglePaymentMethod();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);

  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }));

  const openNew = () => { setForm(emptyForm); setOpen(true); };
  const openEdit = (m: AdminPaymentMethod) => {
    setForm({
      id: m.id,
      type: m.type,
      label: m.label,
      account_title: m.account_title ?? '',
      account_number: m.account_number ?? '',
      iban: m.iban ?? '',
      bank_name: m.bank_name ?? '',
      instructions: m.instructions ?? '',
      qr_image_url: m.qr_image_url ?? '',
      is_active: m.is_active,
      sort_order: m.sort_order,
    });
    setOpen(true);
  };

  const handleQrUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'png';
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('admin-payment-qr')
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('admin-payment-qr').getPublicUrl(path);
      set('qr_image_url', data.publicUrl);
      toast.success('QR uploaded');
    } catch (err: any) {
      toast.error(err.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.label.trim()) {
      toast.error('Label is required');
      return;
    }
    try {
      await upsert.mutateAsync({
        ...form,
        sort_order: Number(form.sort_order) || 0,
      } as any);
      toast.success(form.id ? 'Method updated' : 'Method added');
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message ?? 'Save failed');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove.mutateAsync(id);
      toast.success('Method deleted');
    } catch (err: any) {
      toast.error(err.message ?? 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">Payment Methods</h1>
          <p className="text-muted-foreground text-sm">
            Configure the receiving accounts outlets see when paying for a subscription. At least one active method is required.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Add Method
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (methods?.length ?? 0) === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground text-sm">
          No payment methods configured yet. Add one so outlets can subscribe.
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {methods!.map(m => {
            const meta = TYPE_META[m.type] ?? TYPE_META.other;
            const Icon = meta.icon;
            return (
              <Card key={m.id} className={!m.is_active ? 'opacity-60' : ''}>
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{m.label}</CardTitle>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">{meta.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={m.is_active ? 'default' : 'outline'} className={m.is_active ? 'bg-green-600 hover:bg-green-600' : ''}>
                      {m.is_active ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {m.account_title && <p><span className="text-muted-foreground">Title:</span> {m.account_title}</p>}
                  {m.account_number && <p><span className="text-muted-foreground">Account:</span> {m.account_number}</p>}
                  {m.bank_name && <p><span className="text-muted-foreground">Bank:</span> {m.bank_name}</p>}
                  {m.iban && <p><span className="text-muted-foreground">IBAN:</span> {m.iban}</p>}
                  {m.qr_image_url && (
                    <img src={m.qr_image_url} alt="QR" className="h-20 w-20 rounded-md border object-cover" />
                  )}
                  <div className="flex items-center justify-between gap-2 pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={m.is_active}
                        onCheckedChange={v => toggle.mutate({ id: m.id, is_active: v })}
                      />
                      <span className="text-xs text-muted-foreground">Enabled</span>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(m)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete payment method?</AlertDialogTitle>
                            <AlertDialogDescription>
                              "{m.label}" will be removed permanently. Outlets can no longer choose it.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(m.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit payment method' : 'Add payment method'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => set('type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="jazzcash">JazzCash</SelectItem>
                    <SelectItem value="easypaisa">EasyPaisa</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Label *</Label>
                <Input value={form.label} onChange={e => set('label', e.target.value)} placeholder="e.g. HBL Bank" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Account Title</Label>
                <Input value={form.account_title} onChange={e => set('account_title', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Account Number</Label>
                <Input value={form.account_number} onChange={e => set('account_number', e.target.value)} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Bank Name</Label>
                <Input value={form.bank_name} onChange={e => set('bank_name', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>IBAN</Label>
                <Input value={form.iban} onChange={e => set('iban', e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Instructions (shown to outlets)</Label>
              <Textarea
                rows={3}
                value={form.instructions}
                onChange={e => set('instructions', e.target.value)}
                placeholder="e.g. Please send the screenshot of the receipt right after payment."
              />
            </div>
            <div className="space-y-1.5">
              <Label>QR Code Image (optional)</Label>
              {form.qr_image_url ? (
                <div className="relative inline-block">
                  <img src={form.qr_image_url} alt="QR" className="h-32 w-32 rounded-md border object-cover" />
                  <button
                    type="button"
                    onClick={() => set('qr_image_url', '')}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="qr-upload"
                  className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-sm text-muted-foreground">{uploading ? 'Uploading…' : 'Upload QR image'}</span>
                  <input
                    id="qr-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleQrUpload(f); }}
                  />
                </label>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={e => set('sort_order', e.target.value)} />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <Label>Active</Label>
                <Switch checked={form.is_active} onCheckedChange={v => set('is_active', v)} />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsert.isPending}>
              {upsert.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
