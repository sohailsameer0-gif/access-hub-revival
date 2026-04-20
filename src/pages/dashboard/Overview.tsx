import { useOutlet, useMenuItems, useTables, useOrders } from '@/hooks/useData';
import { useResolvedSubscription } from '@/hooks/useSubscription';
import { PLAN_LABEL } from '@/lib/plans';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Store, UtensilsCrossed, TableProperties, ShoppingCart, AlertTriangle, ArrowRight, Crown } from 'lucide-react';
import SupportContactCard from '@/components/outlet/SupportContactCard';

export default function DashboardOverview() {
  const { data: outlet, isLoading } = useOutlet();
  const resolved = useResolvedSubscription(outlet?.id);
  const sub = resolved.data;
  const { data: items } = useMenuItems(outlet?.id);
  const { data: tables } = useTables(outlet?.id);
  const { data: orders } = useOrders(outlet?.id);
  const navigate = useNavigate();

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-32 rounded-xl bg-muted" /><div className="h-32 rounded-xl bg-muted" /></div>;

  if (!outlet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <Store className="h-16 w-16 text-muted-foreground" />
        <h2 className="font-heading text-2xl font-bold text-foreground">Set Up Your Outlet</h2>
        <p className="text-muted-foreground max-w-md">Create your outlet profile to get started with your digital menu and QR ordering system.</p>
        <Button variant="hero" size="lg" onClick={() => navigate('/outlet/profile')}>
          Create Outlet <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    );
  }

  const limits = sub?.limits;
  const itemsLimit = limits?.maxMenuItems ?? 0;
  const tablesLimit = limits?.maxTables ?? 0;

  const stats = [
    { label: 'Menu Items', value: items?.length ?? 0, icon: UtensilsCrossed, limit: itemsLimit > 0 ? itemsLimit : null },
    { label: 'Tables', value: tables?.length ?? 0, icon: TableProperties, limit: tablesLimit > 0 ? tablesLimit : null },
    { label: 'Total Orders', value: orders?.length ?? 0, icon: ShoppingCart, limit: null as number | null },
  ];

  const pendingOrders = orders?.filter(o => o.status === 'pending').length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {outlet.name}</p>
      </div>

      {sub?.isDemo && sub.isExpired && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-destructive">Your free trial has expired</p>
              <p className="text-sm text-muted-foreground">Upgrade to a paid plan to keep using all features.</p>
            </div>
            <Button variant="hero" size="sm" onClick={() => navigate('/outlet/subscribe')}>
              <Crown className="h-4 w-4 mr-1" /> Upgrade Now
            </Button>
          </CardContent>
        </Card>
      )}

      {sub?.isDemo && !sub.isExpired && (
        <Card className="border-primary/20 bg-accent">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-primary text-primary-foreground font-heading font-bold shrink-0">{sub.daysLeft}</div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Free Trial Active</p>
              <p className="text-sm text-muted-foreground">
                {sub.daysLeft} day{sub.daysLeft === 1 ? '' : 's'} remaining
                {itemsLimit > 0 && ` · ${items?.length ?? 0}/${itemsLimit} items`}
                {tablesLimit > 0 && ` · ${tables?.length ?? 0}/${tablesLimit} tables`}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate('/outlet/subscribe')}>
              <Crown className="h-4 w-4 mr-1" /> Upgrade
            </Button>
          </CardContent>
        </Card>
      )}

      {sub?.isPaid && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-3 py-4">
            <Crown className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-foreground">{PLAN_LABEL[sub.plan]} Plan Active</p>
              <p className="text-sm text-muted-foreground">
                {sub.paid_until
                  ? `Renews on ${new Date(sub.paid_until).toLocaleDateString()} · ${sub.daysLeft} day${sub.daysLeft === 1 ? '' : 's'} left`
                  : 'All features included in your plan are unlocked.'}
              </p>
            </div>
            {sub.paid_until && sub.daysLeft <= 7 && (
              <Button size="sm" variant="outline" onClick={() => navigate('/outlet/subscribe')}>
                <Crown className="h-4 w-4 mr-1" /> Renew
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {sub?.isPaidExpired && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-destructive">Your subscription has expired</p>
              <p className="text-sm text-muted-foreground">Renew now to restore full access to your outlet.</p>
            </div>
            <Button variant="hero" size="sm" onClick={() => navigate('/outlet/subscribe')}>
              <Crown className="h-4 w-4 mr-1" /> Renew Now
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(s => (
          <Card key={s.label} className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-heading text-foreground">
                {s.value}{s.limit ? <span className="text-sm text-muted-foreground font-normal">/{s.limit}</span> : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {pendingOrders > 0 && (
        <Card className="border-secondary/30 bg-secondary/5 shadow-card cursor-pointer hover:shadow-card-hover transition-shadow" onClick={() => navigate('/outlet/orders')}>
          <CardContent className="flex items-center gap-3 py-4">
            <ShoppingCart className="h-5 w-5 text-secondary" />
            <div className="flex-1">
              <p className="font-medium text-foreground">{pendingOrders} Pending Order{pendingOrders > 1 ? 's' : ''}</p>
              <p className="text-sm text-muted-foreground">Tap to view and manage orders</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      )}

      <SupportContactCard />
    </div>
  );
}
