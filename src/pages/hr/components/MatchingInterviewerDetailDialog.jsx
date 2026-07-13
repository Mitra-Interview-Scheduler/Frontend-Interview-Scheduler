import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody,
} from '@/components/ui/dialog';
import { Clock, ArrowRight } from 'lucide-react';
import { hrAvailabilityAPI } from '@/services/hrAvailabilityAPI';
import { formatLocalDateTime } from '@/lib/calendarUtils';
import { SlotStatus } from '@/lib/statusConstants';
import {
  addDays, addMonths, endOfDay, format, differenceInMinutes, isSameDay, isToday, isTomorrow, parseISO,
} from 'date-fns';
import { MatchingInterviewerProfileSections } from './MatchingInterviewerProfileSections';

const EMPTY_MATCH = {
  both: [],
  technologies: [],
  domains: [],
};

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    return parseISO(value.includes('T') ? value : `${value}T00:00:00`);
  }
  return new Date(value);
}

function formatDuration(start, end) {
  const mins = differenceInMinutes(end, start);
  if (!Number.isFinite(mins) || mins <= 0) return null;
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function dayHeading(date) {
  if (isToday(date)) return { primary: 'Today', secondary: format(date, 'MMM d') };
  if (isTomorrow(date)) return { primary: 'Tomorrow', secondary: format(date, 'MMM d') };
  return { primary: format(date, 'EEE'), secondary: format(date, 'MMM d') };
}

export function MatchingInterviewerDetailDialog({
  open,
  onOpenChange,
  match,
  onSelectFreeSlot,
}) {
  const [rangeMode, setRangeMode] = useState('week');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const range = useMemo(() => {
    const now = new Date();
    const end = rangeMode === 'month'
      ? endOfDay(addMonths(now, 1))
      : endOfDay(addDays(now, 7));
    return { start: now, end };
  }, [rangeMode]);

  useEffect(() => {
    if (open && match?.interviewerId) {
      setRangeMode('week');
    }
  }, [open, match?.interviewerId]);

  useEffect(() => {
    if (!open || !match?.interviewerId) {
      setSlots([]);
      setError(null);
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError(null);

    hrAvailabilityAPI.getInterviewerSlots(match.interviewerId, {
      startDateTime: formatLocalDateTime(range.start),
      endDateTime: formatLocalDateTime(range.end),
    })
      .then((data) => {
        if (!active) return;
        setSlots(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!active) return;
        setSlots([]);
        setError(err?.message || 'Failed to load free time');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [open, match?.interviewerId, range.start, range.end]);

  const availableSlots = useMemo(() => {
    const now = Date.now();
    return slots
      .filter((slot) => (
        slot.status === SlotStatus.AVAILABLE
        && toDate(slot.endDateTime)?.getTime() > now
      ))
      .sort((a, b) => toDate(a.startDateTime) - toDate(b.startDateTime));
  }, [slots]);

  const slotsByDay = useMemo(() => {
    const groups = [];
    availableSlots.forEach((slot) => {
      const start = toDate(slot.startDateTime);
      const last = groups[groups.length - 1];
      if (last && isSameDay(last.date, start)) {
        last.slots.push(slot);
      } else {
        groups.push({ date: start, slots: [slot] });
      }
    });
    return groups;
  }, [availableSlots]);

  if (!match) return null;

  const roleLine = [match.designation, match.department].filter(Boolean).join(' · ');
  const rankLine = [
    match.interviewerTierOrder != null ? `Tier ${match.interviewerTierOrder}` : null,
    match.interviewerLevelOrder != null ? `Level ${match.interviewerLevelOrder}` : null,
    match.yearsOfExperience != null ? `${match.yearsOfExperience} yrs exp` : null,
  ].filter(Boolean).join(' · ');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,880px)] max-w-[880px] p-0 overflow-hidden">
        <DialogHeader className="px-0 py-0 border-0">
          <div className="px-6 pt-5 pb-4 pr-14">
            <div className="flex gap-4">
              <div
                className={`h-12 w-12 shrink-0 rounded-xl flex items-center justify-center text-[15px] font-semibold tracking-wide text-white ${
                  match.hasFreeTimeInWeek
                    ? 'bg-[linear-gradient(145deg,#0f766e,#134e4a)]'
                    : 'bg-[linear-gradient(145deg,#475569,#334155)]'
                }`}
              >
                {getInitials(match.interviewerName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <DialogTitle className="text-xl font-semibold tracking-tight text-slate-900">
                    {match.interviewerName}
                  </DialogTitle>
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${
                      match.hasFreeTimeInWeek ? 'text-teal-700' : 'text-slate-500'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        match.hasFreeTimeInWeek ? 'bg-teal-500' : 'bg-slate-400'
                      }`}
                    />
                    {match.hasFreeTimeInWeek ? 'Free this week' : 'Busy this week'}
                  </span>
                </div>
                <DialogDescription className="mt-1 text-sm text-slate-600">
                  {roleLine || 'Matching interviewer'}
                </DialogDescription>
                {rankLine && (
                  <p className="mt-0.5 text-xs text-slate-500">{rankLine}</p>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="px-0 py-0 border-t border-slate-200">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            {/* Match + full profile */}
            <section className="px-6 py-5 border-b lg:border-b-0 lg:border-r border-slate-200 max-h-[520px] overflow-y-auto">
              <MatchingInterviewerProfileSections match={match} />
            </section>

            {/* Schedule */}
            <section className="px-6 py-5 bg-[#f7faf9] flex flex-col min-h-[360px]">
              <div className="flex items-end justify-between gap-3 mb-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                    Pick a time
                  </p>
                  <p className="text-sm text-slate-700 mt-1">
                    {loading
                      ? 'Loading availability…'
                      : error
                        ? 'Could not load slots'
                        : availableSlots.length === 0
                          ? 'No open slots in this range'
                          : `${availableSlots.length} open slot${availableSlots.length === 1 ? '' : 's'}`}
                  </p>
                </div>
                <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
                  {[
                    { id: 'week', label: '7 days' },
                    { id: 'month', label: '30 days' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setRangeMode(mode.id)}
                      className={`h-7 min-w-[4.25rem] rounded-md px-2.5 text-xs font-medium transition-colors ${
                        rangeMode === mode.id
                          ? 'bg-teal-700 text-white'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {loading && (
                <div className="space-y-3 animate-pulse">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-3 w-24 rounded bg-slate-200/80" />
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-11 rounded-lg bg-white border border-slate-200" />
                        <div className="h-11 rounded-lg bg-white border border-slate-200" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && error && (
                <div className="flex-1 flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-8">
                  <p className="text-sm text-red-700 text-center">{error}</p>
                </div>
              )}

              {!loading && !error && availableSlots.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center">
                  <Clock className="w-6 h-6 text-slate-300 mb-2" />
                  <p className="text-sm font-medium text-slate-700">Nothing available</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-[240px] leading-relaxed">
                    Try 30 days, or choose another interviewer from the list.
                  </p>
                </div>
              )}

              {!loading && !error && availableSlots.length > 0 && (
                <div className="max-h-[440px] overflow-y-auto space-y-5 -mr-1 pr-1">
                  {slotsByDay.map((group) => {
                    const heading = dayHeading(group.date);
                    return (
                      <div key={group.date.toISOString()}>
                        <div className="sticky top-0 z-[1] flex items-baseline gap-2 bg-[#f7faf9]/95 backdrop-blur-sm pb-2">
                          <span className="text-sm font-semibold text-slate-900">{heading.primary}</span>
                          <span className="text-xs text-slate-400">{heading.secondary}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {group.slots.map((slot) => {
                            const start = toDate(slot.startDateTime);
                            const end = toDate(slot.endDateTime);
                            const duration = formatDuration(start, end);
                            return (
                              <button
                                key={slot.slotId}
                                type="button"
                                onClick={() => onSelectFreeSlot?.(slot)}
                                className="group flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left transition-all hover:border-teal-400 hover:bg-teal-50/70 hover:shadow-[0_1px_0_rgba(15,118,110,0.08)] active:scale-[0.99]"
                              >
                                <div className="min-w-0">
                                  <p className="text-[13px] font-semibold tabular-nums text-slate-900">
                                    {format(start, 'h:mm a')}
                                    <span className="font-normal text-slate-400"> – </span>
                                    {format(end, 'h:mm a')}
                                  </p>
                                  {duration && (
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                      {duration}
                                    </p>
                                  )}
                                </div>
                                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-all group-hover:text-teal-700 group-hover:translate-x-0.5" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

export const EMPTY_MATCHING_INTERVIEWERS = EMPTY_MATCH;

export default MatchingInterviewerDetailDialog;
