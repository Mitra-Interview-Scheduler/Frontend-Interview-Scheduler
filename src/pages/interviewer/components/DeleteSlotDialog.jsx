import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogBody,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { availabilityAPI } from '@/services/availabilityAPI';
import { toast } from '@/hooks/use-toast';
import { useFormattedDateTime } from '@/hooks/useFormattedDateTime';

const DeleteSlotDialog = ({
  isOpen,
  onOpenChange,
  slot,
  onSuccess,
}) => {
  const { formatDateWithWeekday, formatTimeRange } = useFormattedDateTime();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteScope, setDeleteScope] = useState('SINGLE');

  const isRecurringSlot = !!slot?.isRecurring && !!slot?.recurrenceGroupId;

  React.useEffect(() => {
    if (isOpen) {
      setDeleteScope('SINGLE');
    }
  }, [isOpen, slot?.id]);

  const handleDelete = async () => {
    if (!slot) return;

    setIsDeleting(true);
    try {
      await availabilityAPI.deleteAvailabilitySlot(slot.id, deleteScope);

      if (deleteScope === 'ALL') {
        toast({ title: 'Recurring series deleted' });
      } else if (deleteScope === 'FUTURE') {
        toast({ title: 'Future recurring slots deleted' });
      } else {
        toast({ title: 'Time slot deleted' });
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Failed to delete slot',
        description: err.response?.data?.message || 'Cannot delete booked slots',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!isDeleting) onOpenChange(open); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <Trash2 className="w-5 h-5" /> Delete Slot
          </DialogTitle>
          <DialogDescription>
            This will permanently remove the availability slot. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          {slot && (
            <div className="space-y-3">
              <div className="rounded-xl border-2 border-red-100 bg-red-50 p-4">
                <p className="font-semibold text-sm">{formatDateWithWeekday(slot.start)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatTimeRange(slot.start, slot.end)}
                </p>
              </div>

              {isRecurringSlot && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-900">Delete recurring slot scope</p>
                  <Select value={deleteScope} onValueChange={setDeleteScope} disabled={isDeleting}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select delete scope" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SINGLE">Only this event</SelectItem>
                      <SelectItem value="FUTURE">This and future events</SelectItem>
                      <SelectItem value="ALL">All events in this recurring series</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Keep Slot
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="gap-2 min-w-[120px]"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{' '}
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" /> Delete Slot
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteSlotDialog;
