import { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar } from 'react-big-calendar';
import {
  format,
  addMinutes, isSameDay, startOfDay, isBefore, startOfMonth, endOfMonth, startOfWeek, endOfWeek, endOfDay,
} from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '@/styles/AvailabilityCalendar.css';

import {
  Card, CardContent,
} from '@/components/ui/card';
import { Button }   from '@/components/ui/button';
import {
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import Layout   from '@/components/layout/Layout';
import { useCalendarFormats } from '@/hooks/useCalendarFormats';
import { motion, AnimatePresence } from 'framer-motion';
import { toast }                  from '@/hooks/use-toast';
import { availabilityAPI }        from '@/services/availabilityAPI';
import { InterviewScheduleStatus, SlotStatus } from '@/lib/statusConstants';
import UpcomingCard from './components/UpcomingCard';
import AddSlotDialog from './components/AddSlotDialog';
import EditSlotDialog from './components/EditSlotDialog';
import DeleteSlotDialog from './components/DeleteSlotDialog';
import InterviewStartDialog from './components/InterviewStartDialog';
import { calendarLocalizer, computeSlotDurationHours } from '@/lib/calendarUtils';
import { localizer, formatLocalDateTime, formatInputDate, generateTimeOptions, parseTimeOnDate, checkInterviewerPrivilege, checkPanelPrivilege, formatSlots } from './../hr/utils/AvailabilityViewPageHelperUtils';


// ── Status colours ────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  available: {
    bg: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    border: '#312e81',
    solid: '#6366f1',
    label: 'Available',
  },
  booked: {
    bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: '#065f46',
    solid: '#10b981',
    label: 'Booked',
  },
  completed: {
    bg: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    border: '#064e3b',
    solid: '#059669',
    label: 'Completed',
  },
  blocked: {
    bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    border: '#92400e',
    solid: '#f59e0b',
    label: 'Blocked',
  },
};

const CALENDAR_PAGE_SIZES = {
  month: 500,
  week: 200,
  day: 100,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns true when the date is strictly before today (midnight normalised). */
const isPastDay = (date) => {
  const today = startOfDay(new Date());
  return startOfDay(date) < today;
};
const getSlotStartError = (start) => {
  if (!start) return null;
  if (isPastDay(start)) return 'Cannot add slots for past dates.';
  if (isSameDay(start, new Date()) && isBefore(start, minimumAllowedStart())) {
    const earliest = format(minimumAllowedStart(), 'HH:mm');
    return `Same-day slots must start at least 30 Minutes from now (earliest: ${earliest}).`;
  }
  return null;
};

/** Minimum allowed start time for same-day slots: 30 minutes from now. */
const minimumAllowedStart = () => {
  return addMinutes(new Date(), 30);
};

const CalendarToolbar = ({ label, onNavigate, onView, view, views, showUpcomingSlots, onToggleUpcomingSlots, loading }) => {
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
        {loading && (
          <div className="flex items-center mr-2">
            <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
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
  const [currentView, setCurrentView] = useState('week');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const navTimerRef = useRef(null);
  const viewTimerRef = useRef(null);
  const [stats, setStats]     = useState({ availableSlots: 0, bookedSlots: 0 });
  const [showUpcomingSlots, setShowUpcomingSlots] = useState(true);

  // Add-slot state
  const [selectedDate, setSelectedDate]   = useState(null);
  const [startTime, setStartTime]         = useState('');
  const [endTime, setEndTime]             = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Edit-slot state
  const [editTarget, setEditTarget]       = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Interview start dialog state
  const [isInterviewStartDialogOpen, setIsInterviewStartDialogOpen] = useState(false);
  const [selectedInterviewScheduleId, setSelectedInterviewScheduleId] = useState(null);
  // ── Data loading 
  const mapSlotsToEvents = (data) => data.map((slot) => {
    const isCompleted = slot.interviewStatus === InterviewScheduleStatus.COMPLETED;
    const statusKey = slot.status === SlotStatus.BOOKED
      ? (isCompleted ? 'completed' : 'booked')
      : slot.status.toLowerCase();

    return {
      id: slot.id,
      title: slot.status === SlotStatus.BOOKED
        ? (isCompleted
          ? `✓ ${slot.candidateName || 'Interview Completed'}`
          : `🔒 ${slot.candidateName || 'Interview Scheduled'}`)
        : slot.description || 'Available',
      start: new Date(slot.startDateTime),
      end: new Date(slot.endDateTime),
      status: statusKey,
      description: slot.description,
      candidateName: slot.candidateName,
      interviewScheduleId: slot.interviewScheduleId,
      interviewStatus: slot.interviewStatus,
      durationHours: computeSlotDurationHours(slot.startDateTime, slot.endDateTime, slot.durationHours),
      recurrenceGroupId: slot.recurrenceGroupId,
      isRecurring: slot.isRecurring,
    };
  });

  const computeRangeForView = (view, date) => {
    const d = date ? new Date(date) : new Date();
    switch ((view || 'week')) {
      case 'month':
        return { start: startOfMonth(d), end: endOfMonth(d) };
      case 'day':
        return { start: startOfDay(d), end: endOfDay(d) };
      case 'week':
      default:
        return { start: startOfWeek(d, { weekStartsOn: 0 }), end: endOfWeek(d, { weekStartsOn: 0 }) };
    }
  };

  const getCalendarPageSize = (view) => CALENDAR_PAGE_SIZES[view] || CALENDAR_PAGE_SIZES.week;

  const loadAvailability = useCallback(async (opts = {}) => {
    try {
      setLoading(true);
      const view = opts.view || currentView;
      const { start, end } = opts.start && opts.end
        ? opts
        : computeRangeForView(view, opts.date || calendarDate);
      const pageSize = getCalendarPageSize(view);
      console.log('[Availability] Loading paged range:', { view, start, end, pageSize });
      const data = await availabilityAPI.getAvailabilityByDateRange(start, end, 0, pageSize);
      console.log(`[Availability] Range result count: ${(data || []).length}`);

      const mapped = mapSlotsToEvents(data || []);
        console.log('[Availability] Mapped events (sample):', mapped.slice(0, 8));
        // Log weekday distribution to help debug missing Sunday events
        const weekdayCounts = mapped.reduce((acc, ev) => {
          const wd = new Date(ev.start).getDay();
          acc[wd] = (acc[wd] || 0) + 1;
          return acc;
        }, {});
        console.log('[Availability] Weekday counts (0=Sun..6=Sat):', weekdayCounts);
      setEvents(mapped);
    } catch (error) {
      toast({
        title: 'Error loading availability',
        description: error.response?.data?.message || 'Failed to load your availability',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [calendarDate, currentView]);

  const loadStats = useCallback(async () => {
    try {
      const data = await availabilityAPI.getAvailabilityStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
       toast({
        title: 'Error loading stats',
        description: error.response?.data?.message || 'Failed to load availability statistics',
        variant: 'destructive',
      });
    }
  }, []);

  /** Load full future availability for UpcomingCard (not limited to visible range) */
  const loadAllFutureAvailability = useCallback(async () => {
    try {
      console.log('[Availability] Loading all future availability for UpcomingCard');
      const data = await availabilityAPI.getMyAvailability();
      console.log(`[Availability] Upcoming total fetched: ${(data || []).length}`);
      const mapped = mapSlotsToEvents(data || []);
      const weekdayCounts = mapped.reduce((acc, ev) => {
        const wd = new Date(ev.start).getDay();
        acc[wd] = (acc[wd] || 0) + 1;
        return acc;
      }, {});
      console.log('[Availability] Upcoming Weekday counts (0=Sun..6=Sat):', weekdayCounts);
      return mapped;
    } catch (err) {
      console.error('Failed to load all future availability:', err);
      return [];
    }
  }, []);

  // store full events for upcoming card
  const [allEventsForUpcoming, setAllEventsForUpcoming] = useState([]);

  const refreshUpcomingEvents = useCallback(async () => {
    const all = await loadAllFutureAvailability();
    setAllEventsForUpcoming(all);
  }, [loadAllFutureAvailability]);

  const refreshCalendarAvailability = useCallback(async () => {
    const { start, end } = computeRangeForView(currentView, calendarDate);
    await loadAvailability({ start, end, view: currentView });
  }, [calendarDate, currentView, loadAvailability]);

  useEffect(() => {
    const { start, end } = computeRangeForView(currentView, calendarDate);
    loadAvailability({ start, end, view: currentView });
  }, [loadAvailability, currentView, calendarDate]);

  useEffect(() => {
    loadStats();
    refreshUpcomingEvents();
  }, [loadStats, refreshUpcomingEvents]);



  
const handleSelectSlot = ({ start, end }) => {
  const now = new Date();
  if (isPastDay(start)) {
    toast({ title: 'Past date', variant: 'destructive' });
    return;
  }

  let startDate = new Date(start);
  let endDate = new Date(end);

  // // Month view/Midnight fix
  // if (startDate.getHours() === 0 && startDate.getMinutes() === 0 && view === 'month') {
  //   startDate.setHours(0, 0, 0, 0);
  //   endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  // }

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
    if (event.status === 'booked' || event.status === 'completed') {
      if (!event.interviewScheduleId) return;
      setSelectedInterviewScheduleId(event.interviewScheduleId);
      setIsInterviewStartDialogOpen(true);
      return;
    }

    setEditTarget(event);
    setEditDialogOpen(true);
  };

  // ── Delete slot ───────────────────────────────────────────────────────────
  const deleteSingleSlotDirect = useCallback(async (event) => {
    if (!event) return;

    try {
      await availabilityAPI.deleteAvailabilitySlot(event.id, 'SINGLE');
      toast({ title: 'Time slot deleted' });
      await refreshCalendarAvailability();
      await loadStats();
    } catch (error) {
      toast({
        title: 'Failed to delete slot',
        description: error.response?.data?.message || 'Cannot delete booked slots',
        variant: 'destructive',
      });
    }
  }, [loadStats, refreshCalendarAvailability]);

  const openDeleteDialog = async (event, e) => {
    if (e) e.stopPropagation();
    setDeleteTarget(event);
    setDeleteDialogOpen(true);
  };

  const handleAddSuccess = useCallback(async (newSlotOrSlots) => {
    const addedSlots = Array.isArray(newSlotOrSlots) ? newSlotOrSlots : [newSlotOrSlots];

    setEvents((prev) => [
      ...prev,
      ...addedSlots.map((slot) => ({
        id: slot.id,
        title: slot.description || 'Available',
        start: new Date(slot.startDateTime),
        end: new Date(slot.endDateTime),
        status: slot.status.toLowerCase(),
        description: slot.description,
        recurrenceGroupId: slot.recurrenceGroupId,
        isRecurring: slot.isRecurring,
      })),
    ]);

    setSelectedDate(null);
    setStartTime('');
    setEndTime('');
    await refreshUpcomingEvents();
    await loadStats();
  }, [loadStats, refreshUpcomingEvents]);

  const handleEditSuccess = useCallback(async (updated, scope = 'SINGLE') => {
    const isRecurringEdit = !!editTarget?.isRecurring && !!editTarget?.recurrenceGroupId;

    if (isRecurringEdit && scope !== 'SINGLE') {
      await refreshCalendarAvailability();
      await refreshUpcomingEvents();
      await loadStats();
    } else {
      setEvents((prev) => prev.map((event) => (
        event.id === updated.id
          ? {
              ...event,
              title: updated.description || 'Available',
              start: new Date(updated.startDateTime),
              end: new Date(updated.endDateTime),
              description: updated.description,
              recurrenceGroupId: updated.recurrenceGroupId,
              isRecurring: updated.isRecurring,
            }
          : event
      )));
      await refreshUpcomingEvents();
      await loadStats();
    }

    setEditDialogOpen(false);
    setEditTarget(null);
  }, [editTarget, loadStats, refreshCalendarAvailability, refreshUpcomingEvents]);

  const handleDeleteSuccess = useCallback(async () => {
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
    await refreshCalendarAvailability();
    await refreshUpcomingEvents();
    await loadStats();
  }, [loadStats, refreshCalendarAvailability, refreshUpcomingEvents]);


  // ── RBC style helpers ─────────────────────────────────────────────────────
  const eventStyleGetter = (event) => {
    const colors = STATUS_COLORS[event.status] || STATUS_COLORS.available;
    const isBookedLike = event.status === 'booked' || event.status === 'completed';
    return {
      className: event.status === 'completed'
        ? 'booked-event completed-event'
        : (event.status === 'booked' ? 'booked-event' : 'available-event'),
      style: {
        background:   colors.bg,
        borderRadius: '5px',
        opacity:      isBookedLike ? 0.88 : 0.96,
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


  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="space-y-6 pb-1">

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
                        onNavigate={(nextDate) => {
                          if (navTimerRef.current) clearTimeout(navTimerRef.current);
                          navTimerRef.current = setTimeout(() => {
                            setCalendarDate(nextDate);
                          }, 200);
                        }}
                        onView={(view) => {
                          if (viewTimerRef.current) clearTimeout(viewTimerRef.current);
                          viewTimerRef.current = setTimeout(() => {
                            setCurrentView(view);
                          }, 200);
                        }}
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
                        formats={{
                      timeGutterFormat: calendarFormats.timeGutterFormat,
                      eventTimeRangeFormat: calendarFormats.eventTimeRangeFormat,
                    }}
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
                allEvents={allEventsForUpcoming}
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
          // if (!open) setSelectedDate(null);
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
          // if (!open) setEditTarget(null);
        }}
        slot={editTarget}
        onSuccess={handleEditSuccess}
        onDelete={async () => {
          if (!editTarget) return;
          setEditDialogOpen(false);
          // Always open delete confirmation; dialog will handle scope for recurring slots
          setDeleteTarget(editTarget);
          setDeleteDialogOpen(true);
        }}
        getSlotStartError={getSlotStartError}
      />

      <DeleteSlotDialog
        isOpen={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          // if (!open) setDeleteTarget(null);
        }}
        slot={deleteTarget}
        onSuccess={handleDeleteSuccess}
      />

      <InterviewStartDialog
        open={isInterviewStartDialogOpen}
        interviewScheduleId={selectedInterviewScheduleId}
        onOpenChange={(open) => {
          setIsInterviewStartDialogOpen(open);
          if (!open) {
            setSelectedInterviewScheduleId(null);
            refreshCalendarAvailability();
          }
        }}
      />
    </Layout>
  );
};

export default AvailabilityPage;
