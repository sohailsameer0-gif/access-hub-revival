import { useEffect, useState } from 'react';
import { usePlatformSettings, useUpdatePlatformSettings } from '@/hooks/useAdminData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader2, Save, MessageCircle, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettings() {
  const { data: settings, isLoading } = usePlatformSettings();
  const update = useUpdatePlatformSettings();

  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (settings) setForm({ ...settings });
  }, [settings]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!settings) return;
    await update.mutateAsync({
      id: settings.id,
      demo_duration_days: Number(form.demo_duration_days),
      basic_plan_price: Number(form.basic_plan_price),
      standard_plan_price: Number(form.standard_plan_price),
      pro_plan_price: Number(form.pro_plan_price),
      enable_demo_signup: !!form.enable_demo_signup,
      auto_approve_subscriptions: !!form.auto_approve_subscriptions,
      demo_max_menu_items: Number(form.demo_max_menu_items),
      demo_max_tables: Number(form.demo_max_tables),
      basic_max_menu_items: Number(form.basic_max_menu_items),
      basic_max_tables: Number(form.basic_max_tables),
      basic_enable_delivery: !!form.basic_enable_delivery,
      basic_enable_reports: !!form.basic_enable_reports,
      standard_max_menu_items: Number(form.standard_max_menu_items),
      standard_max_tables: Number(form.standard_max_tables),
      standard_enable_delivery: !!form.standard_enable_delivery,
      standard_enable_reports: !!form.standard_enable_reports,
      premium_max_menu_items: Number(form.premium_max_menu_items),
      premium_max_tables: Number(form.premium_max_tables),
      premium_enable_delivery: !!form.premium_enable_delivery,
      premium_enable_reports: !!form.premium_enable_reports,
      premium_enable_branding: !!form.premium_enable_branding,
      support_whatsapp: (form.support_whatsapp ?? '').trim(),
      support_email: (form.support_email ?? '').trim(),
    } as any);
    toast.success('Platform settings saved');
  };

  if (isLoading || !settings) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">Platform Settings</h1>
        <p className="text-muted-foreground text-sm">Global controls for plan pricing, limits and features. Changes apply to all outlets immediately.</p>
      </div>

      {/* Support Contact */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-primary" /> Support Contact</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">These are shown to all outlet owners as the official admin support contact.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp Number</Label>
              <Input placeholder="+92 300 1234567" value={form.support_whatsapp ?? ''} onChange={e => set('support_whatsapp', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Support Email</Label>
              <Input placeholder="support@example.com" value={form.support_email ?? ''} onChange={e => set('support_email', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Approval */}
      <Card>
        <CardHeader><CardTitle>Subscription Approval</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm">Auto-approve subscription requests</Label>
              <p className="text-xs text-muted-foreground">
                When ON, every plan request is approved instantly without admin review. Recommended OFF for real money.
              </p>
            </div>
            <Switch
              checked={!!form.auto_approve_subscriptions}
              onCheckedChange={v => set('auto_approve_subscriptions', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Free Trial */}
      <Card>
        <CardHeader><CardTitle>Free Trial</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm">Allow Trial Signup</Label>
              <p className="text-xs text-muted-foreground">New outlets start with a free trial automatically</p>
            </div>
            <Switch checked={!!form.enable_demo_signup} onCheckedChange={v => set('enable_demo_signup', v)} />
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Trial Duration (days)</Label>
              <Input type="number" min={1} value={form.demo_duration_days ?? ''} onChange={e => set('demo_duration_days', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Max Menu Items</Label>
              <Input type="number" min={0} value={form.demo_max_menu_items ?? ''} onChange={e => set('demo_max_menu_items', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Max Tables</Label>
              <Input type="number" min={0} value={form.demo_max_tables ?? ''} onChange={e => set('demo_max_tables', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic */}
      <Card>
        <CardHeader><CardTitle>Basic Plan</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Price (PKR / month)</Label>
              <Input type="number" min={0} value={form.basic_plan_price ?? ''} onChange={e => set('basic_plan_price', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Max Menu Items <span className="text-xs text-muted-foreground">(0 = unlimited)</span></Label>
              <Input type="number" min={0} value={form.basic_max_menu_items ?? ''} onChange={e => set('basic_max_menu_items', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Max Tables <span className="text-xs text-muted-foreground">(0 = unlimited)</span></Label>
              <Input type="number" min={0} value={form.basic_max_tables ?? ''} onChange={e => set('basic_max_tables', e.target.value)} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <Label>Enable Delivery Orders</Label>
              <Switch checked={!!form.basic_enable_delivery} onCheckedChange={v => set('basic_enable_delivery', v)} />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <Label>Enable Reports</Label>
              <Switch checked={!!form.basic_enable_reports} onCheckedChange={v => set('basic_enable_reports', v)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Standard */}
      <Card>
        <CardHeader><CardTitle>Standard Plan</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Price (PKR / month)</Label>
              <Input type="number" min={0} value={form.standard_plan_price ?? ''} onChange={e => set('standard_plan_price', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Max Menu Items <span className="text-xs text-muted-foreground">(0 = unlimited)</span></Label>
              <Input type="number" min={0} value={form.standard_max_menu_items ?? ''} onChange={e => set('standard_max_menu_items', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Max Tables <span className="text-xs text-muted-foreground">(0 = unlimited)</span></Label>
              <Input type="number" min={0} value={form.standard_max_tables ?? ''} onChange={e => set('standard_max_tables', e.target.value)} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <Label>Enable Delivery Orders</Label>
              <Switch checked={!!form.standard_enable_delivery} onCheckedChange={v => set('standard_enable_delivery', v)} />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <Label>Enable Reports</Label>
              <Switch checked={!!form.standard_enable_reports} onCheckedChange={v => set('standard_enable_reports', v)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Premium */}
      <Card>
        <CardHeader><CardTitle>Premium Plan</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Price (PKR / month)</Label>
              <Input type="number" min={0} value={form.pro_plan_price ?? ''} onChange={e => set('pro_plan_price', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Max Menu Items <span className="text-xs text-muted-foreground">(0 = unlimited)</span></Label>
              <Input type="number" min={0} value={form.premium_max_menu_items ?? ''} onChange={e => set('premium_max_menu_items', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Max Tables <span className="text-xs text-muted-foreground">(0 = unlimited)</span></Label>
              <Input type="number" min={0} value={form.premium_max_tables ?? ''} onChange={e => set('premium_max_tables', e.target.value)} />
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <Label>Enable Delivery</Label>
              <Switch checked={!!form.premium_enable_delivery} onCheckedChange={v => set('premium_enable_delivery', v)} />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <Label>Enable Reports</Label>
              <Switch checked={!!form.premium_enable_reports} onCheckedChange={v => set('premium_enable_reports', v)} />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <Label>Custom Branding</Label>
              <Switch checked={!!form.premium_enable_branding} onCheckedChange={v => set('premium_enable_branding', v)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={update.isPending} className="gap-2">
        <Save className="h-4 w-4" /> {update.isPending ? 'Saving...' : 'Save All Settings'}
      </Button>
    </div>
  );
}
