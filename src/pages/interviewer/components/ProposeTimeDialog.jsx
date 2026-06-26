import React, { useState, useEffect } from 'react';
import { isAfter } from 'date-fns';
import { Calendar, Clock, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogBody,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { availabilityAPI } from '@/services/availabilityAPI';
import { SlotStatus } from '@/lib/statusConstants';
import { toast } from '@/hooks/use-toast';
import { useFormattedDateTime } from '@/hooks/useFormattedDateTime';

function ProposeTimeDialog({
  open,
  onOpenChange,
  interviewScheduleId,
  currentInterview,
}) {
  const { formatDate, formatTimeRange } = useFormattedDateTime();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [slots, setSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setLoading(true);
      setSubmitting(false);
      setSlots([]);
      setSelectedSlotId(null);
      setError('');
      return;
    }

    loadAvailableSlots();
  }, [open]);

  const loadAvailableSlots = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await availabilityAPI.getMyAvailability();
      const now = new Date();
      const futureAvailable = (Array.isArray(data) ? data : [])
        .filter((slot) => slot.status === SlotStatus.AVAILABLE && isAfter(new Date(slot.startDateTime), now))
        .sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));

      setSlots(futureAvailable);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load available slots');
    } finally {
      setLoading(false);
    }
  };

  const selectedSlot = slots.find((slot) => slot.id === selectedSlotId);

  const handleSubmit = async () => {
    if (!selectedSlot || !interviewScheduleId) return;

    try {
      setSubmitting(true);
      await availabilityAPI.proposeAlternativeTime({
        interviewScheduleId,
        availabilitySlotId: selectedSlot.id,
        proposedStartDateTime: selectedSlot.startDateTime,
        proposedEndDateTime: selectedSlot.endDateTime,
      });

      toast({
        title: 'Proposal submitted',
        description: 'HR will be notified once this feature is live.',
      });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Failed to submit proposal',
        description: err.response?.data?.message || err.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const currentStart = currentInterview?.preferredStartDateTime;
  const currentEnd = currentInterview?.preferredEndDateTime;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!submitting) onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Propose an Alternative Time</DialogTitle>
          <DialogDescription>
            Select one of your future available slots to propose as a new interview time.
          </DialogDescription>
        </DialogHeader>

        {currentStart && currentEnd && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
            <p className="font-medium text-blue-900 mb-1">Current interview</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-blue-800">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(new Date(currentStart))}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {formatTimeRange(new Date(currentStart), new Date(currentEnd))}
              </span>
            </div>
          </div>
        )}

        <DialogBody className="max-h-[50vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="font-medium">No future available slots.</p>
              <p className="mt-1">Add availability on your calendar first.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {slots.map((slot) => {
                const isSelected = selectedSlotId === slot.id;
                const start = new Date(slot.startDateTime);
                const end = new Date(slot.endDateTime);

                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedSlotId(slot.id)}
                    className={`w-full text-left flex flex-col p-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500'
                        : 'border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-700">
                      {slot.description || 'Available'}
                    </span>
                    <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground mt-1">
                      <Clock className="w-3 h-3" />
                      {formatTimeRange(start, end)}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {formatDate(start)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </DialogBody>

        <DialogFooter className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || submitting || !selectedSlot || !!error}
            className="gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit Proposal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ProposeTimeDialog;
