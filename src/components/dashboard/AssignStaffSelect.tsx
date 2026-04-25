import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStaff, useAssignOrderStaff, type StaffRole } from '@/hooks/useStaff';
import { toast } from 'sonner';
import { Bike, UserCheck } from 'lucide-react';

interface Props {
  outletId: string;
  orderId: string;
  role: StaffRole;
  currentId?: string | null;
}

const NONE = '__none__';

export default function AssignStaffSelect({ outletId, orderId, role, currentId }: Props) {
  const { data: staff } = useStaff(outletId, role);
  const assign = useAssignOrderStaff();
  const activeStaff = (staff || []).filter(s => s.is_active || s.id === currentId);
  const Icon = role === 'rider' ? Bike : UserCheck;

  const onChange = async (val: string) => {
    const newId = val === NONE ? null : val;
    try {
      await assign.mutateAsync({
        order_id: orderId,
        ...(role === 'rider' ? { rider_id: newId } : { waiter_id: newId }),
      });
      toast.success(`${role === 'rider' ? 'Rider' : 'Waiter'} ${newId ? 'assigned' : 'unassigned'}`);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Select value={currentId || NONE} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs w-44">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <SelectValue placeholder={`Assign ${role}`} />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>Unassigned</SelectItem>
        {activeStaff.length === 0 && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">No {role}s. Add from Staff page.</div>
        )}
        {activeStaff.map(s => (
          <SelectItem key={s.id} value={s.id}>{s.name}{s.phone ? ` · ${s.phone}` : ''}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
