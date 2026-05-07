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
  DialogHeader, DialogTitle, DialogBody,
} from '@/components/ui/dialog';
import {
  Plus, Clock, Trash2, Calendar as CalendarIcon, AlertCircle, User,
  Pencil, Save, X, CheckCircle2, ChevronLeft, ChevronRight, Eye, EyeOff,
} from 'lucide-react';
import Layout   from '@/components/layout/Layout';
import TimePicker from '@/components/TimePicker';
import { useCalendarFormats } from '@/hooks/useCalendarFormats';
import { motion, AnimatePresence } from 'framer-motion';
import { toast }                  from '@/hooks/use-toast';
import { availabilityAPI }        from '@/services/availabilityAPI';
import UpcomingCard from './components/UpcomingCard';
import AddSlotDialog from './components/AddSlotDialog';
import EditSlotDialog from './components/EditSlotDialog';
import DeleteSlotDialog from './components/DeleteSlotDialog';


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
const minimumAllowedStart = () => addHours(new Date(), 0.5);

/**
 * Validate a proposed start time.
 * Returns an error string or null if valid.
 */
const getSlotStartError = (start) => {
  if (!start) return null;
  if (isPastDay(start)) return 'Cannot add slots for past dates.';
  if (isSameDay(start, new Date()) && isBefore(start, minimumAllowedStart())) {
    const earliest = format(minimumAllowedStart(), 'HH:mm');
    return `Same-day slots must start at least 30 Minutes from now (earliest: ${earliest}).`;
  }
  return null;
};

const CalendarToolbar = ({ label, onNavigate, onView, view, views, showUpcomingSlots, onToggleUpcomingSlots }) => {
  const viewList = Array.isArray(views) ? views : Object.keys(views || {});

  return (
    <div className="rbc-toolbar flex flex-col gap-3 px-2 py-2 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onNavigate('PREV')} className="h-9 w-9 p-0">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => onNavigate('TODAY')} className="h-9 px-3 text-sm font-medium">
          Today
        </Button>
        <Button variant="outline" size="sm" onClick={() => onNavigate('NEXT')} className="h-9 w-9 p-0">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <span className="rbc-toolbar-label text-base font-semibold text-foreground md:text-lg">{label}</span>

      <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
        {viewList.map((availableView) => (
          <Button
            key={availableView}
            variant={view === availableView ? 'default' : 'outline'}
            size="sm"
            onClick={() => onView(availableView)}
            className="h-9 px-3 capitalize"
          >
            {availableView}
          </Button>
        ))}
        <Button
          variant={showUpcomingSlots ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleUpcomingSlots}
          className="h-9 gap-2 px-3"
        >
         
          {showUpcomingSlots ? 'Hide Upcoming' : 'Show Upcoming'}
        </Button>
      </div>
    </div>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────
const AvailabilityPage = () => {
  const calendarFormats = useCalendarFormats();
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats]     = useState({ availableSlots: 0, bookedSlots: 0 });
  const [showUpcomingSlots, setShowUpcomingSlots] = useState(true);

  // Add-slot state
  const [selectedDate, setSelectedDate]   = useState(null);
  const [startTime, setStartTime]         = useState('09:00');
  const [endTime, setEndTime]             = useState('10:00');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [description, setDescription]     = useState('');
  const [addError, setAddError]           = useState(null);

  // Edit-slot state
  const [editTarget, setEditTarget]       = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editStart, setEditStart]         = useState('');
  const [editEnd, setEditEnd]             = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSaving, setEditSaving]       = useState(false);
  const [editError, setEditError]         = useState(null);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting]           = useState(false);
  const [availablePage, setAvailablePage] = useState(1);
  const [bookedPage, setBookedPage] = useState(1);
  // ── Data loading 
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
  setAddDialogOpen(true); 
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

    const now = new Date();
    const [ch, cm] = [now.getHours(), now.getMinutes()];
    const currentDate = new Date(
      now.getFullYear(),now.getMonth(), now.getDate(),ch,cm,0, 0
    );

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
        currentTime: currentDate,
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

    
    const now = new Date();
    const [ch, cm] = [now.getHours(), now.getMinutes()];
    const currentDate = new Date(
      now.getFullYear(),now.getMonth(), now.getDate(),ch,cm,0, 0
    );

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
        currentTime:   currentDate,
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

  const handleAddSuccess = useCallback(async (newSlot) => {
    setEvents((prev) => [
      ...prev,
      {
        id: newSlot.id,
        title: newSlot.description || 'Available',
        start: new Date(newSlot.startDateTime),
        end: new Date(newSlot.endDateTime),
        status: newSlot.status.toLowerCase(),
        description: newSlot.description,
      },
    ]);
    setSelectedDate(null);
    setStartTime('09:00');
    setEndTime('10:00');
    setDescription('');
    setAddError(null);
    await loadStats();
  }, [loadStats]);

  const handleEditSuccess = useCallback(async (updated) => {
    setEvents((prev) => prev.map((event) => (
      event.id === updated.id
        ? {
            ...event,
            title: updated.description || 'Available',
            start: new Date(updated.startDateTime),
            end: new Date(updated.endDateTime),
            description: updated.description,
          }
        : event
    )));
    setEditDialogOpen(false);
    setEditTarget(null);
    await loadStats();
  }, [loadStats]);

  const handleDeleteSuccess = useCallback(async () => {
    if (!deleteTarget) return;
    setEvents((prev) => prev.filter((event) => event.id !== deleteTarget.id));
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
    await loadStats();
  }, [deleteTarget, loadStats]);

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
              <span className="text-indigo-600 font-semibold"></span> event to edit it
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
                        components={{
                          toolbar: (toolbarProps) => (
                            <CalendarToolbar
                              {...toolbarProps}
                              showUpcomingSlots={showUpcomingSlots}
                              onToggleUpcomingSlots={() => setShowUpcomingSlots((value) => !value)}
                            />
                          ),
                        }}
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

          {showUpcomingSlots && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="min-w-0"
            >
              <UpcomingCard
                events={events}
                stats={stats}
                onEventClick={handleEventClick}
                onDeleteClick={openDeleteDialog}
              />
            </motion.div>
          )}
        </div>

      </div>

      <AddSlotDialog
        isOpen={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) setSelectedDate(null);
        }}
        selectedDate={selectedDate}
        defaultStartTime={startTime}
        defaultEndTime={endTime}
        onSuccess={handleAddSuccess}
        getSlotStartError={getSlotStartError}
      />

      <EditSlotDialog
        isOpen={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setEditTarget(null);
        }}
        slot={editTarget}
        onSuccess={handleEditSuccess}
        onDelete={() => {
          setEditDialogOpen(false);
          if (editTarget) {
            setDeleteTarget(editTarget);
            setDeleteDialogOpen(true);
          }
        }}
        getSlotStartError={getSlotStartError}
      />

      <DeleteSlotDialog
        isOpen={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setDeleteTarget(null);
        }}
        slot={deleteTarget}
        onSuccess={handleDeleteSuccess}
      />
    </Layout>
  );
};

export default AvailabilityPage;