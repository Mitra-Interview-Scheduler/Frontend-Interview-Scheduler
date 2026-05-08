import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Pencil, Save, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogBody,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { availabilityAPI } from '@/services/availabilityAPI';
import { toast } from '@/hooks/use-toast';
import TimePicker from '@/components/TimePicker';

const parseTimeOnDate = (timeStr, referenceDate) => {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(referenceDate);
  d.setHours(h, m, 0, 0);
  return d;
};

const EditSlotDialog = ({
  isOpen,
  onOpenChange,
  slot,
  onSuccess,
  onDelete,
  getSlotStartError,
}) => {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form when slot changes
  useEffect(() => {
    if (slot && isOpen) {
      setStartTime(format(slot.start, 'HH:mm'));
      setEndTime(format(slot.end, 'HH:mm'));
      setDescription(
        slot.description &&
        !slot.description.startsWith('Interview:') &&
        !slot.description.startsWith('Panel Interview:')
          ? slot.description
          : ''
      );
      setError(null);
    }
  }, [slot, isOpen]);

  // Re-validate on start time change
  useEffect(() => {
    if (!slot) {
      setError(null);
      return;
    }
    const newStart = parseTimeOnDate(startTime, slot.start);
    setError(getSlotStartError(newStart));
  }, [slot, startTime, getSlotStartError]);

  const handleSave = async () => {
    if (!slot) return;

    const refDate = slot.start;
    const newStart = parseTimeOnDate(startTime, refDate);
    const newEnd = parseTimeOnDate(endTime, refDate);

    const startErr = getSlotStartError(newStart);
    if (startErr) {
      toast({
        title: 'Invalid start time',
        description: startErr,
        variant: 'destructive',
      });
      return;
    }

    if (newEnd <= newStart) {
      toast({
        title: 'End time must be after start time',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      const [ch, cm] = [now.getHours(), now.getMinutes()];
      const currentDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        ch,
        cm,
        0,
        0
      );

      const updated = await availabilityAPI.updateAvailabilitySlot(slot.id, {
        startDateTime: newStart,
        endDateTime: newEnd,
        currentTime: currentDate,
        description: description || null,
      });

      toast({
        title: '✓ Slot updated',
        description: `${format(new Date(updated.startDateTime), 'MMM dd, yyyy')} · ${format(new Date(updated.startDateTime), 'HH:mm')} – ${format(new Date(updated.endDateTime), 'HH:mm')}`,
      });

      onSuccess(updated);
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Failed to update slot',
        description: err.response?.data?.message || 'Could not update slot',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!isSubmitting) onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-700">
            <Pencil className="w-5 h-5" /> Edit Availability Slot
          </DialogTitle>
          <DialogDescription>
            Update the time range or description. Booked slots cannot be edited.
          </DialogDescription>
        </DialogHeader>

        {slot && (
          <DialogBody className="space-y-4 py-2">
            <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/50">
              <p className="text-xs text-muted-foreground mb-1">Editing slot</p>
              <p className="font-semibold text-sm">{format(slot.start, 'EEEE, MMMM dd, yyyy')}</p>
              <p className="text-xs text-indigo-600 mt-0.5">
                Currently: {format(slot.start, 'HH:mm')} – {format(slot.end, 'HH:mm')}
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="font-semibold text-sm">Description (Optional)</Label>
              <Input
                placeholder="e.g., Technical Interview, Code Review"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="border-2 focus:border-indigo-400"
              />
            </div>

           <div className="grid grid-cols-2 gap-3">
              <TimePicker
                value={startTime}
                onChange={setStartTime}
                label="Start Time"
              />
              <TimePicker
                value={endTime}
                onChange={setEndTime}
                label="End Time"
              />
            </div>

            {startTime && endTime && endTime > startTime && !error && (
              <div className="p-3 rounded-lg bg-green-50 border border-green-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                <p className="text-sm text-green-800">
                  <strong>New window:</strong>{' '}
                  {format(parseTimeOnDate(startTime, slot.start), 'h:mm a')} –{' '}
                  {format(parseTimeOnDate(endTime, slot.start), 'h:mm a')} on{' '}
                  {format(slot.start, 'MMM dd')}
                </p>
              </div>
            )}
          </DialogBody>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onOpenChange(false);
              onDelete();
            }}
            disabled={isSubmitting}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSubmitting || !!error || endTime <= startTime}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 min-w-[100px]"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{' '}
                Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditSlotDialog;
