import React, { useState, useEffect, useMemo } from 'react';
import { isAfter, isSameDay } from 'date-fns';
import { ArrowRight, Calendar, Check, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogBody,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { availabilityAPI } from '@/services/availabilityAPI';
import { SlotStatus } from '@/lib/statusConstants';
import { toast } from '@/hooks/use-toast';
import { useFormattedDateTime } from '@/hooks/useFormattedDateTime';

function useSlotGroups(slots) {
  const { formatFriendlyDateTimeRange, formatDuration, formatDateWithWeekday, formatTimeRange } =
    useFormattedDateTime();

  return useMemo(() => {
    const groups = [];
    for (const slot of slots) {
      const start = new Date(slot.startDateTime);
      const end = new Date(slot.endDateTime);
      const last = groups[groups.length - 1];
      const dayLabel = formatDateWithWeekday(start);
      const entry = {
        ...slot,
        start,
        end,
        timeLabel: formatTimeRange(start, end),
        friendlyLabel: formatFriendlyDateTimeRange(start, end),
        durationLabel: formatDuration(start, end),
      };

      if (last && isSameDay(last.dayDate, start)) {
        last.slots.push(entry);
      } else {
        groups.push({
          dayKey: start.toDateString(),
          dayDate: start,
          dayLabel,
          slots: [entry],
        });
      }
    }
    return groups;
  }, [slots, formatFriendlyDateTimeRange, formatDuration, formatDateWithWeekday, formatTimeRange]);
}

function TimePill({ label, muted = false }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        muted
          ? 'bg-slate-100 text-slate-600'
          : 'bg-blue-50 text-blue-800 ring-1 ring-blue-200/80'
      }`}
    >
      <Clock className="h-3 w-3 shrink-0" />
      {label}
    </span>
  );
}

function ProposeTimeDialog({
  open,
  onOpenChange,
  onSuccess,
  interviewScheduleId,
  currentInterview,
}) {
  const { formatFriendlyDateTimeRange, formatDuration, formatTimeRange } = useFormattedDateTime();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [slots, setSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const finishAndClose = () => {
    onOpenChange(false);
    onSuccess?.();
  };

  useEffect(() => {
    if (!open) {
      setLoading(true);
      setSubmitting(false);
      setSlots([]);
      setSelectedSlotId(null);
      setError('');
      setSuccessMessage('');
      return undefined;
    }

    loadAvailableSlots();
    return undefined;
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
  const slotGroups = useSlotGroups(slots);

  const currentStart = currentInterview?.preferredStartDateTime;
  const currentEnd = currentInterview?.preferredEndDateTime;
  const currentFriendly = currentStart && currentEnd
    ? formatFriendlyDateTimeRange(currentStart, currentEnd)
    : '';
  const currentDuration = currentStart && currentEnd
    ? formatDuration(currentStart, currentEnd)
    : '';
  const proposedFriendly = selectedSlot
    ? formatFriendlyDateTimeRange(selectedSlot.startDateTime, selectedSlot.endDateTime)
    : '';
  const proposedDuration = selectedSlot
    ? formatDuration(selectedSlot.startDateTime, selectedSlot.endDateTime)
    : '';
  const proposedTimeOnly = selectedSlot
    ? formatTimeRange(
      new Date(selectedSlot.startDateTime),
      new Date(selectedSlot.endDateTime),
    )
    : '';

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

      const friendly = formatFriendlyDateTimeRange(
        selectedSlot.startDateTime,
        selectedSlot.endDateTime,
      );
      setSuccessMessage(
        friendly
          ? `Your proposal for ${friendly} has been sent to HR for review.`
          : 'Your alternative time has been sent to HR for review.',
      );
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

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (submitting) return;
        if (!o && successMessage) {
          finishAndClose();
          return;
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-xl p-0 overflow-hidden border-0 bg-gradient-to-br from-white to-slate-50 shadow-2xl">
        {successMessage ? (
          <>
            <DialogHeader className="bg-gradient-to-r from-emerald-50 to-blue-50 border-b border-emerald-100">
              <DialogTitle className="text-emerald-900">Proposal submitted</DialogTitle>
              <DialogDescription>
                HR has been notified and will review your suggested time.
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="px-5 py-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.22 }}
                className="flex flex-col items-center text-center"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <p className="text-base font-semibold text-slate-900">
                  Alternative time proposed successfully
                </p>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  {successMessage}
                </p>
              </motion.div>
            </DialogBody>
            <DialogFooter className="gap-3 border-t border-slate-200 bg-white px-5 py-4">
              <Button onClick={finishAndClose} className="gap-2">
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
              <DialogTitle className="text-blue-900">
                Propose an Alternative Time
              </DialogTitle>
              <DialogDescription>
                Pick a free slot from your availability. HR will review before any change is made.
              </DialogDescription>
            </DialogHeader>

            {(currentFriendly || selectedSlot) && (
              <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 px-5 pt-4">
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Current
                  </p>
                  {currentFriendly ? (
                    <>
                      <p className="mt-1.5 text-sm font-medium leading-snug text-slate-900">
                        {currentFriendly}
                      </p>
                      {currentDuration && (
                        <p className="mt-1 text-xs text-muted-foreground">{currentDuration}</p>
                      )}
                    </>
                  ) : (
                    <p className="mt-1.5 text-sm text-muted-foreground">Not available</p>
                  )}
                </div>

                <div className="flex items-center justify-center self-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-1 ring-blue-200">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>

                <div
                  className={`rounded-xl border px-3 py-3 transition-colors ${
                    selectedSlot
                      ? 'border-blue-300 bg-blue-50/80'
                      : 'border-dashed border-slate-200 bg-slate-50/80'
                  }`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">
                    Proposed
                  </p>
                  <AnimatePresence mode="wait">
                    {selectedSlot ? (
                      <motion.div
                        key={selectedSlot.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18 }}
                      >
                        <p className="mt-1.5 text-sm font-medium leading-snug text-slate-900">
                          {proposedFriendly}
                        </p>
                        {proposedDuration && (
                          <p className="mt-1 text-xs text-muted-foreground">{proposedDuration}</p>
                        )}
                      </motion.div>
                    ) : (
                      <motion.p
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-1.5 text-sm text-muted-foreground"
                      >
                        Select a slot below
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            <DialogBody className="max-h-[46vh] overflow-y-auto px-5 py-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-14">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading your availability…</p>
                </div>
              ) : error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : slots.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <p className="font-medium text-slate-800">No upcoming free slots</p>
                  <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                    Add availability on your calendar, then return here to propose a new time.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-800">
                      Your free slots
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {slots.length} option{slots.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {slotGroups.map((group) => (
                    <section key={group.dayKey} className="space-y-2">
                      <h3 className="sticky top-0 z-[1] -mx-1 bg-white/95 px-1 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 backdrop-blur-sm">
                        {group.dayLabel}
                      </h3>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {group.slots.map((slot) => {
                          const isSelected = selectedSlotId === slot.id;
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              onClick={() => setSelectedSlotId(slot.id)}
                              aria-pressed={isSelected}
                              className={`group relative flex min-h-[52px] flex-col items-start gap-1.5 rounded-xl border px-3.5 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50/80 shadow-sm ring-1 ring-blue-500/30'
                                  : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
                              }`}
                            >
                              <div className="flex w-full items-center justify-between gap-2">
                                <TimePill label={slot.timeLabel} muted={!isSelected} />
                                <span
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors ${
                                    isSelected
                                      ? 'bg-blue-600 text-white'
                                      : 'border border-slate-300 bg-white text-transparent group-hover:border-blue-400'
                                  }`}
                                >
                                  <Check className="h-3 w-3" strokeWidth={3} />
                                </span>
                              </div>
                              {slot.durationLabel && (
                                <p className="text-xs text-muted-foreground">{slot.durationLabel}</p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </DialogBody>

            <DialogFooter className="gap-3 border-t border-slate-200 bg-white px-5 py-4">
              <div className="mr-auto hidden min-w-0 sm:block">
                {selectedSlot && proposedTimeOnly && (
                  <p className="truncate text-xs text-slate-600">
                    Selected:{' '}
                    <span className="font-medium text-slate-900">{proposedFriendly}</span>
                  </p>
                )}
              </div>
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
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Send proposal
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ProposeTimeDialog;
