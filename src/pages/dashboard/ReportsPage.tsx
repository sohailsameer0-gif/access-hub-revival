import { useState, useMemo } from 'react';
import { useOutlet, useOrders } from '@/hooks/useData';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, startOfDay, endOfDay, isWithinInterval, parseISO, isSameDay } from 'date-fns';
import { CalendarIcon, DollarSign, ShoppingCart, CreditCard, TrendingUp, UtensilsCrossed, Truck, ShoppingBag, Download, Filter, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

function useOutletPayments(outletId?: string) {
  return useQuery({
    queryKey: ['outlet_payments', outletId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, orders(id, order_type, customer_name, table_id, created_at, total, status)')
        .eq('outlet_id', outletId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Cast to include cash fields
      return (data || []) as (typeof data extends (infer T)[] ? T & { cash_handling_mode?: string | null; amount_received?: number | null; change_returned?: number | null } : never)[];
    },
    enabled: !!outletId,
  });
}

type DateRange = { from: Date; to?: Date };

export default function ReportsPage() {
  const { data: outlet } = useOutlet();
  const { data: orders } = useOrders(outlet?.id);
  const { data: payments } = useOutletPayments(outlet?.id);

  const [dateRange, setDateRange] = useState<DateRange>({ from: new Date(), to: new Date() });
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [filterOrderType, setFilterOrderType] = useState<string>('all');
  const [calendarOpen, setCalendarOpen] = useState(false);

  const rangeFrom = useMemo(() => startOfDay(dateRange.from), [dateRange.from]);
  const rangeTo = useMemo(() => endOfDay(dateRange.to || dateRange.from), [dateRange.to, dateRange.from]);

  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    return payments.filter(p => {
      const date = parseISO(p.created_at!);
      if (!isWithinInterval(date, { start: rangeFrom, end: rangeTo })) return false;
      if (filterMethod !== 'all' && p.method !== filterMethod) return false;
      const orderType = (p.orders as any)?.order_type || 'dine_in';
      if (filterOrderType !== 'all' && orderType !== filterOrderType) return false;
      return true;
    });
  }, [payments, rangeFrom, rangeTo, filterMethod, filterOrderType]);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(o => {
      const date = parseISO(o.created_at!);
      if (!isWithinInterval(date, { start: rangeFrom, end: rangeTo })) return false;
      if (filterOrderType !== 'all' && (o as any).order_type !== filterOrderType) return false;
      // Exclude cancelled orders from main reports — shown separately
      if ((o as any).status === 'cancelled') return false;
      return true;
    });
  }, [orders, rangeFrom, rangeTo, filterOrderType]);

  const cancelledOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(o => {
      if ((o as any).status !== 'cancelled') return false;
      const dateStr = (o as any).cancelled_at || o.created_at;
      const date = parseISO(dateStr!);
      if (!isWithinInterval(date, { start: rangeFrom, end: rangeTo })) return false;
      if (filterOrderType !== 'all' && (o as any).order_type !== filterOrderType) return false;
      return true;
    });
  }, [orders, rangeFrom, rangeTo, filterOrderType]);

  if (!outlet) return <p className="text-muted-foreground">Please set up your outlet first.</p>;

  const paidPayments = filteredPayments.filter(p => p.status === 'paid');
  const pendingPayments = filteredPayments.filter(p => p.status === 'pending_verification');
  const unpaidPayments = filteredPayments.filter(p => p.status === 'unpaid');

  const totalCollection = paidPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const cashCollection = paidPayments.filter(p => p.method === 'cash').reduce((s, p) => s + Number(p.amount || 0), 0);
  const onlineCollection = paidPayments.filter(p => p.method !== 'cash').reduce((s, p) => s + Number(p.amount || 0), 0);
  const pendingAmount = pendingPayments.reduce((s, p) => s + Number(p.amount || 0), 0) + unpaidPayments.reduce((s, p) => s + Number(p.amount || 0), 0);

  const totalOrders = filteredOrders.length;
  const paidOrdersCount = filteredOrders.filter(o => o.payment_status === 'paid').length;
  const pendingOrdersCount = filteredOrders.filter(o => o.payment_status !== 'paid').length;

  // Order type breakdown
  const dineInCount = filteredOrders.filter(o => (o as any).order_type === 'dine_in').length;
  const takeawayCount = filteredOrders.filter(o => (o as any).order_type === 'takeaway').length;
  const deliveryCount = filteredOrders.filter(o => (o as any).order_type === 'delivery').length;

  // Payment method breakdown
  const methodBreakdown = {
    cash: paidPayments.filter(p => p.method === 'cash').reduce((s, p) => s + Number(p.amount), 0),
    bank_transfer: paidPayments.filter(p => p.method === 'bank_transfer').reduce((s, p) => s + Number(p.amount), 0),
    jazzcash: paidPayments.filter(p => p.method === 'jazzcash').reduce((s, p) => s + Number(p.amount), 0),
    easypaisa: paidPayments.filter(p => p.method === 'easypaisa').reduce((s, p) => s + Number(p.amount), 0),
  };

  const dateWiseData = (() => {
    const map = new Map<string, { paid: number; count: number; cash: number; online: number }>();
    paidPayments.forEach(p => {
      const key = format(parseISO(p.created_at!), 'yyyy-MM-dd');
      const existing = map.get(key) || { paid: 0, count: 0, cash: 0, online: 0 };
      existing.paid += Number(p.amount);
      existing.count += 1;
      if (p.method === 'cash') existing.cash += Number(p.amount);
      else existing.online += Number(p.amount);
      map.set(key, existing);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, data]) => ({ date, ...data }));
  })();

  const dateLabel = dateRange.to && !isSameDay(dateRange.from, dateRange.to)
    ? `${format(dateRange.from, 'dd MMM yyyy')} - ${format(dateRange.to, 'dd MMM yyyy')}`
    : format(dateRange.from, 'dd MMM yyyy');

  const handleExport = () => {
    const rows = [
      ['Date', 'Total Collection', 'Paid Orders', 'Cash', 'Online'],
      ...dateWiseData.map(d => [d.date, d.paid.toString(), d.count.toString(), d.cash.toString(), d.online.toString()]),
      ['', '', '', '', ''],
      ['Summary', '', '', '', ''],
      ['Total Collection', totalCollection.toString()],
      ['Cash Collection', cashCollection.toString()],
      ['Online Collection', onlineCollection.toString()],
      ['Pending Amount', pendingAmount.toString()],
      ['Total Orders', totalOrders.toString()],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `collection-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Reports & Collection</h1>
          <p className="text-muted-foreground">Daily collection and history reporting</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Filters:</span>
            </div>

            {/* Date Picker */}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-sm">
                  <CalendarIcon className="h-4 w-4" />
                  {dateLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range: any) => {
                    if (range?.from) {
                      setDateRange({ from: range.from, to: range.to || range.from });
                      if (range.to) setCalendarOpen(false);
                    }
                  }}
                  numberOfMonths={1}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            {/* Quick date buttons */}
            <div className="flex gap-1 flex-wrap">
              <Button variant="ghost" size="sm" onClick={() => setDateRange({ from: new Date(), to: new Date() })}>Today</Button>
              <Button variant="ghost" size="sm" onClick={() => {
                const d = new Date(); d.setDate(d.getDate() - 1);
                setDateRange({ from: d, to: d });
              }}>Yesterday</Button>
              <Button variant="ghost" size="sm" onClick={() => {
                const d = new Date(); d.setDate(d.getDate() - 7);
                setDateRange({ from: d, to: new Date() });
              }}>Last 7 days</Button>
              <Button variant="ghost" size="sm" onClick={() => {
                const d = new Date(); d.setDate(d.getDate() - 30);
                setDateRange({ from: d, to: new Date() });
              }}>Last 30 days</Button>
            </div>

            {/* Payment method filter */}
            <Select value={filterMethod} onValueChange={setFilterMethod}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Payment Method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="jazzcash">JazzCash</SelectItem>
                <SelectItem value="easypaisa">Easypaisa</SelectItem>
              </SelectContent>
            </Select>

            {/* Order type filter */}
            <Select value={filterOrderType} onValueChange={setFilterOrderType}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Order Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="dine_in">Dine-in</SelectItem>
                <SelectItem value="takeaway">Takeaway</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card className="shadow-card">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">Total Collection</p>
            </div>
            <p className="text-xl font-bold font-heading text-foreground">Rs. {totalCollection.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">Cash</p>
            </div>
            <p className="text-xl font-bold font-heading text-foreground">Rs. {cashCollection.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
            <p className="text-xl font-bold font-heading text-foreground">Rs. {onlineCollection.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-destructive" />
              <p className="text-xs text-muted-foreground">Pending/Unpaid</p>
            </div>
            <p className="text-xl font-bold font-heading text-destructive">Rs. {pendingAmount.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">Total Orders</p>
            </div>
            <p className="text-xl font-bold font-heading text-foreground">{totalOrders}</p>
            <p className="text-xs text-muted-foreground">{paidOrdersCount} paid · {pendingOrdersCount} pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Order Type Breakdown */}
      <div className="grid gap-4 grid-cols-3">
        <Card className="shadow-card">
          <CardContent className="py-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <UtensilsCrossed className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Dine-in</p>
              <p className="text-lg font-bold text-foreground">{dineInCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="py-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center">
              <ShoppingBag className="h-4 w-4 text-accent-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Takeaway</p>
              <p className="text-lg font-bold text-foreground">{takeawayCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="py-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-secondary/10 flex items-center justify-center">
              <Truck className="h-4 w-4 text-secondary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Delivery</p>
              <p className="text-lg font-bold text-foreground">{deliveryCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Daily Breakdown + Payment Details */}
      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily">Daily Breakdown</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="methods">Method Breakdown</TabsTrigger>
          <TabsTrigger value="cancelled" className="gap-1">
            <XCircle className="h-3.5 w-3.5" /> Cancelled ({cancelledOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Date-wise Collection</CardTitle>
            </CardHeader>
            <CardContent>
              {dateWiseData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No paid collection data for this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Cash</TableHead>
                        <TableHead className="text-right">Online</TableHead>
                        <TableHead className="text-right">Paid Orders</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dateWiseData.map(row => (
                        <TableRow key={row.date}>
                          <TableCell className="font-medium">{format(parseISO(row.date), 'dd MMM yyyy')}</TableCell>
                          <TableCell className="text-right font-semibold">Rs. {row.paid.toLocaleString()}</TableCell>
                          <TableCell className="text-right">Rs. {row.cash.toLocaleString()}</TableCell>
                          <TableCell className="text-right">Rs. {row.online.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{row.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Payment Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredPayments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No payments found for this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Received</TableHead>
                        <TableHead className="text-right">Change</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map(p => {
                        const orderType = (p.orders as any)?.order_type || 'dine_in';
                        const methodLabels: Record<string, string> = { cash: 'Cash', bank_transfer: 'Bank', jazzcash: 'JazzCash', easypaisa: 'Easypaisa' };
                        const typeLabels: Record<string, string> = { dine_in: 'Dine-in', takeaway: 'Takeaway', delivery: 'Delivery' };
                        const cashMode = (p as any).cash_handling_mode;
                        const modeLabel = cashMode === 'waiter' ? 'Waiter' : cashMode === 'counter' ? 'Counter' : '—';
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="text-sm">{format(parseISO(p.created_at!), 'dd MMM yyyy, hh:mm a')}</TableCell>
                            <TableCell className="text-sm font-mono">#{p.order_id.slice(0, 8)}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{typeLabels[orderType] || orderType}</Badge></TableCell>
                            <TableCell className="text-sm">{methodLabels[p.method || ''] || p.method || '—'}</TableCell>
                            <TableCell className="text-sm">{modeLabel}</TableCell>
                            <TableCell className="text-right font-semibold">Rs. {Number(p.amount).toLocaleString()}</TableCell>
                            <TableCell className="text-right text-sm">{(p as any).amount_received != null ? `Rs. ${Number((p as any).amount_received).toLocaleString()}` : '—'}</TableCell>
                            <TableCell className="text-right text-sm">{(p as any).change_returned != null ? `Rs. ${Number((p as any).change_returned).toLocaleString()}` : '—'}</TableCell>
                            <TableCell>
                              <Badge variant={p.status === 'paid' ? 'default' : 'outline'} className="text-xs">
                                {p.status === 'paid' ? 'Paid' : p.status === 'pending_verification' ? 'Pending' : 'Unpaid'}
                              </Badge>
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
        </TabsContent>

        <TabsContent value="methods">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Payment Method Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {Object.entries(methodBreakdown).map(([method, amount]) => {
                  const labels: Record<string, string> = { cash: 'Cash', bank_transfer: 'Bank Transfer', jazzcash: 'JazzCash', easypaisa: 'Easypaisa' };
                  return (
                    <div key={method} className="rounded-lg border p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-1">{labels[method]}</p>
                      <p className="text-xl font-bold text-foreground">Rs. {amount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {paidPayments.filter(p => p.method === method).length} transactions
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cancelled">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                Cancelled Orders ({cancelledOrders.length})
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Orders cancelled by customer or staff. Excluded from collection totals.
              </p>
            </CardHeader>
            <CardContent>
              {cancelledOrders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No cancelled orders in this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Cancelled At</TableHead>
                        <TableHead>Cancelled By</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead className="text-right">Order Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cancelledOrders.map((o: any) => {
                        const typeLabels: Record<string, string> = { dine_in: 'Dine-in', takeaway: 'Takeaway', delivery: 'Delivery' };
                        const cancelledAt = o.cancelled_at || o.updated_at || o.created_at;
                        const reasonText = o.cancellation_reason_text || o.cancellation_reason || '—';
                        return (
                          <TableRow key={o.id}>
                            <TableCell className="font-mono text-xs">#{o.id.slice(0, 8)}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{typeLabels[o.order_type] || o.order_type}</Badge></TableCell>
                            <TableCell className="text-sm">{o.customer_name || '—'}</TableCell>
                            <TableCell className="text-sm">{format(parseISO(cancelledAt), 'dd MMM yyyy, hh:mm a')}</TableCell>
                            <TableCell className="text-sm capitalize">{o.cancelled_by || '—'}</TableCell>
                            <TableCell className="text-sm max-w-[240px] truncate" title={reasonText}>{reasonText}</TableCell>
                            <TableCell className="text-right font-medium line-through text-muted-foreground">Rs. {Number(o.total || 0).toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs border-destructive/40 text-destructive">Cancelled</Badge>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
