import React, { useState } from 'react';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogBody,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { availabilityAPI } from '@/services/availabilityAPI';
import { toast } from '@/hooks/use-toast';

const DeleteSlotDialog = ({
  isOpen,
  onOpenChange,
  slot,
  onSuccess,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!slot) return;

    setIsDeleting(true);
    try {
      await availabilityAPI.deleteAvailabilitySlot(slot.id);
      toast({ title: '✓ Time slot deleted' });
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
    <Dialog open={isOpen} onOpenChange={(o) => { if (!isDeleting) onOpenChange(o); }}>
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
            <div className="rounded-xl border-2 border-red-100 bg-red-50 p-4">
              <p className="font-semibold text-sm">{format(slot.start, 'EEEE, MMMM dd, yyyy')}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {format(slot.start, 'HH:mm')} – {format(slot.end, 'HH:mm')}
              </p>
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
                Deleting…
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
