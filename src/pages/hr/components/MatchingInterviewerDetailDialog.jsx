import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { hrAvailabilityAPI } from '@/services/hrAvailabilityAPI';
import { formatLocalDateTime } from '@/lib/calendarUtils';
import { SlotStatus } from '@/lib/statusConstants';
import { addDays, addMonths, endOfDay, startOfDay } from 'date-fns';

const EMPTY_MATCH = {
  both: [],
  technologies: [],
  domains: [],
};

export function MatchingInterviewerDetailDialog({
  open,
  onOpenChange,
  match,
  formatDateTimeRange,
}) {
  const [rangeMode, setRangeMode] = useState('week');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const range = useMemo(() => {
    const start = startOfDay(new Date());
    const end = rangeMode === 'month'
      ? endOfDay(addMonths(start, 1))
      : endOfDay(addDays(start, 7));
    return { start, end };
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

  const availableSlots = useMemo(
    () => slots.filter((slot) => slot.status === SlotStatus.AVAILABLE),
    [slots],
  );

  if (!match) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-lg">{match.interviewerName}</DialogTitle>
          <DialogDescription>
            {[match.designation, match.department].filter(Boolean).join(' · ') || 'Matching interviewer'}
            {match.yearsOfExperience != null ? ` · ${match.yearsOfExperience} yrs` : ''}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="px-6 py-4 space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Why it matches
            </p>
            {(match.matchedCore || []).length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] uppercase tracking-wide text-amber-700 font-semibold mr-1">
                  Core
                </span>
                {match.matchedCore.map((name) => (
                  <Badge
                    key={`core-${name}`}
                    variant="outline"
                    className="border-amber-300 bg-amber-50 text-amber-900"
                  >
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500 mr-1" />
                    {name}
                  </Badge>
                ))}
              </div>
            )}
            {(match.matchedNonCore || []).length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] uppercase tracking-wide text-sky-700 font-semibold mr-1">
                  Non-core
                </span>
                {match.matchedNonCore.map((name) => (
                  <Badge
                    key={`noncore-${name}`}
                    variant="outline"
                    className="border-sky-300 bg-sky-50 text-sky-900"
                  >
                    {name}
                  </Badge>
                ))}
              </div>
            )}
            {(match.matchedDomains || []).length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] uppercase tracking-wide text-emerald-700 font-semibold mr-1">
                  Domains
                </span>
                {match.matchedDomains.map((name) => (
                  <Badge
                    key={`domain-${name}`}
                    variant="outline"
                    className="border-emerald-300 bg-emerald-50 text-emerald-900"
                  >
                    {name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5" />
                Free time
              </p>
              <div className="flex gap-1 rounded-md border border-slate-200 p-0.5 bg-slate-50">
                <Button
                  type="button"
                  size="sm"
                  variant={rangeMode === 'week' ? 'default' : 'ghost'}
                  className="h-7 px-3 text-xs"
                  onClick={() => setRangeMode('week')}
                >
                  Week
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={rangeMode === 'month' ? 'default' : 'ghost'}
                  className="h-7 px-3 text-xs"
                  onClick={() => setRangeMode('month')}
                >
                  Month
                </Button>
              </div>
            </div>

            {loading && (
              <p className="text-sm text-muted-foreground">Loading free time…</p>
            )}
            {!loading && error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            {!loading && !error && availableSlots.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                No available slots in the selected {rangeMode}.
              </p>
            )}
            {!loading && !error && availableSlots.length > 0 && (
              <div className="max-h-56 overflow-y-auto space-y-2 rounded-lg border border-slate-200 p-2">
                {availableSlots.map((slot) => (
                  <div
                    key={slot.slotId}
                    className="flex items-start gap-2 rounded-md bg-emerald-50/70 border border-emerald-100 px-3 py-2"
                  >
                    <Clock className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-emerald-900">
                      {formatDateTimeRange
                        ? formatDateTimeRange(new Date(slot.startDateTime), new Date(slot.endDateTime))
                        : `${slot.startDateTime} – ${slot.endDateTime}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

export const EMPTY_MATCHING_INTERVIEWERS = EMPTY_MATCH;

export default MatchingInterviewerDetailDialog;
