// src/pages/interviewer/AvailabilityPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Interviewer availability calendar.
//
// Slot validation rules (also enforced backend-side in AvailabilityService):
//   • Past days  → always blocked / greyed out
//   • Same day   → only allowed if start ≥ now + 2 h
//   • Future days → always allowed
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import {
  format, parse, startOfWeek, getDay,
  addHours, isSameDay, startOfDay, isAfter, isBefore,
} from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './AvailabilityCalendar.css';

import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button }   from '@/components/ui/button';
import { Label }    from '@/components/ui/label';
import { Input }    from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge }    from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus, Clock, Trash2, Calendar as CalendarIcon, AlertCircle, User,
  Pencil, Save, X, CheckCircle2,
} from 'lucide-react';
import Layout   from '@/components/layout/Layout';
import { motion, AnimatePresence } from 'framer-motion';
import { toast }                  from '@/hooks/use-toast';
import { availabilityAPI }        from '@/services/availabilityAPI';

// ── Calendar localizer ────────────────────────────────────────────────────────
const localizer = dateFnsLocalizer({
  format, parse, startOfWeek, getDay, locales: { 'en-US': enUS },
});

// ── Status colours ────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  available: {
    bg:    'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    border:'#312e81', solid:'#6366f1', label:'Available',
  },
  booked: {
    bg:    'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border:'#065f46', solid:'#10b981', label:'Booked',
  },
  blocked: {
    bg:    'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    border:'#92400e', solid:'#f59e0b', label:'Blocked',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const parseTimeOnDate = (timeStr, referenceDate) => {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(referenceDate);
  d.setHours(h, m, 0, 0);
  return d;
};

/** Returns true when the date is strictly before today (midnight normalised). */
const isPastDay = (date) => {
  const today = startOfDay(new Date());
  return startOfDay(date) < today;
};

/** Minimum allowed start for a slot: now + 2 hours. */
const minimumAllowedStart = () => addHours(new Date(), 2);

/**
 * Validate a proposed start time.
 * Returns an error string or null if valid.
 */
const getSlotStartError = (start) => {
  if (!start) return null;
  if (isPastDay(start)) return 'Cannot add slots for past dates.';
  if (isSameDay(start, new Date()) && isBefore(start, minimumAllowedStart())) {
    const earliest = format(minimumAllowedStart(), 'HH:mm');
    return `Same-day slots must start at least 2 hours from now (earliest: ${earliest}).`;
  }
  return null;
};

// ── Component ─────────────────────────────────────────────────────────────────
const AvailabilityPage = () => {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats]     = useState({ availableSlots: 0, bookedSlots: 0 });

  // Add-slot state
  const [selectedDate, setSelectedDate]   = useState(null);
  const [startTime, setStartTime]         = useState('09:00');
  const [endTime, setEndTime]             = useState('10:00');
  const [description, setDescription]     = useState('');
  const [addError, setAddError]           = useState(null);

  // Calendar slot picker dialog state
  const [calendarSlotDialogOpen, setCalendarSlotDialogOpen] = useState(false);
  const [calendarSlotDate, setCalendarSlotDate] = useState(null);
  const [calendarSlotStart, setCalendarSlotStart] = useState('09:00');
  const [calendarSlotEnd, setCalendarSlotEnd] = useState('10:00');

  // Edit-slot state
  const [editTarget, setEditTarget]       = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editStart, setEditStart]         = useState('09:00');
  const [editEnd, setEditEnd]             = useState('10:00');
  const [editDescription, setEditDescription] = useState('');
  const [editSaving, setEditSaving]       = useState(false);
  const [editError, setEditError]         = useState(null);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting]           = useState(false);

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadAvailability = useCallback(async () => {
    try {
      setLoading(true);
      const data = await availabilityAPI.getMyAvailability();
      setEvents(
        data.map((slot) => ({
          id:                  slot.id,
          title: slot.status === 'BOOKED'
            ? `🔒 ${slot.candidateName || 'Interview Scheduled'}`
            : slot.description || 'Available',
          start:               new Date(slot.startDateTime),
          end:                 new Date(slot.endDateTime),
          status:              slot.status.toLowerCase(),
          description:         slot.description,
          candidateName:       slot.candidateName,
          interviewScheduleId: slot.interviewScheduleId,
        }))
      );
    } catch (error) {
      toast({
        title: 'Error loading availability',
        description: error.response?.data?.message || 'Failed to load your availability',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const data = await availabilityAPI.getAvailabilityStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  useEffect(() => {
    loadAvailability();
    loadStats();
  }, [loadAvailability, loadStats]);

  // Re-validate the add-form whenever selected date or start time changes
  useEffect(() => {
    if (!selectedDate) { setAddError(null); return; }
    const [sh, sm] = startTime.split(':').map(Number);
    const start = new Date(
      selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), sh, sm
    );
    setAddError(getSlotStartError(start));
  }, [selectedDate, startTime]);

  // Re-validate edit form
  useEffect(() => {
    if (!editTarget) { setEditError(null); return; }
    const newStart = parseTimeOnDate(editStart, editTarget.start);
    setEditError(getSlotStartError(newStart));
  }, [editTarget, editStart]);

  // ── Calendar interactions ─────────────────────────────────────────────────

  /** Clicking an empty slot on the calendar — open dialog to set time. */
  const handleSelectSlot = ({ start, end }) => {
    const now = new Date();

    // Reject past days outright
    if (isPastDay(start)) {
      toast({
        title: 'Past date',
        description: 'Please select a future date.',
        variant: 'destructive',
      });
      return;
    }

    // Normalise month-view clicks (they come in at midnight)
    let startDate = new Date(start);
    const isMonthClick = startDate.getHours() === 0 && startDate.getMinutes() === 0;
    if (isMonthClick) startDate.setHours(9, 0, 0, 0);

    // For same-day: bump to earliest valid hour (now+2, rounded up to next hour)
    if (isSameDay(startDate, now)) {
      const earliest = minimumAllowedStart();
      if (isBefore(startDate, earliest)) {
        startDate = new Date(earliest);
        startDate.setMinutes(0, 0, 0); // round up to next clean hour
        if (isBefore(startDate, earliest)) startDate.setHours(startDate.getHours() + 1);
      }
      // If even now+2h is past 19:00, default to 09:00 tomorrow
      if (startDate.getHours() >= 19) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        startDate = tomorrow;
      }
    }

    // Use the actual end time from calendar selection if available, otherwise default to 1 hour
    let endDate = new Date(end);
    if (isMonthClick || endDate <= startDate) {
      endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    }

    setCalendarSlotDate(startDate);
    setCalendarSlotStart(format(startDate, 'HH:mm'));
    setCalendarSlotEnd(format(endDate, 'HH:mm'));
    setCalendarSlotDialogOpen(true);
  };

  /** Confirm time selection from calendar dialog and move to sidebar. */
  const handleConfirmCalendarSlot = () => {
    if (!calendarSlotDate) return;
    setSelectedDate(calendarSlotDate);
    setStartTime(calendarSlotStart);
    setEndTime(calendarSlotEnd);
    setCalendarSlotDialogOpen(false);
    toast({
      title: 'Date selected',
      description: `${format(calendarSlotDate, 'EEEE, MMMM dd, yyyy')} · ${calendarSlotStart} – ${calendarSlotEnd}`,
    });
  };

  /** Clicking an existing event. */
  const handleEventClick = (event) => {
    if (event.status === 'booked') {
      toast({
        title: '🔒 Interview Scheduled',
        description: event.candidateName
          ? `Candidate: ${event.candidateName} · ${format(event.start, 'HH:mm')} – ${format(event.end, 'HH:mm')}`
          : `${format(event.start, 'HH:mm')} – ${format(event.end, 'HH:mm')}`,
      });
      return;
    }

    setEditTarget(event);
    setEditStart(format(event.start, 'HH:mm'));
    setEditEnd(format(event.end, 'HH:mm'));
    setEditDescription(
      event.description &&
      !event.description.startsWith('Interview:') &&
      !event.description.startsWith('Panel Interview:')
        ? event.description : ''
    );
    setEditDialogOpen(true);
  };

  // ── Add slot ──────────────────────────────────────────────────────────────
  const handleAddSlot = async () => {
    if (!selectedDate) {
      toast({ title: 'No date selected', description: 'Click a date on the calendar first', variant: 'destructive' });
      return;
    }

    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const start = new Date(
      selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), sh, sm, 0, 0
    );
    const end = new Date(
      selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), eh, em, 0, 0
    );

    // Client-side validation (mirrors backend)
    const startErr = getSlotStartError(start);
    if (startErr) {
      toast({ title: 'Invalid start time', description: startErr, variant: 'destructive' });
      return;
    }
    if (end <= start) {
      toast({ title: 'End time must be after start time', variant: 'destructive' });
      return;
    }

    try {
      const newSlot = await availabilityAPI.createAvailabilitySlot({
        startDateTime: start.toISOString(),
        endDateTime:   end.toISOString(),
        description:   description || null,
      });
      setEvents((prev) => [
        ...prev,
        {
          id:          newSlot.id,
          title:       newSlot.description || 'Available',
          start:       new Date(newSlot.startDateTime),
          end:         new Date(newSlot.endDateTime),
          status:      newSlot.status.toLowerCase(),
          description: newSlot.description,
        },
      ]);
      setSelectedDate(null);
      setStartTime('09:00');
      setEndTime('10:00');
      setDescription('');
      setAddError(null);
      await loadStats();
      toast({
        title: '✓ Time slot added',
        description: `${format(start, 'MMM dd, yyyy')} · ${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`,
      });
    } catch (error) {
      toast({
        title: 'Failed to add slot',
        description: error.response?.data?.message || 'This time slot may conflict with existing availability',
        variant: 'destructive',
      });
    }
  };

  // ── Edit slot (save) ──────────────────────────────────────────────────────
  const handleEditSave = async () => {
    if (!editTarget) return;
    const refDate  = editTarget.start;
    const newStart = parseTimeOnDate(editStart, refDate);
    const newEnd   = parseTimeOnDate(editEnd,   refDate);

    const startErr = getSlotStartError(newStart);
    if (startErr) {
      toast({ title: 'Invalid start time', description: startErr, variant: 'destructive' });
      return;
    }
    if (newEnd <= newStart) {
      toast({ title: 'End time must be after start time', variant: 'destructive' });
      return;
    }

    setEditSaving(true);
    try {
      const updated = await availabilityAPI.updateAvailabilitySlot(editTarget.id, {
        startDateTime: newStart.toISOString(),
        endDateTime:   newEnd.toISOString(),
        description:   editDescription || null,
      });

      setEvents((prev) =>
        prev.map((e) =>
          e.id === editTarget.id
            ? {
                ...e,
                title:       updated.description || 'Available',
                start:       new Date(updated.startDateTime),
                end:         new Date(updated.endDateTime),
                description: updated.description,
              }
            : e
        )
      );

      setEditDialogOpen(false);
      setEditTarget(null);
      toast({
        title: '✓ Slot updated',
        description: `${format(new Date(updated.startDateTime), 'MMM dd, yyyy')} · ${format(new Date(updated.startDateTime), 'HH:mm')} – ${format(new Date(updated.endDateTime), 'HH:mm')}`,
      });
    } catch (error) {
      toast({
        title: 'Failed to update slot',
        description: error.response?.data?.message || 'Could not update slot',
        variant: 'destructive',
      });
    } finally {
      setEditSaving(false);
    }
  };

  // ── Delete slot ───────────────────────────────────────────────────────────
  const openDeleteDialog = (event, e) => {
    if (e) e.stopPropagation();
    setDeleteTarget(event);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await availabilityAPI.deleteAvailabilitySlot(deleteTarget.id);
      setEvents((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      await loadStats();
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      toast({ title: '✓ Time slot deleted' });
    } catch (error) {
      toast({
        title: 'Failed to delete slot',
        description: error.response?.data?.message || 'Cannot delete booked slots',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  // ── RBC style helpers ─────────────────────────────────────────────────────
  const eventStyleGetter = (event) => {
    const colors = STATUS_COLORS[event.status] || STATUS_COLORS.available;
    return {
      style: {
        background:   colors.bg,
        borderRadius: '5px',
        opacity:      event.status === 'booked' ? 0.88 : 0.96,
        color:        'white',
        borderLeft:   `3px solid ${colors.border}`,
        borderTop:    'none', borderRight: 'none', borderBottom: 'none',
        padding:      '4px 8px',
        fontSize:     '12px',
        fontWeight:   '500',
        boxShadow:    `0 2px 6px ${colors.solid}40`,
        cursor:       'pointer',
        overflow:     'hidden',
      },
    };
  };

  /**
   * Grey-out / block interactions for:
   *   - Any time slot on a past day
   *   - Same-day time slots that are within the 2-hour buffer window
   */
  const slotPropGetter = (date) => {
    const now = new Date();
    if (isPastDay(date)) {
      return {
        className: 'past-time-slot',
        style: { backgroundColor: 'rgba(0,0,0,0.03)', cursor: 'not-allowed', pointerEvents: 'none' },
      };
    }
    if (isSameDay(date, now) && isBefore(date, minimumAllowedStart())) {
      return {
        className: 'past-time-slot',
        style: {
          backgroundColor: 'rgba(239,68,68,0.06)',
          cursor: 'not-allowed',
          pointerEvents: 'none',
          borderLeft: '2px solid rgba(239,68,68,0.2)',
        },
      };
    }
    return {};
  };

  const dayPropGetter = (date) => {
    if (isPastDay(date)) {
      return {
        className: 'past-day',
        style: { backgroundColor: 'rgba(0,0,0,0.02)', cursor: 'not-allowed' },
      };
    }
    return {};
  };

  // ── Derived list ──────────────────────────────────────────────────────────
  const upcomingEvents = events
    .filter((e) => isAfter(new Date(e.start), new Date()))
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .slice(0, 8);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="space-y-6 pb-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">My Availability</h1>
            <p className="text-muted-foreground text-lg">
              Manage your interview availability · click an{' '}
              <span className="text-indigo-600 font-semibold">Available</span> event to edit it
            </p>
          </div>
          <Button
            className="gap-2 px-6 py-3 text-base font-semibold rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
            onClick={() => {
              // Default to tomorrow 09:00 so the button always opens a valid date
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              tomorrow.setHours(9, 0, 0, 0);
              setSelectedDate(tomorrow);
              setStartTime('09:00');
              setEndTime('10:00');
              setDescription('');
            }}
          >
            <Plus className="w-5 h-5" /> Add Time Slot
          </Button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Available Slots', value: stats.availableSlots,  color: 'text-indigo-600',  bg: 'bg-indigo-50',  icon: CalendarIcon },
            { label: 'Booked Slots',    value: stats.bookedSlots,     color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Clock },
            { label: 'Total Hours',
              value: Math.round((stats.availableSlots + stats.bookedSlots) * 1.5),
              color: 'text-amber-600', bg: 'bg-amber-50', icon: AlertCircle },
          ].map(({ label, value, color, bg, icon: Icon }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * (i + 1) }}>
              <Card className="shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
                      <p className={`text-4xl font-bold ${color} mt-1`}>{value}</p>
                    </div>
                    <div className={`p-4 ${bg} rounded-xl`}>
                      <Icon className={`w-7 h-7 ${color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Calendar + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Calendar */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
            className="lg:col-span-3">
            <Card className="shadow-xl border-t-4 border-t-indigo-400">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <CalendarIcon className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Availability Calendar</CardTitle>
                    <CardDescription className="mt-1">
                      Click an empty slot to add availability · click an <strong>Available</strong> event to edit ·
                      🔒 = already booked · <span className="text-red-400">red tint</span> = within 2-hour buffer
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-5 mt-3 flex-wrap">
                  {Object.entries(STATUS_COLORS).map(([key, { solid, label }]) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-md shadow-sm"
                        style={{ background: `linear-gradient(135deg, ${solid}, ${solid}cc)` }} />
                      <span className="text-sm font-medium text-muted-foreground">{label}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-md" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }} />
                    <span className="text-sm font-medium text-muted-foreground">2-hour buffer</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground italic ml-2">
                    <Pencil className="w-3 h-3" /> Click Available event to edit
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="h-[700px] flex items-center justify-center">
                      <div className="text-center">
                        <div className="relative w-16 h-16 mx-auto mb-6">
                          <div className="absolute inset-0 border-4 border-indigo-200 rounded-full" />
                          <div className="absolute inset-0 border-4 border-t-indigo-500 rounded-full animate-spin" />
                        </div>
                        <p className="text-muted-foreground text-lg font-medium">Loading calendar…</p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="availability-calendar-container" style={{ height: '700px' }}>
                      <Calendar
                        localizer={localizer}
                        events={events}
                        startAccessor="start"
                        endAccessor="end"
                        onSelectSlot={handleSelectSlot}
                        onSelectEvent={handleEventClick}
                        selectable
                        eventPropGetter={eventStyleGetter}
                        slotPropGetter={slotPropGetter}
                        dayPropGetter={dayPropGetter}
                        style={{ height: '100%' }}
                        views={['month', 'week', 'day']}
                        defaultView="week"
                        step={60}
                        timeslots={1}
                        min={new Date(1970, 0, 1, 7, 0)}
                        max={new Date(1970, 0, 1, 19, 0)}
                        scrollToTime={new Date(1970, 0, 1, 8, 0)}
                        popup
                        showMultiDayTimes
                        tooltipAccessor={(event) => {
                          if (event.status === 'booked')
                            return `🔒 Booked${event.candidateName ? ': ' + event.candidateName : ''}\n${format(event.start, 'HH:mm')} – ${format(event.end, 'HH:mm')}`;
                          return `✏️ Click to edit\n${event.title}\n${format(event.start, 'HH:mm')} – ${format(event.end, 'HH:mm')}`;
                        }}
                        formats={{
                          timeGutterFormat: 'HH:mm',
                          eventTimeRangeFormat: ({ start, end }) =>
                            `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`,
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sidebar */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
            className="space-y-6">

          

            {/* Upcoming slots */}
            <Card className="shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-500" /> Upcoming Slots
                </CardTitle>
                <CardDescription>Click Available to edit · hover for delete</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
                  {upcomingEvents.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground font-medium">No upcoming slots</p>
                    </div>
                  ) : (
                    upcomingEvents.map((event, index) => {
                      const colors = STATUS_COLORS[event.status] || STATUS_COLORS.available;
                      const isAvailable = event.status === 'available';
                      return (
                        <motion.div key={event.id}
                          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.04 }}
                          className={`group flex items-start justify-between p-3 rounded-lg border-2 transition-all cursor-pointer
                            ${isAvailable ? 'hover:border-indigo-300 hover:bg-indigo-50/40' : 'hover:bg-accent/30 cursor-default'}`}
                          onClick={() => isAvailable && handleEventClick(event)}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-2.5 h-2.5 rounded-full flex-none" style={{ backgroundColor: colors.solid }} />
                              <span className="text-sm font-semibold truncate">{format(event.start, 'MMM dd, yyyy')}</span>
                              {isAvailable && (
                                <Pencil className="w-3 h-3 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </div>
                            {event.status === 'booked' && event.candidateName && (
                              <div className="flex items-center gap-1 mb-1">
                                <User className="w-3 h-3 text-emerald-600" />
                                <p className="text-xs font-medium text-emerald-700">{event.candidateName}</p>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground font-medium">
                              {format(event.start, 'HH:mm')} – {format(event.end, 'HH:mm')}
                            </p>
                            <Badge className="mt-2 text-xs capitalize" variant="outline"
                              style={{ borderColor: colors.solid + '40', color: colors.solid, backgroundColor: colors.solid + '10' }}>
                              {event.status}
                            </Badge>
                          </div>
                          {isAvailable && (
                            <div className="flex flex-col gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                                onClick={(e) => { e.stopPropagation(); handleEventClick(event); }} title="Edit slot">
                                <Pencil className="w-3.5 h-3.5 text-indigo-500" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                                onClick={(e) => openDeleteDialog(event, e)} title="Delete slot">
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* ══ EDIT SLOT DIALOG ═══════════════════════════════════════════════ */}
      <Dialog open={editDialogOpen} onOpenChange={(o) => { if (!editSaving) setEditDialogOpen(o); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-700">
              <Pencil className="w-5 h-5" /> Edit Availability Slot
            </DialogTitle>
            <DialogDescription>
              Update the time range or description. Booked slots cannot be edited.
            </DialogDescription>
          </DialogHeader>

          {editTarget && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/50">
                <p className="text-xs text-muted-foreground mb-1">Editing slot</p>
                <p className="font-semibold text-sm">{format(editTarget.start, 'EEEE, MMMM dd, yyyy')}</p>
                <p className="text-xs text-indigo-600 mt-0.5">
                  Currently: {format(editTarget.start, 'HH:mm')} – {format(editTarget.end, 'HH:mm')}
                </p>
              </div>

              {editError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-700">{editError}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="font-semibold">Description (Optional)</Label>
                <Input
                  placeholder="e.g., Technical Interview, Code Review"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="border-2 focus:border-indigo-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="font-semibold">Start Time</Label>
                  <div className="flex items-center gap-2 p-2 border-2 border-indigo-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-indigo-400">
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={editStart.split(':')[0]}
                      onChange={(e) => {
                        const h = Math.max(0, Math.min(23, parseInt(e.target.value) || 0));
                        const m = editStart.split(':')[1] || '00';
                        setEditStart(`${String(h).padStart(2, '0')}:${m}`);
                      }}
                      className="w-12 text-center font-bold text-lg border-0 bg-transparent focus:outline-none"
                      placeholder="09"
                    />
                    <span className="text-2xl font-bold text-indigo-400">:</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={editStart.split(':')[1]}
                      onChange={(e) => {
                        const h = editStart.split(':')[0] || '09';
                        const m = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                        setEditStart(`${h}:${String(m).padStart(2, '0')}`);
                      }}
                      className="w-12 text-center font-bold text-lg border-0 bg-transparent focus:outline-none"
                      placeholder="00"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">End Time</Label>
                  <div className="flex items-center gap-2 p-2 border-2 border-indigo-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-indigo-400">
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={editEnd.split(':')[0]}
                      onChange={(e) => {
                        const h = Math.max(0, Math.min(23, parseInt(e.target.value) || 0));
                        const m = editEnd.split(':')[1] || '00';
                        setEditEnd(`${String(h).padStart(2, '0')}:${m}`);
                      }}
                      className="w-12 text-center font-bold text-lg border-0 bg-transparent focus:outline-none"
                      placeholder="10"
                    />
                    <span className="text-2xl font-bold text-indigo-400">:</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={editEnd.split(':')[1]}
                      onChange={(e) => {
                        const h = editEnd.split(':')[0] || '10';
                        const m = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                        setEditEnd(`${h}:${String(m).padStart(2, '0')}`);
                      }}
                      className="w-12 text-center font-bold text-lg border-0 bg-transparent focus:outline-none"
                      placeholder="00"
                    />
                  </div>
                </div>
              </div>

              {editStart && editEnd && editEnd > editStart && !editError && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  <p className="text-sm text-green-800">
                    <strong>New window:</strong>{' '}
                    {format(parseTimeOnDate(editStart, editTarget.start), 'h:mm a')} –{' '}
                    {format(parseTimeOnDate(editEnd,   editTarget.start), 'h:mm a')} on{' '}
                    {format(editTarget.start, 'MMM dd')}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={editSaving}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={editSaving || !!editError || editEnd <= editStart}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              {editSaving
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                : <><Save className="w-4 h-4" /> Save Changes</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ DELETE CONFIRM DIALOG ═════════════════════════════════════════ */}
      <Dialog open={deleteDialogOpen} onOpenChange={(o) => { if (!deleting) setDeleteDialogOpen(o); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Trash2 className="w-5 h-5" /> Delete Slot
            </DialogTitle>
            <DialogDescription>
              This will permanently remove the availability slot. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="rounded-xl border-2 border-red-100 bg-red-50 p-4">
              <p className="font-semibold text-sm">{format(deleteTarget.start, 'EEEE, MMMM dd, yyyy')}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {format(deleteTarget.start, 'HH:mm')} – {format(deleteTarget.end, 'HH:mm')}
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>Keep Slot</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting} className="gap-2">
              {deleting
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting…</>
                : <><Trash2 className="w-4 h-4" /> Delete Slot</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ CALENDAR SLOT PICKER DIALOG ════════════════════════════════════ */}
      <Dialog open={calendarSlotDialogOpen} onOpenChange={setCalendarSlotDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-700">
              <CalendarIcon className="w-5 h-5" /> Select Time Slot
            </DialogTitle>
            <DialogDescription>
              Set the start and end time for your availability slot
            </DialogDescription>
          </DialogHeader>

          {calendarSlotDate && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/50">
                <p className="text-xs text-muted-foreground mb-1">Selected Date</p>
                <p className="font-semibold text-sm">{format(calendarSlotDate, 'EEEE, MMMM dd, yyyy')}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="font-semibold">Start Time</Label>
                  <div className="flex items-center gap-2 p-2 border-2 border-indigo-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-indigo-400">
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={calendarSlotStart.split(':')[0]}
                      onChange={(e) => {
                        const h = Math.max(0, Math.min(23, parseInt(e.target.value) || 0));
                        const m = calendarSlotStart.split(':')[1] || '00';
                        setCalendarSlotStart(`${String(h).padStart(2, '0')}:${m}`);
                      }}
                      className="w-12 text-center font-bold text-lg border-0 bg-transparent focus:outline-none"
                      placeholder="09"
                    />
                    <span className="text-2xl font-bold text-indigo-400">:</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={calendarSlotStart.split(':')[1]}
                      onChange={(e) => {
                        const h = calendarSlotStart.split(':')[0] || '09';
                        const m = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                        setCalendarSlotStart(`${h}:${String(m).padStart(2, '0')}`);
                      }}
                      className="w-12 text-center font-bold text-lg border-0 bg-transparent focus:outline-none"
                      placeholder="00"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">End Time</Label>
                  <div className="flex items-center gap-2 p-2 border-2 border-indigo-300 rounded-lg bg-white focus-within:ring-2 focus-within:ring-indigo-400">
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={calendarSlotEnd.split(':')[0]}
                      onChange={(e) => {
                        const h = Math.max(0, Math.min(23, parseInt(e.target.value) || 0));
                        const m = calendarSlotEnd.split(':')[1] || '00';
                        setCalendarSlotEnd(`${String(h).padStart(2, '0')}:${m}`);
                      }}
                      className="w-12 text-center font-bold text-lg border-0 bg-transparent focus:outline-none"
                      placeholder="10"
                    />
                    <span className="text-2xl font-bold text-indigo-400">:</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={calendarSlotEnd.split(':')[1]}
                      onChange={(e) => {
                        const h = calendarSlotEnd.split(':')[0] || '10';
                        const m = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                        setCalendarSlotEnd(`${h}:${String(m).padStart(2, '0')}`);
                      }}
                      className="w-12 text-center font-bold text-lg border-0 bg-transparent focus:outline-none"
                      placeholder="00"
                    />
                  </div>
                </div>
              </div>

              {calendarSlotStart && calendarSlotEnd && calendarSlotEnd > calendarSlotStart && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  <p className="text-sm text-green-800">
                    <strong>Slot:</strong> {calendarSlotStart} – {calendarSlotEnd}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCalendarSlotDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmCalendarSlot} disabled={calendarSlotEnd <= calendarSlotStart}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              <CheckCircle2 className="w-4 h-4" /> Confirm Time
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AvailabilityPage;