import React, { useEffect, useMemo, useState } from 'react';
import { addDays, format, isBefore, isSameDay, startOfDay } from 'date-fns';
import { AlertCircle, Calendar as CalendarIcon, CheckCircle2, Plus } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import TimePicker from '@/components/TimePicker';
import { availabilityAPI } from '@/services/availabilityAPI';
import { toast } from '@/hooks/use-toast';
import { useFormattedDateTime } from '@/hooks/useFormattedDateTime';

const WEEKDAYS = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

const formatDateInput = (date) => (date ? format(date, 'yyyy-MM-dd') : '');

const buildDateTime = (date, time) => {
  if (!date || !time) return null;

  const [hours, minutes] = time.split(':').map(Number);
  const value = new Date(date);
  value.setHours(hours, minutes, 0, 0);
  return value;
};

const generateRecurrenceGroupId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `rec-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const getWeeklyOccurrences = ({
  selectedDate,
  startTime,
  endTime,
  selectedDays,
  recurrenceMode,
  recurrenceCount,
  recurrenceUntilDate,
}) => {
  if (!selectedDate || !startTime || !endTime || selectedDays.length === 0) {
    return [];
  }

  const selectedDay = startOfDay(new Date(selectedDate));
  const untilDate = recurrenceMode === 'date' && recurrenceUntilDate
    ? startOfDay(new Date(recurrenceUntilDate))
    : null;
  const occurrenceLimit = recurrenceMode === 'count'
    ? Math.max(1, Number(recurrenceCount) || 0)
    : Number.POSITIVE_INFINITY;
  const occurrences = [];

  for (let cursor = selectedDay, guard = 0;
    guard < 366 && occurrences.length < occurrenceLimit;
    cursor = addDays(cursor, 1), guard += 1) {
    if (untilDate && cursor > untilDate) {
      break;
    }

    if (!selectedDays.includes(cursor.getDay())) {
      continue;
    }

    const occurrenceStart = buildDateTime(cursor, startTime);
    const occurrenceEnd = buildDateTime(cursor, endTime);

    occurrences.push({
      start: occurrenceStart,
      end: occurrenceEnd,
    });
  }

  return occurrences;
};

const AddSlotDialog = ({
  isOpen,
  onOpenChange,
  selectedDate,
  defaultStartTime,
  defaultEndTime,
  onSuccess,
  getSlotStartError,
}) => {
  const { formatDateWithWeekday } = useFormattedDateTime();
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceMode, setRecurrenceMode] = useState('count');
  const [recurrenceCount, setRecurrenceCount] = useState(5);
  const [recurrenceUntilDate, setRecurrenceUntilDate] = useState('');
  const [recurrenceDays, setRecurrenceDays] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setStartTime(defaultStartTime || '');
      setEndTime(defaultEndTime || '');
      setDescription('');
      setIsRecurring(false);
      setRecurrenceMode('count');
      setRecurrenceCount(5);
      setRecurrenceUntilDate(selectedDate ? formatDateInput(selectedDate) : '');
      setRecurrenceDays(selectedDate ? [new Date(selectedDate).getDay()] : []);
    }
  }, [isOpen, defaultStartTime, defaultEndTime, selectedDate]);

  useEffect(() => {
    if (!selectedDate) {
      setError(null);
      return;
    }

    const start = buildDateTime(selectedDate, startTime);
    setError(getSlotStartError(start));
  }, [selectedDate, startTime, getSlotStartError]);

  const recurrenceValidationError = useMemo(() => {
    if (!isRecurring) return null;
    if (recurrenceDays.length === 0) return 'Select at least one weekday.';

    if (recurrenceMode === 'count') {
      if (!recurrenceCount || Number(recurrenceCount) < 2) {
        return 'Repeat at least 2 times.';
      }
      return null;
    }

    if (!recurrenceUntilDate) return 'Choose an end date.';

    const startDate = startOfDay(new Date(selectedDate));
    const endDate = startOfDay(new Date(recurrenceUntilDate));
    if (isBefore(endDate, startDate) || isSameDay(endDate, startDate)) {
      return 'End date must be after the selected day.';
    }

    return null;
  }, [isRecurring, recurrenceDays.length, recurrenceMode, recurrenceCount, recurrenceUntilDate, selectedDate]);

  const toggleRecurrenceDay = (dayValue) => {
    setRecurrenceDays((current) => (
      current.includes(dayValue)
        ? current.filter((day) => day !== dayValue)
        : [...current, dayValue].sort((a, b) => a - b)
    ));
  };

  const handleCreate = async () => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const now = new Date();

    const start = new Date(selectedDate);
    start.setHours(sh, sm, 0, 0);

    const end = new Date(selectedDate);
    end.setHours(eh, em, 0, 0);

    if (end <= start) {
      toast({ title: 'End time must be after start time', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (isRecurring) {
        const recurrenceGroupId = generateRecurrenceGroupId();
        const occurrences = getWeeklyOccurrences({
          selectedDate,
          startTime,
          endTime,
          selectedDays: recurrenceDays,
          recurrenceMode,
          recurrenceCount,
          recurrenceUntilDate,
        });

        const slots = occurrences.map((occurrence) => ({
          startDateTime: occurrence.start,
          endDateTime: occurrence.end,
          currentTime: now,
          description: description || null,
          recurrenceGroupId,
        }));

        const newSlots = await availabilityAPI.createBulkAvailabilitySlots(slots);
        toast({ title: `✓ ${newSlots.length} recurring slots added` });
        onSuccess(newSlots);
      } else {
        const newSlot = await availabilityAPI.createAvailabilitySlot({
          startDateTime: start,
          endDateTime: end,
          currentTime: now,
          description: description || null,
        });
        toast({ title: '✓ Time slot added' });
        onSuccess(newSlot);
      }

      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Failed to add slot',
        description: err.response?.data?.message || 'Conflict with existing availability',
        variant: 'destructive',
      });
    } finally {
      console.log('Creating slot with:', { start, end, description, currentTime: now });
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-700">
            <Plus className="w-5 h-5" /> Add Availability Slot
          </DialogTitle>
          <DialogDescription>
            Set your available time range for interviews.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {selectedDate && (
            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
              <p className="text-sm font-semibold text-indigo-700 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                {formatDateWithWeekday(selectedDate)}
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="font-semibold text-sm">Description (Optional)</Label>
            <Input
              placeholder="e.g., Technical Interview"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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

          <div className="rounded-xl border border-indigo-100 bg-slate-50 p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Recurring availability</p>
                <p className="text-xs text-slate-500">Repeat this slot on selected days.</p>
              </div>
              <Button
                type="button"
                variant={isRecurring ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsRecurring((current) => !current)}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                {isRecurring ? 'Recurring on' : 'Add recurring'}
              </Button>
            </div>

            {isRecurring && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-semibold text-sm">Repeat on</Label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day) => {
                      const active = recurrenceDays.includes(day.value);

                      return (
                        <Button
                          key={day.value}
                          type="button"
                          size="sm"
                          variant={active ? 'default' : 'outline'}
                          onClick={() => toggleRecurrenceDay(day.value)}
                          className="min-w-12 px-3"
                        >
                          {day.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm">End condition</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={recurrenceMode === 'count' ? 'default' : 'outline'}
                        onClick={() => setRecurrenceMode('count')}
                        className="flex-1"
                      >
                        After N occurrences
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={recurrenceMode === 'date' ? 'default' : 'outline'}
                        onClick={() => setRecurrenceMode('date')}
                        className="flex-1"
                      >
                        On date
                      </Button>
                    </div>
                  </div>

                  {recurrenceMode === 'count' ? (
                    <div className="space-y-2">
                      <Label className="font-semibold text-sm" htmlFor="recurrence-count">Repeat occurrences</Label>
                      <Input
                        id="recurrence-count"
                        type="number"
                        min="2"
                        max="30"
                        value={recurrenceCount}
                        onChange={(e) => setRecurrenceCount(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="font-semibold text-sm" htmlFor="recurrence-until">End on</Label>
                      <Input
                        id="recurrence-until"
                        type="date"
                        value={recurrenceUntilDate}
                        min={formatDateInput(selectedDate)}
                        onChange={(e) => setRecurrenceUntilDate(e.target.value)}
                      />
                    </div>
                  )}
                </div>
                {recurrenceValidationError && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    {recurrenceValidationError}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleCreate}
            disabled={!!error || !!recurrenceValidationError || !selectedDate || isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 min-w-[100px]"
          >
            {isSubmitting ? 'Creating...' : isRecurring ? 'Create Recurring Slots' : 'Create Slot'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddSlotDialog;
