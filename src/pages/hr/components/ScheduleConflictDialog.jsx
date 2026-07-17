import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, CalendarClock } from 'lucide-react';
import { format, parseISO } from 'date-fns';

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    return parseISO(value.includes('T') ? value : `${value}T00:00:00`);
  }
  return new Date(value);
}

function formatRange(start, end) {
  const s = toDate(start);
  const e = toDate(end);
  if (!s) return '';
  const datePart = format(s, 'EEE, MMM d');
  const startPart = format(s, 'h:mm a');
  const endPart = e ? format(e, 'h:mm a') : '';
  return endPart ? `${datePart} · ${startPart} – ${endPart}` : `${datePart} · ${startPart}`;
}

/**
 * Error dialog shown when HR tries to book an interview that overlaps an event
 * on the interviewer's selected Google Calendars. Booking is blocked.
 */
export function ScheduleConflictDialog({
  open,
  onOpenChange,
  conflicts = [],
}) {
  const totalEvents = conflicts.reduce(
    (sum, ic) => sum + (Array.isArray(ic.conflicts) ? ic.conflicts.length : 0),
    0,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,560px)] max-w-[560px]">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-slate-900">
                Cannot schedule — calendar conflict
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-slate-600">
                {totalEvents === 1
                  ? 'An interviewer already has an event at this time on their Google Calendar.'
                  : `The selected time overlaps ${totalEvents} existing Google Calendar event(s).`}{' '}
                Choose a different time or remove the conflicting event from the calendar.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="max-h-[50vh] overflow-y-auto">
          <div className="space-y-4">
            {conflicts.map((ic) => (
              <div key={ic.interviewerId} className="rounded-lg border border-red-200 bg-red-50/50 p-3">
                <p className="mb-2 text-sm font-semibold text-slate-800">{ic.interviewerName}</p>
                <ul className="space-y-2">
                  {(ic.conflicts || []).map((event) => (
                    <li key={event.googleEventId || `${event.title}-${event.startDateTime}`} className="flex items-start gap-2">
                      <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {event.title || '(No title)'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatRange(event.startDateTime, event.endDateTime)}
                          {event.calendarName ? ` · ${event.calendarName}` : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button onClick={() => onOpenChange?.(false)}>
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ScheduleConflictDialog;
