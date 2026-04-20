import { useState } from 'react';
import { useAdminOrders, useAdminOutlets } from '@/hooks/useAdminData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminOrders() {
  const [outletId, setOutletId] = useState<string>('all');
  const [orderType, setOrderType] = useState<string>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data: outlets } = useAdminOutlets();
  const { data: orders, isLoading } = useAdminOrders({
    outletId: outletId === 'all' ? undefined : outletId,
    orderType: orderType === 'all' ? undefined : orderType,
    from: from ? new Date(from).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">Platform Orders</h1>
        <p className="text-muted-foreground text-sm">Read-only monitoring across all outlets</p>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <Select value={outletId} onValueChange={setOutletId}>
            <SelectTrigger><SelectValue placeholder="All outlets" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All outlets</SelectItem>
              {(outlets ?? []).map((o: any) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={orderType} onValueChange={setOrderType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="dine_in">Dine-in</SelectItem>
              <SelectItem value="takeaway">Takeaway</SelectItem>
              <SelectItem value="delivery">Delivery</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
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
                    <TableHead>Order ID</TableHead>
                    <TableHead>Outlet</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(orders ?? []).map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell><span className="font-mono text-xs">#{o.id.slice(0, 8)}</span></TableCell>
                      <TableCell><span className="text-sm">{o.outlets?.name ?? '—'}</span></TableCell>
                      <TableCell><Badge variant="outline" className="text-xs capitalize">{o.order_type.replace('_', ' ')}</Badge></TableCell>
                      <TableCell><span className="text-xs">{o.tables?.table_number ?? '—'}</span></TableCell>
                      <TableCell><Badge variant="outline" className="text-xs capitalize">{o.status.replace('_', ' ')}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={o.payment_status === 'paid' ? 'default' : 'outline'} className={`text-xs ${o.payment_status === 'paid' ? 'bg-green-600 hover:bg-green-600' : ''}`}>
                          {o.payment_status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell><span className="font-medium text-sm">Rs. {Number(o.total || 0).toLocaleString()}</span></TableCell>
                      <TableCell><span className="text-xs text-muted-foreground">{format(new Date(o.created_at), 'dd MMM HH:mm')}</span></TableCell>
                    </TableRow>
                  ))}
                  {(!orders || orders.length === 0) && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No orders found.</TableCell></TableRow>
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
