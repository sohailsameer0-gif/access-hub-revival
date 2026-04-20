import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, ScrollText } from 'lucide-react';
import { format } from 'date-fns';

const actionVariant: Record<string, string> = {
  'outlet.approve': 'bg-green-600 hover:bg-green-600',
  'outlet.reject': 'bg-destructive',
  'outlet.suspend': 'bg-destructive',
  'outlet.reactivate': 'bg-green-600 hover:bg-green-600',
  'payment.approve': 'bg-green-600 hover:bg-green-600',
  'payment.reject': 'bg-destructive',
  'subscription.request_submitted': 'bg-secondary',
  'payment_method.create': 'bg-primary',
  'payment_method.update': '',
  'payment_method.delete': 'bg-destructive',
};

export default function AdminActivityLogs() {
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin', 'activity_logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = (logs ?? []).filter((l: any) => {
    if (entityFilter !== 'all' && l.entity_type !== entityFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const blob = `${l.action} ${l.entity_label ?? ''} ${l.actor_email ?? ''}`.toLowerCase();
      if (!blob.includes(s)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 p-2 rounded-lg mt-1">
          <ScrollText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">Activity Logs</h1>
          <p className="text-muted-foreground text-sm">Immutable audit trail of admin actions</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search action, entity, or user..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-full md:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              <SelectItem value="outlet">Outlets</SelectItem>
              <SelectItem value="subscription">Subscriptions</SelectItem>
              <SelectItem value="payment">Payments</SelectItem>
              <SelectItem value="payment_method">Payment Methods</SelectItem>
              <SelectItem value="user">Users</SelectItem>
              <SelectItem value="platform_settings">Platform Settings</SelectItem>
            </SelectContent>
          </Select>
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
                    <TableHead>When</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <p className="text-xs">{format(new Date(l.created_at), 'dd MMM yyyy')}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(l.created_at), 'HH:mm:ss')}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs">{l.actor_email ?? <span className="font-mono">{l.actor_id?.slice(0, 8)}…</span>}</p>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${actionVariant[l.action] ?? ''}`} variant={actionVariant[l.action] ? 'default' : 'outline'}>
                          {l.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs capitalize text-muted-foreground">{l.entity_type.replace('_', ' ')}</p>
                        <p className="text-sm font-medium">{l.entity_label ?? '—'}</p>
                      </TableCell>
                      <TableCell>
                        {l.metadata && Object.keys(l.metadata).length > 0 ? (
                          <code className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                            {JSON.stringify(l.metadata)}
                          </code>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No activity recorded yet.
                      </TableCell>
                    </TableRow>
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
