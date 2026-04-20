import { useAdminStats, useAdminAnalytics } from '@/hooks/useAdminData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Store, CheckCircle2, Clock, Ban, Sparkles, Crown,
  ShoppingBag, Wallet, AlertCircle, Loader2,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend,
} from 'recharts';

const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--muted-foreground))', 'hsl(var(--destructive))'];

export default function AdminDashboard() {
  const { data: stats, isLoading } = useAdminStats();
  const { data: analytics, isLoading: analyticsLoading } = useAdminAnalytics();

  if (isLoading || !stats) {
    return (
      <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
    );
  }

  const cards = [
    { label: 'Total Outlets', value: stats.totalOutlets, icon: Store, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Active Outlets', value: stats.activeOutlets, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Pending Approval', value: stats.pendingApproval, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Suspended', value: stats.suspendedOutlets, icon: Ban, color: 'text-destructive', bg: 'bg-destructive/10' },
    { label: 'Demo Users', value: stats.demoUsers, icon: Sparkles, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Paid Users', value: stats.paidUsers, icon: Crown, color: 'text-secondary', bg: 'bg-secondary/10' },
    { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingBag, color: 'text-foreground', bg: 'bg-muted' },
    { label: 'Total Collection', value: `Rs. ${stats.totalCollection.toLocaleString()}`, icon: Wallet, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Pending Payments', value: stats.pendingPaymentVerifications, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Platform overview & key metrics</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {cards.map(c => (
          <Card key={c.label} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 md:p-5">
              <div className={`inline-flex p-2 rounded-lg ${c.bg} mb-3`}>
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </div>
              <p className="text-xs text-muted-foreground font-medium">{c.label}</p>
              <p className="text-xl md:text-2xl font-bold text-foreground mt-1">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Revenue & Orders — Last 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading || !analytics ? (
              <div className="h-72 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : (
              <ResponsiveContainer width="100%" height={288}>
                <AreaChart data={analytics.revenueSeries}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#rev)" strokeWidth={2} name="Revenue (Rs.)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subscription Mix</CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsLoading || !analytics ? (
              <div className="h-72 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : analytics.planMix.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">No subscriptions yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={288}>
                <PieChart>
                  <Pie data={analytics.planMix} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {analytics.planMix.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Orders by Status — Last 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          {analyticsLoading || !analytics ? (
            <div className="h-64 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : analytics.ordersByStatus.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No orders yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={analytics.ordersByStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
