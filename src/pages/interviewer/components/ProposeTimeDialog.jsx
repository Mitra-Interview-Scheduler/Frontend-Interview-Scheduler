import React, { useState, useEffect, useMemo } from 'react';
import { isAfter, isSameDay } from 'date-fns';
import { ArrowRight, Calendar, Check, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogBody,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  const { formatFriendlyDateTimeRange, formatDuration, formatTimeRange, formatDateWithWeekday } =
    useFormattedDateTime();
  const isPanel = !!currentInterview?.panelId;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [slots, setSlots] = useState([]);
  const [commonWindows, setCommonWindows] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [selectedWindowKey, setSelectedWindowKey] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const finishAndClose = () => {
    onOpenChange(false);
  };

  const notifyProposalSubmitted = () => {
    onSuccess?.();
  };

  useEffect(() => {
    if (!open) {
      setLoading(true);
      setSubmitting(false);
      setSlots([]);
      setCommonWindows([]);
      setSelectedSlotId(null);
      setSelectedWindowKey(null);
      setReason('');
      setError('');
      setSuccessMessage('');
      return undefined;
    }

    loadOptions();
    return undefined;
  }, [open, interviewScheduleId, isPanel]);

  const loadOptions = async () => {
    try {
      setLoading(true);
      setError('');

      if (isPanel) {
        const windows = await availabilityAPI.getPanelCommonFreeWindows(interviewScheduleId);
        setCommonWindows(Array.isArray(windows) ? windows : []);
        setSlots([]);
      } else {
        const data = await availabilityAPI.getMyAvailability();
        const now = new Date();
        const futureAvailable = (Array.isArray(data) ? data : [])
          .filter((slot) => slot.status === SlotStatus.AVAILABLE && isAfter(new Date(slot.startDateTime), now))
          .sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));
        setSlots(futureAvailable);
        setCommonWindows([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load available times');
    } finally {
      setLoading(false);
    }
  };

  const selectedSlot = slots.find((slot) => slot.id === selectedSlotId);
  const slotGroups = useSlotGroups(slots);

  const windowEntries = useMemo(() => {
    return commonWindows.map((window, index) => {
      const start = new Date(window.startDateTime);
      const end = new Date(window.endDateTime);
      return {
        key: `${window.startDateTime}|${window.endDateTime}|${index}`,
        ...window,
        start,
        end,
        timeLabel: formatTimeRange(start, end),
        friendlyLabel: formatFriendlyDateTimeRange(start, end),
        durationLabel: formatDuration(start, end),
        dayLabel: formatDateWithWeekday(start),
      };
    });
  }, [commonWindows, formatTimeRange, formatFriendlyDateTimeRange, formatDuration, formatDateWithWeekday]);

  const windowGroups = useMemo(() => {
    const groups = [];
    for (const entry of windowEntries) {
      const last = groups[groups.length - 1];
      if (last && isSameDay(last.dayDate, entry.start)) {
        last.windows.push(entry);
      } else {
        groups.push({
          dayKey: entry.start.toDateString(),
          dayDate: entry.start,
          dayLabel: entry.dayLabel,
          windows: [entry],
        });
      }
    }
    return groups;
  }, [windowEntries]);

  const selectedWindow = windowEntries.find((entry) => entry.key === selectedWindowKey);

  const currentStart = currentInterview?.preferredStartDateTime
    || currentInterview?.scheduledStartDateTime;
  const currentEnd = currentInterview?.preferredEndDateTime
    || currentInterview?.scheduledEndDateTime;
  const currentDurationMs = currentStart && currentEnd
    ? Math.max(0, new Date(currentEnd).getTime() - new Date(currentStart).getTime())
    : 0;

  const clippedPanelWindow = useMemo(() => {
    if (!selectedWindow) return null;
    const start = selectedWindow.start;
    let end = selectedWindow.end;
    if (currentDurationMs > 0) {
      const clippedEnd = new Date(start.getTime() + currentDurationMs);
      if (clippedEnd <= end) {
        end = clippedEnd;
      }
    }
    return { start, end };
  }, [selectedWindow, currentDurationMs]);

  const currentFriendly = currentStart && currentEnd
    ? formatFriendlyDateTimeRange(currentStart, currentEnd)
    : '';
  const currentDuration = currentStart && currentEnd
    ? formatDuration(currentStart, currentEnd)
    : '';

  const proposedStart = isPanel ? clippedPanelWindow?.start : selectedSlot?.startDateTime;
  const proposedEnd = isPanel ? clippedPanelWindow?.end : selectedSlot?.endDateTime;
  const proposedFriendly = proposedStart && proposedEnd
    ? formatFriendlyDateTimeRange(proposedStart, proposedEnd)
    : '';
  const proposedDuration = proposedStart && proposedEnd
    ? formatDuration(proposedStart, proposedEnd)
    : '';

  const panelHasNoCommonWindows = isPanel && !loading && !error && commonWindows.length === 0;
  const canSubmitTimed = isPanel ? !!selectedWindow : !!selectedSlot;
  const canSubmitReasonOnly = panelHasNoCommonWindows && reason.trim().length > 0;

  const handleSubmitTimed = async () => {
    if (!canSubmitTimed || !interviewScheduleId) return;

    try {
      setSubmitting(true);
      await availabilityAPI.proposeAlternativeTime({
        interviewScheduleId,
        proposedStartDateTime: proposedStart,
        proposedEndDateTime: proposedEnd,
        reason: reason.trim() || undefined,
      });

      const friendly = proposedFriendly;
      setSuccessMessage(
        friendly
          ? `Your proposal for ${friendly} has been sent to HR for review.`
          : 'Your alternative time has been sent to HR for review.',
      );
      notifyProposalSubmitted();
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

  const handleSubmitReasonOnly = async () => {
    if (!canSubmitReasonOnly || !interviewScheduleId) return;

    try {
      setSubmitting(true);
      await availabilityAPI.proposeAlternativeTime({
        interviewScheduleId,
        reason: reason.trim(),
      });
      setSuccessMessage(
        'Your postpone request was sent to HR. They will review and reschedule the panel interview.',
      );
      notifyProposalSubmitted();
    } catch (err) {
      toast({
        title: 'Failed to submit request',
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
              <DialogTitle className="text-emerald-900">
                {panelHasNoCommonWindows || (!proposedFriendly && isPanel)
                  ? 'Postpone request sent'
                  : 'Proposal submitted'}
              </DialogTitle>
              <DialogDescription>
                HR has been notified and will review your request.
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
                  Request sent successfully
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
                {isPanel ? 'Propose Panel Time Change' : 'Propose an Alternative Time'}
              </DialogTitle>
              <DialogDescription>
                {isPanel
                  ? panelHasNoCommonWindows
                    ? 'No shared free times were found for all panel members. You can still ask HR to postpone this panel.'
                    : 'Pick a time that is free for every panel member. HR will review before any change is made.'
                  : 'Pick a free slot from your availability. HR will review before any change is made.'}
              </DialogDescription>
            </DialogHeader>

            {(currentFriendly || proposedFriendly) && !panelHasNoCommonWindows && (
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
                    proposedFriendly
                      ? 'border-blue-300 bg-blue-50/80'
                      : 'border-dashed border-slate-200 bg-slate-50/80'
                  }`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">
                    Proposed
                  </p>
                  <AnimatePresence mode="wait">
                    {proposedFriendly ? (
                      <motion.div
                        key={proposedFriendly}
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
                        Select a time below
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
                  <p className="text-sm text-muted-foreground">
                    {isPanel ? 'Finding shared free times…' : 'Loading your availability…'}
                  </p>
                </div>
              ) : error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : panelHasNoCommonWindows ? (
                <div className="space-y-4">
                  <div className="flex flex-col items-center py-4 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                      <Calendar className="h-6 w-6" />
                    </div>
                    <p className="font-medium text-slate-800">No shared free times</p>
                    <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                      Tell HR why this panel needs to be postponed. They will pick a new time.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="panel-postpone-reason">Reason</Label>
                    <Textarea
                      id="panel-postpone-reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Why does this panel interview need to be postponed?"
                      rows={4}
                      maxLength={2000}
                    />
                  </div>
                </div>
              ) : isPanel ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-800">
                      Shared free times
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {windowEntries.length} option{windowEntries.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {windowGroups.map((group) => (
                    <section key={group.dayKey} className="space-y-2">
                      <h3 className="sticky top-0 z-[1] -mx-1 bg-white/95 px-1 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 backdrop-blur-sm">
                        {group.dayLabel}
                      </h3>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {group.windows.map((window) => {
                          const isSelected = selectedWindowKey === window.key;
                          return (
                            <button
                              key={window.key}
                              type="button"
                              onClick={() => setSelectedWindowKey(window.key)}
                              aria-pressed={isSelected}
                              className={`group relative flex min-h-[52px] flex-col items-start gap-1.5 rounded-xl border px-3.5 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50/80 shadow-sm ring-1 ring-blue-500/30'
                                  : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
                              }`}
                            >
                              <div className="flex w-full items-center justify-between gap-2">
                                <TimePill label={window.timeLabel} muted={!isSelected} />
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
                              {window.durationLabel && (
                                <p className="text-xs text-muted-foreground">{window.durationLabel}</p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ))}

                  <div className="space-y-2">
                    <Label htmlFor="panel-propose-reason">Note for HR (optional)</Label>
                    <Textarea
                      id="panel-propose-reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Optional context for HR"
                      rows={2}
                      maxLength={2000}
                    />
                  </div>
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
                {proposedFriendly && (
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
              {panelHasNoCommonWindows ? (
                <Button
                  onClick={handleSubmitReasonOnly}
                  disabled={loading || submitting || !canSubmitReasonOnly || !!error}
                  className="gap-2"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Request postpone
                </Button>
              ) : (
                <Button
                  onClick={handleSubmitTimed}
                  disabled={loading || submitting || !canSubmitTimed || !!error}
                  className="gap-2"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Send proposal
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ProposeTimeDialog;
