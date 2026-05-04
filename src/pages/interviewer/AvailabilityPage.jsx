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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus, Clock, Trash2, Calendar as CalendarIcon, AlertCircle, User,
  Pencil, Save, X, CheckCircle2,
} from 'lucide-react';
import Layout   from '@/components/layout/Layout';
import TimePicker from '@/components/TimePicker';
import { useCalendarFormats } from '@/hooks/useCalendarFormats';
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
const UPCOMING_SLOTS_PER_PAGE = 5;

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
  const calendarFormats = useCalendarFormats();
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats]     = useState({ availableSlots: 0, bookedSlots: 0 });

  // Add-slot state
  const [selectedDate, setSelectedDate]   = useState(null);
  const [startTime, setStartTime]         = useState('09:00');
  const [endTime, setEndTime]             = useState('10:00');
  const [description, setDescription]     = useState('');
  const [addError, setAddError]           = useState(null);

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
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [availablePage, setAvailablePage] = useState(1);
  const [bookedPage, setBookedPage] = useState(1);
// ... existing state
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

  /** Clicking an empty slot on the calendar — select the date for the Add form. */
  // const handleSelectSlot = ({ start }) => {
  //   const now = new Date();

  //   // Reject past days outright
  //   if (isPastDay(start)) {
  //     toast({
  //       title: 'Past date',
  //       description: 'Please select a future date.',
  //       variant: 'destructive',
  //     });
  //     return;
  //   }

  //   // Normalise month-view clicks (they come in at midnight)
  //   let startDate = new Date(start);
  //   const isMonthClick = startDate.getHours() === 0 && startDate.getMinutes() === 0;
  //   if (isMonthClick) startDate.setHours(9, 0, 0, 0);

  //   // For same-day: bump to earliest valid hour (now+2, rounded up to next hour)
  //   if (isSameDay(startDate, now)) {
  //     const earliest = minimumAllowedStart();
  //     if (isBefore(startDate, earliest)) {
  //       startDate = new Date(earliest);
  //       startDate.setMinutes(0, 0, 0); // round up to next clean hour
  //       if (isBefore(startDate, earliest)) startDate.setHours(startDate.getHours() + 1);
  //     }
  //     // If even now+2h is past 19:00, default to 09:00 tomorrow
  //     if (startDate.getHours() >= 19) {
  //       const tomorrow = new Date(now);
  //       tomorrow.setDate(tomorrow.getDate() + 1);
  //       tomorrow.setHours(9, 0, 0, 0);
  //       startDate = tomorrow;
  //     }
  //   }

  //   const end = new Date(startDate.getTime() + 60 * 60 * 1000);
  //   setSelectedDate(startDate);
  //   setStartTime(format(startDate, 'HH:mm'));
  //   setEndTime(format(end, 'HH:mm'));

  //   toast({
  //     title: 'Date selected',
  //     description: `${format(startDate, 'MMM dd, yyyy')} · ${format(startDate, 'HH:mm')} – ${format(end, 'HH:mm')}`,
  //   });
  // };
/** Clicking or dragging a slot on the calendar */
// const handleSelectSlot = ({ start, end }) => {
//   const now = new Date();

//   // 1. Reject past days
//   if (isPastDay(start)) {
//     toast({
//       title: 'Past date',
//       description: 'Please select a future date.',
//       variant: 'destructive',
//     });
//     return;
//   }

//   let startDate = new Date(start);
//   let endDate = new Date(end);

//   // 2. Handle Month View clicks (which come in as 00:00 to 00:00)
//   // If the selection is exactly 24 hours or starts at midnight, 
//   // we default to a standard 9-10 AM slot for that day.
//   const isMidnight = startDate.getHours() === 0 && startDate.getMinutes() === 0;
//   const isFullDay = (endDate - startDate) === 86400000;

//   if (isMidnight && (isFullDay || endDate.getHours() === 0)) {
//     startDate.setHours(9, 0, 0, 0);
//     endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1hr
//   }

//   // 3. Same-day buffer validation (now + 2 hours)
//   if (isSameDay(startDate, now)) {
//     const earliest = minimumAllowedStart();
//     if (isBefore(startDate, earliest)) {
//       startDate = new Date(earliest);
//       startDate.setMinutes(0, 0, 0);
//       // Ensure start is at least the next clean hour if it's too early
//       if (isBefore(startDate, earliest)) {
//         startDate.setHours(startDate.getHours() + 1);
//       }
//       // Re-adjust endDate to maintain the selected duration if it's now invalid
//       if (isBefore(endDate, addHours(startDate, 1))) {
//         endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
//       }
//     }
//   }

//   // 4. Update the actual UI strings dynamically
//   const startStr = format(startDate, 'HH:mm');
//   const endStr = format(endDate, 'HH:mm');

//   setSelectedDate(startDate);
//   setStartTime(startStr);
//   setEndTime(endStr); // <--- This now maps exactly to the calendar selection

//   toast({
//     title: 'Time range selected',
//     description: `${format(startDate, 'MMM dd')} · ${startStr} – ${endStr}`,
//   });
// };
  
const handleSelectSlot = ({ start, end }) => {
  const now = new Date();
  if (isPastDay(start)) {
    toast({ title: 'Past date', variant: 'destructive' });
    return;
  }

  let startDate = new Date(start);
  let endDate = new Date(end);

  // Month view/Midnight fix
  if (startDate.getHours() === 0 && startDate.getMinutes() === 0) {
    startDate.setHours(9, 0, 0, 0);
    endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  }

  // Same-day buffer
  if (isSameDay(startDate, now)) {
    const earliest = minimumAllowedStart();
    if (isBefore(startDate, earliest)) {
      startDate = new Date(earliest);
      startDate.setMinutes(0, 0, 0);
      if (isBefore(startDate, earliest)) startDate.setHours(startDate.getHours() + 1);
      endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    }
  }

  setSelectedDate(startDate);
  setStartTime(format(startDate, 'HH:mm'));
  setEndTime(format(endDate, 'HH:mm'));
  setAddDialogOpen(true); // Open the modal automatically
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
        startDateTime: start,
        endDateTime:   end,
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
        startDateTime: newStart,
        endDateTime:   newEnd,
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
    .sort((a, b) => new Date(a.start) - new Date(b.start));
  const availableUpcomingEvents = upcomingEvents.filter((e) => e.status === 'available');
  const bookedUpcomingEvents = upcomingEvents.filter((e) => e.status === 'booked');
  const availableTotalPages = Math.max(1, Math.ceil(availableUpcomingEvents.length / UPCOMING_SLOTS_PER_PAGE));
  const bookedTotalPages = Math.max(1, Math.ceil(bookedUpcomingEvents.length / UPCOMING_SLOTS_PER_PAGE));
  const availablePageItems = availableUpcomingEvents.slice(
    (availablePage - 1) * UPCOMING_SLOTS_PER_PAGE,
    availablePage * UPCOMING_SLOTS_PER_PAGE
  );
  const bookedPageItems = bookedUpcomingEvents.slice(
    (bookedPage - 1) * UPCOMING_SLOTS_PER_PAGE,
    bookedPage * UPCOMING_SLOTS_PER_PAGE
  );

  useEffect(() => {
    if (availablePage > availableTotalPages) setAvailablePage(availableTotalPages);
    if (bookedPage > bookedTotalPages) setBookedPage(bookedTotalPages);
  }, [availablePage, bookedPage, availableTotalPages, bookedTotalPages]);

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
         
        </motion.div>

        {/* Calendar + Sidebar */}
        <div className="flex flex-col lg:flex-row gap-3 ">

          {/* Calendar */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
            className="flex-1">
            <Card className="shadow-xl border-t-4">
              <CardContent className="p-1">
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
                      className="availability-calendar-container" style={{ width: '100%', height : '75vh' }}>
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
                        min={new Date(1970, 0, 1, 0, 0, 0)}
                        max={new Date(1970, 0, 1, 23, 59, 59)}
                        scrollToTime={new Date(1970, 0, 1, 8, 0)}
                        popup
                        showMultiDayTimes
                        tooltipAccessor={(event) => {
                          if (event.status === 'booked')
                            return `🔒 Booked${event.candidateName ? ': ' + event.candidateName : ''}\n${format(event.start, calendarFormats.timeGutterFormat)} – ${format(event.end, calendarFormats.timeGutterFormat)}`;
                          return `✏️ Click to edit\n${event.title}\n${format(event.start, calendarFormats.timeGutterFormat)} – ${format(event.end, calendarFormats.timeGutterFormat)}`;
                        }}
                        formats={calendarFormats}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sidebar */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ delay: 0.5 }}
            className="flex-2 min-w-[420px] flex flex-col"
          >

               
            <Card className="shadow-lg border-t-4 border-indigo-500 h-full flex flex-col overflow-hidden">
              <CardHeader className="pb-3 bg-slate-50/50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-500" /> Upcoming Slots
                </CardTitle>
                
                {/* INTEGRATED AVAILABILITY OVERVIEW */}
                <div className="grid grid-cols-3 gap-1 mt-4 pt-4 border-t border-slate-200">
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Available</p>
                    <p className="text-lg font-bold text-indigo-600">{stats.availableSlots}</p>
                  </div>
                  <div className="text-center border-x border-slate-200">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Booked</p>
                    <p className="text-lg font-bold text-emerald-600">{stats.bookedSlots}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Total Hrs</p>
                    <p className="text-lg font-bold text-amber-600">
                      {Math.round((stats.availableSlots + stats.bookedSlots) * 1.5)}h
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-grow flex flex-col overflow-hidden p-0">
                <Tabs defaultValue="available" className="flex flex-col h-full">
                  <TabsList className="w-full rounded-none border-b bg-slate-50 p-0">
                    <TabsTrigger 
                      value="available" 
                      className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-white"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-semibold">Available</span>
                        <Badge className="text-xs" variant="outline">{availableUpcomingEvents.length}</Badge>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="booked" 
                      className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-white"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm font-semibold">Booked</span>
                        <Badge className="text-xs" variant="outline">{bookedUpcomingEvents.length}</Badge>
                      </div>
                    </TabsTrigger>
                  </TabsList>

                  {/* Available Slots Tab */}
                  <TabsContent value="available" className="flex-grow overflow-hidden p-3">
                    <div className="flex-grow overflow-y-auto pr-1 space-y-2 custom-scrollbar h-full">
                      {availableUpcomingEvents.length === 0 ? (
                        <div className="text-center py-10 flex flex-col items-center justify-center h-full">
                          <CalendarIcon className="w-8 h-8 mb-2 text-slate-300" />
                          <p className="text-xs text-muted-foreground font-medium">No available slots</p>
                        </div>
                      ) : (
                        availablePageItems.map((event, index) => {
                            const colors = STATUS_COLORS[event.status];
                            return (
                              <motion.div key={event.id}
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.04 }}
                                className="group relative flex flex-col p-2.5 rounded-xl border-2 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all cursor-pointer"
                                onClick={() => handleEventClick(event)}>
                                
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-bold text-slate-700">{format(event.start, 'MMM dd, yyyy')}</span>
                                  
                                </div>

                                <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  {format(event.start, 'HH:mm')} – {format(event.end, 'HH:mm')}
                                </div>

                                {event.description && (
                                  <p className="text-[10px] text-slate-600 mt-1 truncate">{event.description}</p>
                                )}

                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-100 transition-opacity">
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-indigo-100" onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}>
                                    <Pencil className="w-4 h-4 text-indigo-600" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-red-100" onClick={(e) => openDeleteDialog(event, e)}>
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </Button>
                                </div>
                              </motion.div>
                            );
                          })
                      )}
                      {availableUpcomingEvents.length > 0 && (
                        <div className="flex items-center justify-between pt-2 border-t mt-2">
                          <span className="text-[11px] text-muted-foreground">
                            Page {availablePage} of {availableTotalPages}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              disabled={availablePage === 1}
                              onClick={() => setAvailablePage((p) => Math.max(1, p - 1))}
                            >
                              Prev
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              disabled={availablePage === availableTotalPages}
                              onClick={() => setAvailablePage((p) => Math.min(availableTotalPages, p + 1))}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Booked Slots Tab */}
                  <TabsContent value="booked" className="flex-grow overflow-hidden p-3">
                    <div className="flex-grow overflow-y-auto pr-1 space-y-2 custom-scrollbar h-full">
                      {bookedUpcomingEvents.length === 0 ? (
                        <div className="text-center py-10 flex flex-col items-center justify-center h-full">
                          <CalendarIcon className="w-8 h-8 mb-2 text-slate-300" />
                          <p className="text-xs text-muted-foreground font-medium">No booked slots</p>
                        </div>
                      ) : (
                        bookedPageItems.map((event, index) => {
                            const colors = STATUS_COLORS[event.status];
                            return (
                              <motion.div key={event.id}
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.04 }}
                                className="flex flex-col p-2.5 rounded-xl border-2 border-emerald-100 bg-emerald-50/30 transition-all">
                                
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-bold text-slate-700">{format(event.start, 'MMM dd, yyyy')}</span>
                                  <Badge className="text-[9px] h-4 px-1 capitalize" style={{ backgroundColor: colors.solid }}>
                                    Booked
                                  </Badge>
                                </div>

                                <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  {format(event.start, 'HH:mm')} – {format(event.end, 'HH:mm')}
                                </div>

                                {event.candidateName && (
                                  <div className="mt-1.5 flex items-center gap-1 bg-emerald-100 p-1.5 rounded border border-emerald-200">
                                    <User className="w-3 h-3 text-emerald-700" />
                                    <p className="text-[10px] font-semibold text-emerald-700 truncate">{event.candidateName}</p>
                                  </div>
                                )}
                              </motion.div>
                            );
                          })
                      )}
                      {bookedUpcomingEvents.length > 0 && (
                        <div className="flex items-center justify-between pt-2 border-t mt-2">
                          <span className="text-[11px] text-muted-foreground">
                            Page {bookedPage} of {bookedTotalPages}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              disabled={bookedPage === 1}
                              onClick={() => setBookedPage((p) => Math.max(1, p - 1))}
                            >
                              Prev
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              disabled={bookedPage === bookedTotalPages}
                              onClick={() => setBookedPage((p) => Math.min(bookedTotalPages, p + 1))}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>




                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogContent className="max-w-md">
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
                      {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
                    </p>
                  </div>
                )}

                {addError && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-700">{addError}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="font-semibold">Description (Optional)</Label>
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
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                <Button 
                  onClick={async () => {
                    await handleAddSlot();
                    setAddDialogOpen(false); // Close on success
                  }} 
                  disabled={!!addError || !selectedDate}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Create Slot
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
                <TimePicker
                  value={editStart}
                  onChange={setEditStart}
                  label="Start Time"
                />
                <TimePicker
                  value={editEnd}
                  onChange={setEditEnd}
                  label="End Time"
                />
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
            <Button 
              variant="destructive" 
              onClick={() => {
                setEditDialogOpen(false);
                openDeleteDialog(editTarget);
              }} 
              disabled={editSaving}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
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
    </Layout>
  );
};

export default AvailabilityPage;