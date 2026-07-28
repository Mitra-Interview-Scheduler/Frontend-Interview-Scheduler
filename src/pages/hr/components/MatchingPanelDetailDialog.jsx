import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody,
} from '@/components/ui/dialog';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Clock, ArrowRight, Users, X } from 'lucide-react';
import { hrAvailabilityAPI } from '@/services/hrAvailabilityAPI';
import { formatLocalDateTime } from '@/lib/calendarUtils';
import { SlotStatus } from '@/lib/statusConstants';
import {
  addDays, addMonths, endOfDay, format, differenceInMinutes, isSameDay, isToday, isTomorrow,
} from 'date-fns';
import { formatSlots, findCommonFreeWindows } from '../utils/AvailabilityViewPageHelperUtils';
import { MatchingInterviewerProfileSections } from './MatchingInterviewerProfileSections';

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
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

function matchSummary(match) {
  const count = (
    (match.matchedCore || []).length
    + (match.matchedNonCore || []).length
    + (match.matchedDomains || []).length
  );
  if (count === 0) return 'No shared overlaps';
  return `${count} match${count === 1 ? '' : 'es'} with candidate`;
}

export function MatchingPanelDetailDialog({
  open,
  onOpenChange,
  interviewers = [],
  interviewerColorMap = {},
  onRemoveInterviewer,
  onSelectOverlap,
}) {
  const [rangeMode, setRangeMode] = useState('week');
  const [overlaps, setOverlaps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const interviewerIds = useMemo(
    () => interviewers.map((m) => Number(m.interviewerId)).filter(Boolean),
    [interviewers],
  );
  const interviewerIdsKey = interviewerIds.join(',');

  useEffect(() => {
    if (open) setRangeMode('week');
  }, [open, interviewerIdsKey]);

  useEffect(() => {
    if (!open || interviewerIds.length < 2) {
      setOverlaps([]);
      setError(null);
      setLoading(false);
      return undefined;
    }

    let active = true;
    const now = new Date();
    const rangeEnd = rangeMode === 'month'
      ? endOfDay(addMonths(now, 1))
      : endOfDay(addDays(now, 7));

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const intervalLists = await Promise.all(
          interviewerIds.map(async (interviewerId) => {
            const slots = await hrAvailabilityAPI.getInterviewerSlots(interviewerId, {
              startDateTime: formatLocalDateTime(now),
              endDateTime: formatLocalDateTime(rangeEnd),
            });
            const available = (Array.isArray(slots) ? slots : []).filter((slot) => (
              slot.status === SlotStatus.AVAILABLE
              && new Date(slot.endDateTime).getTime() > Date.now()
            ));
            const events = formatSlots(available, interviewerColorMap);
            return events.map((event) => ({
              start: event.start,
              end: event.end,
              event,
            }));
          }),
        );

        if (!active) return;
        if (intervalLists.some((list) => list.length === 0)) {
          setOverlaps([]);
          return;
        }
        setOverlaps(findCommonFreeWindows(intervalLists));
      } catch (err) {
        if (!active) return;
        setOverlaps([]);
        setError(err?.message || 'Failed to find overlapping free time');
      } finally {
        if (active) setLoading(false);
      }
    };

    const timer = setTimeout(load, 150);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, interviewerIds, interviewerIdsKey, rangeMode, interviewerColorMap]);

  const overlapsByDay = useMemo(() => {
    const groups = [];
    overlaps.forEach((overlap) => {
      const last = groups[groups.length - 1];
      if (last && isSameDay(last.date, overlap.start)) {
        last.overlaps.push(overlap);
      } else {
        groups.push({ date: overlap.start, overlaps: [overlap] });
      }
    });
    return groups;
  }, [overlaps]);

  const freeThisWeekCount = interviewers.filter((m) => m.hasFreeTimeInWeek).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,880px)] max-w-[880px] p-0 overflow-hidden">
        <DialogHeader className="px-0 py-0 border-0">
          <div className="px-6 pt-5 pb-4 pr-14">
            <div className="flex gap-4">
              <div className="relative h-12 w-[3.75rem] shrink-0">
                {interviewers.slice(0, 3).map((match, index) => (
                  <div
                    key={match.interviewerId}
                    className="absolute top-0 h-12 w-12 rounded-xl flex items-center justify-center text-[13px] font-semibold tracking-wide text-white border-2 border-white bg-[linear-gradient(145deg,#0369a1,#0c4a6e)]"
                    style={{ left: index * 10, zIndex: 3 - index }}
                  >
                    {getInitials(match.interviewerName)}
                  </div>
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <DialogTitle className="text-xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
                    <Users className="h-5 w-5 text-sky-700" />
                    Panel interview
                  </DialogTitle>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                    {interviewers.length} interviewer{interviewers.length === 1 ? '' : 's'}
                  </span>
                </div>
                <DialogDescription className="mt-1 text-sm text-slate-600">
                  Common free windows across the selected matching interviewers
                </DialogDescription>
                <p className="mt-0.5 text-xs text-slate-500">
                  {freeThisWeekCount} free this week · pick an overlapping slot to schedule
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="px-0 py-0 border-t border-slate-200">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <section className="px-6 py-5 border-b lg:border-b-0 lg:border-r border-slate-200 max-h-[520px] overflow-y-auto">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400 mb-4">
                Panel members
              </p>

              {interviewers.length === 0 ? (
                <p className="text-sm text-slate-500">No interviewers selected.</p>
              ) : (
                <Accordion type="multiple" className="space-y-2">
                  {interviewers.map((match) => {
                    const roleLine = [match.designation, match.department].filter(Boolean).join(' · ');
                    const itemValue = String(match.interviewerId);
                    return (
                      <AccordionItem
                        key={match.interviewerId}
                        value={itemValue}
                        className="rounded-xl border border-slate-200 bg-white px-3 border-b-0"
                      >
                        <div className="flex items-start gap-1">
                          <AccordionTrigger className="flex-1 py-3 hover:no-underline [&>svg]:mt-2 [&>svg]:text-slate-400">
                            <div className="flex items-start gap-3 text-left pr-2">
                              <div className="h-9 w-9 shrink-0 rounded-lg bg-[linear-gradient(145deg,#0369a1,#0c4a6e)] text-white text-xs font-semibold flex items-center justify-center">
                                {getInitials(match.interviewerName)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-900 truncate">
                                  {match.interviewerName}
                                </p>
                                {roleLine && (
                                  <p className="text-xs text-slate-500 truncate">{roleLine}</p>
                                )}
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  {matchSummary(match)} · expand for full profile
                                </p>
                              </div>
                            </div>
                          </AccordionTrigger>
                          {onRemoveInterviewer && interviewers.length > 2 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveInterviewer(match);
                              }}
                              className="mt-3.5 mr-0.5 text-slate-400 hover:text-red-600 shrink-0"
                              title="Remove from panel"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <AccordionContent className="pb-3 pt-0">
                          <div className="border-t border-slate-100 pt-4">
                            <MatchingInterviewerProfileSections match={match} />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}

              {interviewers.length < 2 && (
                <p className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Select at least 2 interviewers to find overlapping free time.
                </p>
              )}
            </section>

            <section className="px-6 py-5 bg-[#f7faf9] flex flex-col min-h-[360px]">
              <div className="flex items-end justify-between gap-3 mb-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                    Pick a time
                  </p>
                  <p className="text-sm text-slate-700 mt-1">
                    {interviewers.length < 2
                      ? 'Need 2+ interviewers'
                      : loading
                        ? 'Finding common free windows…'
                        : error
                          ? 'Could not load overlaps'
                          : overlaps.length === 0
                            ? 'No overlapping free time'
                            : `${overlaps.length} overlapping window${overlaps.length === 1 ? '' : 's'}`}
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
                          ? 'bg-sky-700 text-white'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {interviewers.length < 2 && (
                <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center">
                  <Users className="w-6 h-6 text-slate-300 mb-2" />
                  <p className="text-sm font-medium text-slate-700">Select more interviewers</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-[240px] leading-relaxed">
                    Panel scheduling needs shared free time across at least two people.
                  </p>
                </div>
              )}

              {interviewers.length >= 2 && loading && (
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

              {interviewers.length >= 2 && !loading && error && (
                <div className="flex-1 flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-8">
                  <p className="text-sm text-red-700 text-center">{error}</p>
                </div>
              )}

              {interviewers.length >= 2 && !loading && !error && overlaps.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center">
                  <Clock className="w-6 h-6 text-slate-300 mb-2" />
                  <p className="text-sm font-medium text-slate-700">No overlapping free time</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-[240px] leading-relaxed">
                    Try 30 days, or adjust the panel members.
                  </p>
                </div>
              )}

              {interviewers.length >= 2 && !loading && !error && overlaps.length > 0 && (
                <div className="max-h-[440px] overflow-y-auto space-y-5 -mr-1 pr-1">
                  {overlapsByDay.map((group) => {
                    const heading = dayHeading(group.date);
                    return (
                      <div key={group.date.toISOString()}>
                        <div className="sticky top-0 z-[1] flex items-baseline gap-2 bg-[#f7faf9]/95 backdrop-blur-sm pb-2">
                          <span className="text-sm font-semibold text-slate-900">{heading.primary}</span>
                          <span className="text-xs text-slate-400">{heading.secondary}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {group.overlaps.map((overlap) => {
                            const duration = formatDuration(overlap.start, overlap.end);
                            return (
                              <button
                                key={`${overlap.start.toISOString()}-${overlap.end.toISOString()}`}
                                type="button"
                                onClick={() => onSelectOverlap?.(overlap)}
                                className="group flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left transition-all hover:border-sky-400 hover:bg-sky-50/70 hover:shadow-[0_1px_0_rgba(3,105,161,0.08)] active:scale-[0.99]"
                              >
                                <div className="min-w-0">
                                  <p className="text-[13px] font-semibold tabular-nums text-slate-900">
                                    {format(overlap.start, 'h:mm a')}
                                    <span className="font-normal text-slate-400"> – </span>
                                    {format(overlap.end, 'h:mm a')}
                                  </p>
                                  <p className="text-[11px] text-slate-500 mt-0.5">
                                    {duration ? `${duration} · ` : ''}
                                    {overlap.panelSlots.length} interviewers
                                  </p>
                                </div>
                                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-all group-hover:text-sky-700 group-hover:translate-x-0.5" />
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

export default MatchingPanelDetailDialog;
