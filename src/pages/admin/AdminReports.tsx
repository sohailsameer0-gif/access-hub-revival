import { useMemo } from 'react';
import { useAdminPayments } from '@/hooks/useAdminData';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Wallet, Banknote, Smartphone } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminReports() {
  const { data: payments, isLoading } = useAdminPayments();

  const stats = useMemo(() => {
    const paid = (payments ?? []).filter((p: any) => p.status === 'paid');
    const total = paid.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const cash = paid.filter((p: any) => p.method === 'cash').reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const online = total - cash;
    const unpaid = (payments ?? []).filter((p: any) => p.status !== 'paid').reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

    // by date
    const byDate: Record<string, number> = {};
    paid.forEach((p: any) => {
      const d = format(new Date(p.created_at), 'dd MMM yyyy');
      byDate[d] = (byDate[d] || 0) + Number(p.amount || 0);
    });

    // by outlet
    const byOutlet: Record<string, number> = {};
    paid.forEach((p: any) => {
      const name = p.outlets?.name ?? 'Unknown';
      byOutlet[name] = (byOutlet[name] || 0) + Number(p.amount || 0);
    });

    return { total, cash, online, unpaid, byDate, byOutlet };
  }, [payments]);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">Platform Reports</h1>
        <p className="text-muted-foreground text-sm">Collection summary across all outlets</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Collection" value={stats.total} icon={Wallet} color="text-primary" bg="bg-primary/10" />
        <StatCard label="Cash" value={stats.cash} icon={Banknote} color="text-green-600" bg="bg-green-50" />
        <StatCard label="Online" value={stats.online} icon={Smartphone} color="text-blue-600" bg="bg-blue-50" />
        <StatCard label="Unpaid (pending)" value={stats.unpaid} icon={Wallet} color="text-amber-600" bg="bg-amber-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b border-border"><h3 className="font-heading font-semibold">Collection by Date</h3></div>
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {Object.entries(stats.byDate).slice(0, 30).map(([d, v]) => (
                  <TableRow key={d}><TableCell>{d}</TableCell><TableCell className="text-right font-medium">Rs. {v.toLocaleString()}</TableCell></TableRow>
                ))}
                {Object.keys(stats.byDate).length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">No data</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b border-border"><h3 className="font-heading font-semibold">Collection by Outlet</h3></div>
            <Table>
              <TableHeader><TableRow><TableHead>Outlet</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {Object.entries(stats.byOutlet).map(([n, v]) => (
                  <TableRow key={n}><TableCell>{n}</TableCell><TableCell className="text-right font-medium">Rs. {v.toLocaleString()}</TableCell></TableRow>
                ))}
                {Object.keys(stats.byOutlet).length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">No data</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, bg }: any) {
  return (
    <Card><CardContent className="p-4">
      <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}><Icon className={`h-5 w-5 ${color}`} /></div>
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className="text-xl md:text-2xl font-bold text-foreground mt-1">Rs. {Number(value).toLocaleString()}</p>
    </CardContent></Card>
  );
}
