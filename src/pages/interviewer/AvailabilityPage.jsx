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
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, RefreshCw,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Layout from '@/components/layout/Layout';
import { handleGoogleCalendarOAuthResult } from '@/lib/googleCalendarRedirect';
import { useCalendarFormats } from '@/hooks/useCalendarFormats';
import { motion, AnimatePresence } from 'framer-motion';
import { toast }                  from '@/hooks/use-toast';
import { availabilityAPI }        from '@/services/availabilityAPI';
import { googleCalendarAPI }      from '@/services/api';
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
  google_external: {
    bg: '#4b5563',
    border: '#1f2937',
    solid: '#4b5563',
    label: 'Google Calendar',
  },
};

const CALENDAR_PAGE_SIZES = {
  month: 500,
  week: 200,
  day: 100,
};

const BookedCalendarEvent = ({ event }) => {
  const isBookedLike = event.status === 'booked' || event.status === 'completed';
  if (!isBookedLike) {
    return <span className="truncate">{event.title}</span>;
  }

  return (
    <div className="booked-event-content">
      <div className="booked-event-header">
        <span className="booked-event-candidate truncate">{event.title}</span>
      </div>
      {/* {event.meetingLink && (
        <a
          href={event.meetingLink}
          target="_blank"
          rel="noopener noreferrer"
          className="booked-event-meet-link"
          onClick={(e) => e.stopPropagation()}
        >
          Join Meet
        </a>
      )} */}
    </div>
  );
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
  const [stats, setStats]     = useState({ availableSlots: 0, bookedSlots: 0 });
  const [showUpcomingSlots, setShowUpcomingSlots] = useState(true);
  const [calendarStatus, setCalendarStatus] = useState({ connected: false, googleAccountEmail: null });
  const [syncingCalendar, setSyncingCalendar] = useState(false);
  const calendarInitializedRef = useRef(false);

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
      googleCalendarSynced: Boolean(slot.googleCalendarSynced),
      meetingLink: slot.status === SlotStatus.BOOKED
        && slot.interviewStatus === InterviewScheduleStatus.SCHEDULED
        ? (slot.meetingLink || null)
        : null,
    };
  });

  const mapGoogleEventsToCalendar = (items) => (items || []).map((event) => ({
    id: `google-${event.googleEventId}`,
    googleEventId: event.googleEventId,
    title: event.title || 'Google Calendar event',
    start: new Date(event.startDateTime),
    end: new Date(event.endDateTime),
    status: 'google_external',
    readOnly: true,
    source: 'google',
    allDay: Boolean(event.allDay),
  }));

  // ── Data loading
  // Drives both Mitra availability slots and Google Calendar read-only events.
  const computeRangeForView = (view, date) => {
    const d = date ? new Date(date) : new Date();
    switch ((view || 'week')) {
      case 'month': {
        const monthStart = startOfMonth(d);
        const monthEnd = endOfMonth(d);
        // Match react-big-calendar month grid (includes leading/trailing week days).
        return {
          start: startOfWeek(monthStart, { weekStartsOn: 0 }),
          end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
        };
      }
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
      const { items, googleExternalEvents } = await availabilityAPI.getAvailabilityByDateRange(
        start,
        end,
        0,
        pageSize,
      );

      const mapped = [
        ...mapSlotsToEvents(items || []),
        ...mapGoogleEventsToCalendar(googleExternalEvents),
      ];
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

  const syncGoogleCalendarAvailability = useCallback(async ({ showToast = true } = {}) => {
    try {
      setSyncingCalendar(true);
      const result = await googleCalendarAPI.syncAvailability();
      await refreshCalendarAvailability();
      await refreshUpcomingEvents();

      if (showToast && result.syncedCount > 0) {
        toast({
          title: 'Google Calendar synced',
          description: `${result.syncedCount} availability slot${result.syncedCount === 1 ? '' : 's'} synced to your Google Calendar.`,
        });
      }
      return result;
    } catch (error) {
      if (showToast) {
        toast({
          title: 'Google Calendar sync failed',
          description: error.response?.data?.message || error.message,
          variant: 'destructive',
        });
      }
      return null;
    } finally {
      setSyncingCalendar(false);
    }
  }, [refreshCalendarAvailability, refreshUpcomingEvents]);

  const loadCalendarStatus = useCallback(async () => {
    try {
      const status = await googleCalendarAPI.getStatus();
      setCalendarStatus(status);
      return status;
    } catch (error) {
      console.error('Failed to load Google Calendar status', error);
      return { connected: false, googleAccountEmail: null };
    }
  }, []);

  useEffect(() => {
    if (calendarInitializedRef.current) {
      const { start, end } = computeRangeForView(currentView, calendarDate);
      loadAvailability({ start, end, view: currentView });
      return;
    }

    calendarInitializedRef.current = true;

    const initializeCalendarPage = async () => {
      const handled = handleGoogleCalendarOAuthResult({
        toast,
        dashboardPath: null,
        onConnected: async () => {
          const status = await loadCalendarStatus();
          if (status.connected) {
            await syncGoogleCalendarAvailability({ showToast: true });
          }
        },
      });

      if (!handled) {
        const status = await loadCalendarStatus();
        if (status.connected) {
          await syncGoogleCalendarAvailability({ showToast: false });
        }
      }

      const { start, end } = computeRangeForView(currentView, calendarDate);
      await loadAvailability({ start, end, view: currentView });
    };

    initializeCalendarPage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, calendarDate]);

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
    if (event.readOnly || event.status === 'google_external') {
      toast({
        title: 'Google Calendar event',
        description: 'This event is from Google Calendar and can only be edited or deleted in Google Calendar.',
      });
      return;
    }

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
    if (event?.readOnly || event?.status === 'google_external') {
      toast({
        title: 'Google Calendar event',
        description: 'This event cannot be deleted from Mitra.',
      });
      return;
    }
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
    const isGoogleExternal = event.status === 'google_external';
    const isBookedLike = event.status === 'booked' || event.status === 'completed';
    return {
      className: isGoogleExternal
        ? 'google-external-event'
        : (event.status === 'completed'
          ? 'booked-event completed-event'
          : (event.status === 'booked' ? 'booked-event' : 'available-event')),
      style: {
        background:   colors.bg,
        borderRadius: '5px',
        opacity:      isGoogleExternal ? 1 : (isBookedLike ? 0.88 : 0.96),
        color:        isGoogleExternal ? '#ffffff' : 'white',
        borderLeft:   `3px solid ${colors.border}`,
        borderTop:    'none', borderRight: 'none', borderBottom: 'none',
        padding:      '4px 8px',
        fontSize:     '12px',
        fontWeight:   isGoogleExternal ? '600' : '500',
        boxShadow:    isGoogleExternal
          ? '0 2px 6px rgba(0, 0, 0, 0.2)'
          : `0 2px 6px ${colors.solid}40`,
        cursor:       isGoogleExternal ? 'not-allowed' : 'pointer',
        overflow:     'hidden',
        backgroundImage: isGoogleExternal
          ? 'repeating-linear-gradient(135deg, rgba(0,0,0,0.1) 0, rgba(0,0,0,0.1) 6px, transparent 6px, transparent 12px)'
          : undefined,
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
              Manage your interview availability · slots sync to Google Calendar when connected
            </p>
          </div>
        </motion.div>

        {calendarStatus.connected && (
          <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-primary/10 p-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Google Calendar connected</p>
                <p className="text-sm text-muted-foreground">
                  {calendarStatus.googleAccountEmail
                    ? `Mitra slots sync to ${calendarStatus.googleAccountEmail}. Other Google Calendar events appear in gray and are read-only here.`
                    : 'Mitra slots sync to Google Calendar. Other Google Calendar events appear in gray and are read-only here.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="whitespace-nowrap">Auto-sync on</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncGoogleCalendarAvailability({ showToast: true })}
                disabled={syncingCalendar}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${syncingCalendar ? 'animate-spin' : ''}`} />
                {syncingCalendar ? 'Syncing...' : 'Sync now'}
              </Button>
            </div>
          </div>
        )}

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
                        date={calendarDate}
                        view={currentView}
                        startAccessor="start"
                        endAccessor="end"
                        onSelectSlot={handleSelectSlot}
                        onSelectEvent={handleEventClick}
                        onNavigate={setCalendarDate}
                        onView={setCurrentView}
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
                          event: BookedCalendarEvent,
                        }}
                        tooltipAccessor={(event) => {
                          const timeRange = `${format(event.start, calendarFormats.timeGutterFormat)} – ${format(event.end, calendarFormats.timeGutterFormat)}`;
                          if (event.status === 'google_external') {
                            return `📅 Google Calendar (read-only)\n${event.title}\n${timeRange}`;
                          }
                          const meetLine = event.meetingLink ? `\n📹 ${event.meetingLink}` : '';
                          const syncLine = event.status === 'available'
                            ? (event.googleCalendarSynced ? '\n📅 Synced to Google Calendar' : '\n⚠ Not synced to Google Calendar')
                            : '';
                          if (event.status === 'booked' || event.status === 'completed') {
                            return `🔒 ${event.status === 'completed' ? 'Completed' : 'Booked'}${event.candidateName ? ': ' + event.candidateName : ''}\n${timeRange}${meetLine}${syncLine}`;
                          }
                          return `✏️ Click to edit\n${event.title}\n${timeRange}${syncLine}`;
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
