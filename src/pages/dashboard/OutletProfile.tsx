import { useState, useEffect } from 'react';
import { useOutlet, useCreateOutlet, useUpdateOutlet } from '@/hooks/useData';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import OutletImageUpload from '@/components/outlet/OutletImageUpload';
import { useQueryClient } from '@tanstack/react-query';

const businessTypes = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'fast_food', label: 'Fast Food' },
  { value: 'cafe', label: 'Cafe' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'other', label: 'Other' },
] as const;

export default function OutletProfile() {
  const { data: outlet, isLoading } = useOutlet();
  const createOutlet = useCreateOutlet();
  const updateOutlet = useUpdateOutlet();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    name: '', slug: '', description: '', address: '', city: '',
    phone: '', whatsapp: '', google_maps_link: '', business_type: 'restaurant' as const,
    logo_url: '' as string, cover_image_url: '' as string,
  });

  // Settings form — includes ordering, billing, AND payment info (all stored in outlet_settings)
  const [settings, setSettings] = useState({
    tax_rate: '0',
    service_charge_rate: '0',
    enable_delivery: true,
    enable_takeaway: true,
    delivery_charge: '0',
    bank_name: '',
    bank_account_title: '',
    bank_account_number: '',
    bank_iban: '',
    jazzcash_title: '',
    jazzcash_number: '',
    easypaisa_title: '',
    easypaisa_number: '',
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsInitialized, setSettingsInitialized] = useState(false);

  const isEdit = !!outlet;

  useEffect(() => {
    if (outlet) {
      setForm({
        name: outlet.name || '',
        slug: outlet.slug || '',
        description: outlet.description || '',
        address: outlet.address || '',
        city: outlet.city || '',
        phone: outlet.phone || '',
        whatsapp: outlet.whatsapp || '',
        google_maps_link: outlet.google_maps_link || '',
        business_type: (outlet.business_type as any) || 'restaurant',
        logo_url: outlet.logo_url || '',
        cover_image_url: outlet.cover_image_url || '',
      });
    }
  }, [outlet]);

  // Sync settings from outlet_settings (loaded via join)
  useEffect(() => {
    if (!outlet) return;
    const s = (outlet as any).outlet_settings?.[0] || (outlet as any).outlet_settings;
    if (s && !settingsInitialized) {
      setSettings({
        tax_rate: s.tax_rate?.toString() || '0',
        service_charge_rate: s.service_charge_rate?.toString() || '0',
        enable_delivery: s.enable_delivery ?? true,
        enable_takeaway: s.enable_takeaway ?? true,
        delivery_charge: s.delivery_charge?.toString() || '0',
        bank_name: s.bank_name || '',
        bank_account_title: s.bank_account_title || '',
        bank_account_number: s.bank_account_number || '',
        bank_iban: s.bank_iban || '',
        jazzcash_title: s.jazzcash_title || '',
        jazzcash_number: s.jazzcash_number || '',
        easypaisa_title: s.easypaisa_title || '',
        easypaisa_number: s.easypaisa_number || '',
      });
      setSettingsInitialized(true);
    }
  }, [outlet, settingsInitialized]);

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await updateOutlet.mutateAsync({ id: outlet.id, ...form } as any);
        toast.success('Outlet updated!');
      } else {
        await createOutlet.mutateAsync(form as any);
        toast.success('Outlet created! Your 7-day free demo has started.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    }
  };

  const handleImageUpdate = async (field: 'logo_url' | 'cover_image_url', url: string) => {
    setForm(f => ({ ...f, [field]: url }));
    if (isEdit) {
      try { await updateOutlet.mutateAsync({ id: outlet.id, [field]: url }); } catch {}
    }
  };

  const handleImageRemove = async (field: 'logo_url' | 'cover_image_url') => {
    setForm(f => ({ ...f, [field]: '' }));
    if (isEdit) {
      try { await updateOutlet.mutateAsync({ id: outlet.id, [field]: null as any }); } catch {}
    }
  };

  const handleSaveSettings = async () => {
    if (!outlet) return;
    setSavingSettings(true);
    const payload = {
      outlet_id: outlet.id,
      tax_rate: Number(settings.tax_rate) || 0,
      service_charge_rate: Number(settings.service_charge_rate) || 0,
      enable_delivery: settings.enable_delivery,
      enable_takeaway: settings.enable_takeaway,
      delivery_charge: Number(settings.delivery_charge) || 0,
      bank_name: settings.bank_name,
      bank_account_title: settings.bank_account_title,
      bank_account_number: settings.bank_account_number,
      bank_iban: settings.bank_iban,
      jazzcash_title: settings.jazzcash_title,
      jazzcash_number: settings.jazzcash_number,
      easypaisa_title: settings.easypaisa_title,
      easypaisa_number: settings.easypaisa_number,
    };
    const { error } = await supabase.from('outlet_settings').upsert(payload as any, { onConflict: 'outlet_id' });
    setSavingSettings(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Settings saved!');
      setSettingsInitialized(false);
      qc.invalidateQueries({ queryKey: ['outlet'] });
    }
  };

  if (isLoading) return <div className="animate-pulse h-96 rounded-xl bg-muted" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Outlet Profile</h1>
        <p className="text-muted-foreground">{isEdit ? 'Update your outlet details' : 'Set up your outlet to get started'}</p>
      </div>

      {/* Branding Section */}
      {isEdit && (
        <Card className="shadow-card">
          <CardHeader><CardTitle className="font-heading">Branding & Images</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <OutletImageUpload currentUrl={form.cover_image_url || null} outletId={outlet.id} type="cover" onUploaded={url => handleImageUpdate('cover_image_url', url)} onRemoved={() => handleImageRemove('cover_image_url')} />
            <OutletImageUpload currentUrl={form.logo_url || null} outletId={outlet.id} type="logo" onUploaded={url => handleImageUpdate('logo_url', url)} onRemoved={() => handleImageRemove('logo_url')} />
          </CardContent>
        </Card>
      )}

      <Card className="shadow-card">
        <CardHeader><CardTitle className="font-heading">Outlet Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Outlet Name *</Label>
                <Input value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value, slug: isEdit ? f.slug : generateSlug(e.target.value) })); }} required />
              </div>
              <div className="space-y-2">
                <Label>URL Slug *</Label>
                <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} required disabled={isEdit} />
                <p className="text-xs text-muted-foreground">menuqr.pk/menu/{form.slug || 'your-outlet'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Business Type *</Label>
              <Select value={form.business_type} onValueChange={(v: any) => setForm(f => ({ ...f, business_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {businessTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Tell customers about your outlet..." />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Lahore, Karachi, Islamabad..." />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+92 300 1234567" />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp Number</Label>
                <Input value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="+92 300 1234567" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Google Maps Link</Label>
              <Input value={form.google_maps_link} onChange={e => setForm(f => ({ ...f, google_maps_link: e.target.value }))} placeholder="https://maps.google.com/..." />
            </div>

            <Button type="submit" variant="hero" disabled={createOutlet.isPending || updateOutlet.isPending}>
              {createOutlet.isPending || updateOutlet.isPending ? 'Saving...' : isEdit ? 'Update Outlet' : 'Create Outlet'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Only show settings cards when outlet exists */}
      {isEdit && (
        <>
          {/* Ordering & Billing */}
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-heading">Ordering & Billing</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">🛵 Enable Delivery</p>
                    <p className="text-xs text-muted-foreground">Allow customers to order delivery</p>
                  </div>
                  <Switch checked={settings.enable_delivery} onCheckedChange={v => setSettings(s => ({ ...s, enable_delivery: v }))} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">🛍️ Enable Takeaway</p>
                    <p className="text-xs text-muted-foreground">Allow customers to pick up orders</p>
                  </div>
                  <Switch checked={settings.enable_takeaway} onCheckedChange={v => setSettings(s => ({ ...s, enable_takeaway: v }))} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Delivery Charges (Rs.)</Label>
                  <Input type="number" value={settings.delivery_charge} onChange={e => setSettings(s => ({ ...s, delivery_charge: e.target.value }))} min="0" />
                </div>
                <div className="space-y-2">
                  <Label>Tax %</Label>
                  <Input type="number" value={settings.tax_rate} onChange={e => setSettings(s => ({ ...s, tax_rate: e.target.value }))} min="0" max="100" />
                </div>
                <div className="space-y-2">
                  <Label>Service Charge %</Label>
                  <Input type="number" value={settings.service_charge_rate} onChange={e => setSettings(s => ({ ...s, service_charge_rate: e.target.value }))} min="0" max="100" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card className="shadow-card">
            <CardHeader><CardTitle className="font-heading">Payment Information</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-muted-foreground">These details are shown to customers when they choose online payment. Only configured methods will appear.</p>

              {/* Bank Transfer */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">🏦 Bank Transfer</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Bank Name</Label>
                    <Input value={settings.bank_name} onChange={e => setSettings(s => ({ ...s, bank_name: e.target.value }))} placeholder="HBL, Meezan, UBL..." />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Account Title</Label>
                    <Input value={settings.bank_account_title} onChange={e => setSettings(s => ({ ...s, bank_account_title: e.target.value }))} placeholder="Muhammad Ali" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Account Number</Label>
                    <Input value={settings.bank_account_number} onChange={e => setSettings(s => ({ ...s, bank_account_number: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">IBAN (optional)</Label>
                    <Input value={settings.bank_iban} onChange={e => setSettings(s => ({ ...s, bank_iban: e.target.value }))} placeholder="PK..." />
                  </div>
                </div>
              </div>

              {/* JazzCash */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">📲 JazzCash</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Account Title</Label>
                    <Input value={settings.jazzcash_title} onChange={e => setSettings(s => ({ ...s, jazzcash_title: e.target.value }))} placeholder="Muhammad Ali" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">JazzCash Number</Label>
                    <Input value={settings.jazzcash_number} onChange={e => setSettings(s => ({ ...s, jazzcash_number: e.target.value }))} placeholder="03001234567" />
                  </div>
                </div>
              </div>

              {/* EasyPaisa */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">📱 EasyPaisa</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Account Title</Label>
                    <Input value={settings.easypaisa_title} onChange={e => setSettings(s => ({ ...s, easypaisa_title: e.target.value }))} placeholder="Muhammad Ali" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">EasyPaisa Number</Label>
                    <Input value={settings.easypaisa_number} onChange={e => setSettings(s => ({ ...s, easypaisa_number: e.target.value }))} placeholder="03001234567" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save all settings */}
          <Button onClick={handleSaveSettings} disabled={savingSettings} className="w-full sm:w-auto">
            {savingSettings ? 'Saving...' : 'Save All Settings'}
          </Button>
        </>
      )}
    </div>
  );
}
