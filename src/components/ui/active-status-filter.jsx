import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ACTIVE_STATUS, DEFAULT_ACTIVE_STATUS } from '@/lib/activeStatusFilter';
import { cn } from '@/lib/utils';

export function ActiveStatusFilter({
  value = DEFAULT_ACTIVE_STATUS,
  onValueChange,
  className,
  id,
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        id={id}
        className={cn('w-full sm:w-44 h-10', className)}
        aria-label="Filter by status"
      >
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ACTIVE_STATUS.ACTIVE}>Active only</SelectItem>
        <SelectItem value={ACTIVE_STATUS.INACTIVE}>Inactive only</SelectItem>
        <SelectItem value={ACTIVE_STATUS.ALL}>All</SelectItem>
      </SelectContent>
    </Select>
  );
}

export default ActiveStatusFilter;
