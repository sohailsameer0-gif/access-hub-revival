import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useOutlet } from '@/hooks/useData';
import { useResolvedSubscription } from '@/hooks/useSubscription';
import { PLAN_LABEL } from '@/lib/plans';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';
import { Button } from '@/components/ui/button';
import { UtensilsCrossed, LayoutDashboard, Store, UtensilsCrossed as MenuIcon, TableProperties, ShoppingCart, QrCode, CreditCard, Settings, LogOut, Menu, X, AlertTriangle, FileBarChart, Crown } from 'lucide-react';
import OutletNotificationBell from '@/components/outlet/OutletNotificationBell';
import SupportWhatsAppFab from '@/components/outlet/SupportWhatsAppFab';

const navItems = [
  { to: '/outlet', icon: LayoutDashboard, label: 'Overview', end: true },
  { to: '/outlet/profile', icon: Store, label: 'Outlet Profile' },
  { to: '/outlet/menu', icon: MenuIcon, label: 'Menu' },
  { to: '/outlet/tables', icon: TableProperties, label: 'Tables' },
  { to: '/outlet/orders', icon: ShoppingCart, label: 'Orders' },
  { to: '/outlet/qr', icon: QrCode, label: 'QR Codes' },
  { to: '/outlet/payments', icon: CreditCard, label: 'Payments' },
  { to: '/outlet/reports', icon: FileBarChart, label: 'Reports' },
  { to: '/outlet/subscribe', icon: Crown, label: 'Subscription' },
  { to: '/outlet/settings', icon: Settings, label: 'Settings' },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut } = useAuth();
  const { data: outlet } = useOutlet();
  const resolved = useResolvedSubscription(outlet?.id);
  const sub = resolved.data;
  const navigate = useNavigate();

  // Real-time order notifications with sound
  const { pendingCount } = useOrderNotifications(outlet?.id);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-background/95 backdrop-blur px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-muted">
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="font-heading font-bold text-foreground">MenuQR</span>
        </div>
        <div className="flex items-center gap-2">
          {sub?.isDemo && !sub.isExpired && (
            <span className="text-xs bg-secondary/10 text-secondary px-2 py-1 rounded-full font-medium">{sub.daysLeft}d left</span>
          )}
          {sub?.isPaid && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">{PLAN_LABEL[sub.plan]}</span>
          )}
          <OutletNotificationBell outletId={outlet?.id} />
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-card border-r transition-transform duration-200 lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex h-full flex-col">
            <div className="flex h-14 items-center gap-2 border-b px-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
                <UtensilsCrossed className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-heading font-bold text-foreground">MenuQR</span>
            </div>

            {sub?.isDemo && (
              <div className={`mx-3 mt-3 p-3 rounded-lg text-sm ${sub.isExpired ? 'bg-destructive/10 text-destructive' : 'bg-accent text-accent-foreground'}`}>
                {sub.isExpired ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /><span className="font-medium">Trial Expired</span></div>
                    <Button size="sm" variant="hero" className="w-full h-7 text-xs" onClick={() => { navigate('/outlet/subscribe'); setSidebarOpen(false); }}>Upgrade Now</Button>
                  </div>
                ) : (
                  <>
                    <p className="font-medium">Free Trial</p>
                    <p className="text-xs mt-0.5">{sub.daysLeft} day{sub.daysLeft === 1 ? '' : 's'} remaining</p>
                    <Button size="sm" variant="outline" className="w-full h-7 text-xs mt-2" onClick={() => { navigate('/outlet/subscribe'); setSidebarOpen(false); }}>Upgrade</Button>
                  </>
                )}
              </div>
            )}
            {sub?.isPaid && (
              <div className="mx-3 mt-3 p-3 rounded-lg text-sm bg-primary/10 text-primary">
                <div className="flex items-center gap-2"><Crown className="h-4 w-4" /><span className="font-medium">{PLAN_LABEL[sub.plan]} Plan</span></div>
                <p className="text-xs mt-0.5 text-muted-foreground">Active subscription</p>
              </div>
            )}

            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  {item.label === 'Orders' && pendingCount > 0 && (
                    <span className="ml-auto inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                      {pendingCount}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="border-t p-3">
              <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </Button>
            </div>
          </div>
        </aside>

        {/* Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-30 bg-foreground/20 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main content */}
        <main className="flex-1 min-h-screen">
          {/* Desktop top bar with notification bell */}
          <header className="hidden lg:flex sticky top-0 z-30 h-14 items-center justify-end gap-3 border-b bg-background/95 backdrop-blur px-6">
            {sub?.isDemo && !sub.isExpired && (
              <span className="text-xs bg-secondary/10 text-secondary px-2 py-1 rounded-full font-medium">{sub.daysLeft}d left</span>
            )}
            {sub?.isPaid && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">{PLAN_LABEL[sub.plan]}</span>
            )}
            <OutletNotificationBell outletId={outlet?.id} />
          </header>
          <div className="p-4 md:p-6 lg:p-8 max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
      <SupportWhatsAppFab prefilledMessage={outlet?.name ? `Hello Admin Support, I need help with my outlet "${outlet.name}".` : undefined} />
    </div>
  );
}
