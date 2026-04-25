import { useState } from 'react';
import { useOutlet, useTables, useCreateTable, useDeleteTable } from '@/hooks/useData';
import { useResolvedSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Trash2, TableProperties, AlertTriangle } from 'lucide-react';

export default function TableManagement() {
  const { data: outlet } = useOutlet();
  const { data: tables } = useTables(outlet?.id);
  const { data: sub } = useResolvedSubscription(outlet?.id);
  const createTable = useCreateTable();
  const deleteTable = useDeleteTable();
  const [tableNumber, setTableNumber] = useState('');
  const [tableName, setTableName] = useState('');

  const tableLimit = sub?.limits?.maxTables ?? 0; // 0 = unlimited
  const currentTableCount = tables?.length ?? 0;
  const canAdd = !sub?.canAccessApp ? false : (tableLimit === 0 || currentTableCount < tableLimit);
  const isLocked = !sub?.canAccessApp;

  if (!outlet) return <p className="text-muted-foreground">Please set up your outlet first.</p>;

  const handleAdd = async () => {
    if (!tableNumber.trim()) return;
    if (!canAdd) return toast.error(tableLimit > 0 ? `Plan limit reached (${tableLimit} tables). Upgrade to add more.` : 'Your plan does not allow adding tables right now.');
    try {
      await createTable.mutateAsync({ table_number: tableNumber, name: tableName || undefined, outlet_id: outlet.id });
      setTableNumber('');
      setTableName('');
      toast.success('Table added!');
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Tables</h1>
        <p className="text-muted-foreground">{currentTableCount} tables{tableLimit > 0 ? `/${tableLimit}` : ''}</p>
      </div>

      {isLocked && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">Demo expired. Tables are read-only.</p>
          </CardContent>
        </Card>
      )}

      {!isLocked && (
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base font-heading">Add Table</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              <Input className="w-32" placeholder="Number" value={tableNumber} onChange={e => setTableNumber(e.target.value)} />
              <Input className="flex-1 min-w-[120px]" placeholder="Name (optional)" value={tableName} onChange={e => setTableName(e.target.value)} />
              <Button onClick={handleAdd} disabled={createTable.isPending || !canAdd}><Plus className="h-4 w-4 mr-1" /> Add</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tables?.map(t => (
          <Card key={t.id} className="shadow-card">
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                <TableProperties className="h-5 w-5 text-accent-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">Table {t.table_number}</p>
                {t.name && <p className="text-xs text-muted-foreground">{t.name}</p>}
              </div>
              {!isLocked && (
                <button onClick={() => { deleteTable.mutate(t.id); toast.success('Deleted'); }} className="p-2 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </CardContent>
          </Card>
        ))}
        {(!tables || tables.length === 0) && (
          <p className="text-muted-foreground col-span-full text-center py-8">No tables yet. Add your first table above.</p>
        )}
      </div>
    </div>
  );
}
