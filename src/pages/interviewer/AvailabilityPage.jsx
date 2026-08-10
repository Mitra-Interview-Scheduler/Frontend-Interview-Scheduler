import { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar } from 'react-big-calendar';
import {
  format,
  addMinutes, startOfDay, isBefore, startOfMonth, endOfMonth, startOfWeek, endOfWeek, endOfDay,
} from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '@/styles/AvailabilityCalendar.css';

import {
  Card, CardContent,
} from '@/components/ui/card';
import { Button }   from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RefreshCw, CalendarClock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Spinner, LoadingOverlay } from '@/components/ui/loading';
import { PageHeader } from '@/components/ui/page-header';
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
import {
  CALENDAR_STATUS_PALETTES,
  PANEL_PALETTE,
  POSTPONE_REQUEST_PALETTE,
} from './../hr/utils/AvailabilityViewPageUiUtils';

const POSTPONE_PROPOSAL_LABEL = 'Postpone proposal';
const STATUS_COLORS = CALENDAR_STATUS_PALETTES;

const CALENDAR_PAGE_SIZES = {
  month: 500,
  week: 200,
  day: 100,
};

const CALENDAR_LEGEND_ITEMS = [
  { key: 'available', label: STATUS_COLORS.available.label, swatch: STATUS_COLORS.available.solid },
  { key: 'booked', label: STATUS_COLORS.booked.label, swatch: STATUS_COLORS.booked.solid },
  { key: 'panel_booked', label: STATUS_COLORS.panel_booked.label, swatch: STATUS_COLORS.panel_booked.solid },
  { key: 'postpone_request', label: STATUS_COLORS.postpone_request.label, swatch: STATUS_COLORS.postpone_request.solid },
  { key: 'overdue', label: STATUS_COLORS.overdue.label, swatch: STATUS_COLORS.overdue.solid },
  { key: 'completed', label: STATUS_COLORS.completed.label, swatch: STATUS_COLORS.completed.solid },
];

const BookedCalendarEvent = ({ event }) => {
  const isOverdue = event.status === 'overdue' || event.isOverdue;
  const isPostponeProposal = !isOverdue && (
    event.status === 'postpone_request'
    || event.hasPendingPostponeRequest
    || event.isProposedTime
  );

  const isBookedLike = event.status === 'booked'
    || event.status === 'panel_booked'
    || event.status === 'completed'
    || event.status === 'overdue'
    || isPostponeProposal;
  if (!isBookedLike) {
    return <span className="truncate">{event.title}</span>;
  }

  return (
    <div className="booked-event-content">
      <div className="booked-event-header">
        {isPostponeProposal && (
          <CalendarClock className="booked-event-lock postpone-event-icon" aria-hidden="true" />
        )}
        <span className="booked-event-candidate truncate">{event.title}</span>
      </div>
      {event.panelId && !isPostponeProposal && !isOverdue && (
        <span className="calendar-event-panel-badge">Panel</span>
      )}
      {isOverdue && (
        <span className="booked-event-overdue-badge">Overdue</span>
      )}
      {isPostponeProposal && (
        <span className="booked-event-postpone-badge">
          {POSTPONE_PROPOSAL_LABEL}
          {event.pendingPostponeRequestedByName
            ? ` by ${event.pendingPostponeRequestedByName}`
            : ''}
        </span>
      )}
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns true when the date is strictly before today (midnight normalised). */
const isPastDay = (date) => {
  const today = startOfDay(new Date());
  return startOfDay(date) < today;
};

const SLOT_LOOKBACK_MINUTES = 15;

/** Earliest allowed slot start: up to 15 minutes before now (e.g. at 2:10, 2:00 is allowed). */
const minimumAllowedStart = () => addMinutes(new Date(), -SLOT_LOOKBACK_MINUTES);

const getSlotStartError = (start) => {
  if (!start) return null;
  if (isPastDay(start)) return 'Cannot add slots for past dates.';
  const earliest = minimumAllowedStart();
  if (isBefore(start, earliest)) {
    const earliestLabel = format(earliest, 'HH:mm');
    return `Start time cannot be more than ${SLOT_LOOKBACK_MINUTES} minutes before now (earliest: ${earliestLabel}).`;
  }
  return null;
};

const getSlotEndError = (end) => {
  if (!end) return null;
  if (!isBefore(new Date(), end)) {
    return 'End time must be after the current time.';
  }
  return null;
};

const CalendarToolbar = ({
  label,
  onNavigate,
  onView,
  view,
  views,
  showUpcomingSlots,
  onToggleUpcomingSlots,
  loading,
  calendarConnected,
  onSyncCalendar,
  syncingCalendar,
}) => {
  const viewList = Array.isArray(views) ? views : Object.keys(views || {});

  return (
    <div className="rbc-toolbar flex flex-col gap-3 px-2 py-2 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onNavigate('PREV')} className="calendar-toolbar-btn h-9 w-9 p-0">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => onNavigate('TODAY')} className="calendar-toolbar-btn h-9 px-3 text-sm font-medium">
          Today
        </Button>
        <Button variant="outline" size="sm" onClick={() => onNavigate('NEXT')} className="calendar-toolbar-btn h-9 w-9 p-0">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <span className="rbc-toolbar-label text-base font-semibold text-foreground md:text-lg">{label}</span>

      <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
        {loading && (
          <Spinner size="xs" className="mr-2 text-primary" />
        )}
        {viewList.map((availableView) => (
          <Button
            key={availableView}
            variant={view === availableView ? 'default' : 'outline'}
            size="sm"
            onClick={() => onView(availableView)}
            className="calendar-toolbar-btn h-9 px-3 capitalize"
          >
            {availableView}
          </Button>
        ))}
        {calendarConnected && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSyncCalendar}
            disabled={syncingCalendar}
            className="calendar-toolbar-btn h-9 px-3"
            title="Sync availability slots to Google Calendar"
          >
            <RefreshCw className={`h-4 w-4 shrink-0 ${syncingCalendar ? 'animate-spin' : ''}`} />
            <span>{syncingCalendar ? 'Syncing...' : 'Sync now'}</span>
          </Button>
        )}
        <Button
          variant={showUpcomingSlots ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleUpcomingSlots}
          className="calendar-toolbar-btn h-9 px-3"
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
  const [loadingGoogleEvents, setLoadingGoogleEvents] = useState(false);
  const calendarInitializedRef = useRef(false);
  const loadAvailabilityRequestRef = useRef(0);
  const isCalendarSyncing = syncingCalendar || loadingGoogleEvents;

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
  const mapSlotsToEvents = (data) => (data || []).flatMap((slot) => {
    const isCompleted = slot.interviewStatus === InterviewScheduleStatus.COMPLETED;
    const isCancelled = slot.interviewStatus === InterviewScheduleStatus.CANCELLED;
    const endMs = new Date(slot.endDateTime).getTime();
    const isOverdue = slot.status === SlotStatus.BOOKED
      && !isCompleted
      && !isCancelled
      && Number.isFinite(endMs)
      && endMs < Date.now();
    const hasPendingPostponeRequest = Boolean(slot.hasPendingPostponeRequest) && !isCompleted && !isOverdue;
    const isPanel = Boolean(slot.panelId);
    const statusKey = slot.status === SlotStatus.BOOKED
      ? (isCompleted
        ? 'completed'
        : (isOverdue
          ? 'overdue'
          : (hasPendingPostponeRequest
            ? 'postpone_request'
            : (isPanel ? 'panel_booked' : 'booked'))))
      : slot.status.toLowerCase();

    const baseEvent = {
      id: slot.id,
      title: slot.status === SlotStatus.BOOKED
        ? (isCompleted
          ? `✓ ${slot.candidateName || 'Interview Completed'}`
          : (isOverdue
            ? `⚠ ${slot.candidateName || 'Interview Overdue'}`
            : `🔒 ${slot.candidateName || 'Interview Scheduled'}`))
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
      panelId: slot.panelId ?? null,
      isOverdue,
      hasPendingPostponeRequest,
      pendingPostponeRequestId: slot.pendingPostponeRequestId ?? null,
      pendingPostponeReason: slot.pendingPostponeReason ?? null,
      pendingPostponePreferredStart: slot.pendingPostponePreferredStart ?? null,
      pendingPostponePreferredEnd: slot.pendingPostponePreferredEnd ?? null,
      pendingPostponeRequestedByName: slot.pendingPostponeRequestedByName ?? null,
    };

    const events = [baseEvent];

    if (
      hasPendingPostponeRequest
      && slot.pendingPostponePreferredStart
      && slot.pendingPostponePreferredEnd
      && slot.status === SlotStatus.BOOKED
    ) {
      events.push({
        id: `proposed-${slot.id}`,
        title: slot.candidateName
          ? `⏳ ${slot.candidateName}`
          : `⏳ ${POSTPONE_PROPOSAL_LABEL}`,
        start: new Date(slot.pendingPostponePreferredStart),
        end: new Date(slot.pendingPostponePreferredEnd),
        status: 'postpone_request',
        isProposedTime: true,
        hasPendingPostponeRequest: true,
        candidateName: slot.candidateName,
        interviewScheduleId: slot.interviewScheduleId,
        interviewStatus: slot.interviewStatus,
        panelId: slot.panelId ?? null,
        linkedSlotId: slot.id,
        pendingPostponeRequestId: slot.pendingPostponeRequestId ?? null,
        pendingPostponeRequestedByName: slot.pendingPostponeRequestedByName ?? null,
      });
    }

    return events;
  });

  const mapGoogleEventsToCalendar = (items) => (items || []).map((event) => ({
    id: `google-${event.googleEventId}`,
    googleEventId: event.googleEventId,
    title: event.title || 'Google Calendar event',
    calendarName: event.calendarName || null,
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
    const requestId = ++loadAvailabilityRequestRef.current;
    const view = opts.view || currentView;
    const { start, end } = opts.start && opts.end
      ? opts
      : computeRangeForView(view, opts.date || calendarDate);
    const pageSize = getCalendarPageSize(view);
    const googleConnected = Boolean(opts.googleConnected ?? calendarStatus.connected);

    try {
      setLoading(true);
      if (googleConnected) {
        setLoadingGoogleEvents(true);
      }

      const { items } = await availabilityAPI.getAvailabilityByDateRange(
        start,
        end,
        0,
        pageSize,
        false,
      );

      if (requestId !== loadAvailabilityRequestRef.current) {
        return;
      }

      setEvents(mapSlotsToEvents(items || []));

      if (googleConnected) {
        try {
          const googleExternalEvents = await googleCalendarAPI.getExternalEvents(start, end);
          if (requestId !== loadAvailabilityRequestRef.current) {
            return;
          }

          setEvents((prev) => {
            const mitraEvents = prev.filter((event) => event.status !== 'google_external');
            return [...mitraEvents, ...mapGoogleEventsToCalendar(googleExternalEvents)];
          });
        } catch (error) {
          console.error('Failed to load Google Calendar events', error);
          const status = error?.response?.status;
          const apiMsg = error?.response?.data?.message || error.message;
          const reconnectHint = 'Disconnect and reconnect Google Calendar in Settings to continue showing Google events.';

          const shouldReconnect =
            status === 400 || status === 401 || status === 403 || status === 502;

          if (shouldReconnect) {
            toast({
              title: 'Google Calendar auth issue',
              description: apiMsg ? `${apiMsg} ${reconnectHint}` : reconnectHint,
              variant: 'destructive',
            });
          }
        }
      }
    } catch (error) {
      toast({
        title: 'Error loading availability',
        description: error.response?.data?.message || 'Failed to load your availability',
        variant: 'destructive',
      });
    } finally {
      if (requestId === loadAvailabilityRequestRef.current) {
        setLoading(false);
        setLoadingGoogleEvents(false);
      }
    }
  }, [calendarDate, calendarStatus.connected, currentView]);

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
      handleGoogleCalendarOAuthResult({
        toast,
        dashboardPath: null,
        onConnected: async () => {
          const status = await loadCalendarStatus();
          if (status.connected) {
            await syncGoogleCalendarAvailability({ showToast: true });
          }
        },
      });

      const status = await loadCalendarStatus();
      if (status.connected) {
        setLoadingGoogleEvents(true);
      }

      const { start, end } = computeRangeForView(currentView, calendarDate);
      await loadAvailability({
        start,
        end,
        view: currentView,
        googleConnected: status.connected,
      });
    };

    initializeCalendarPage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, calendarDate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadStats();
      refreshUpcomingEvents();
    }, 150);
    return () => clearTimeout(timer);
  }, [loadStats, refreshUpcomingEvents]);



  
const handleSelectSlot = ({ start, end }) => {
  if (isPastDay(start)) {
    toast({ title: 'Past date', description: 'Cannot add availability for past dates.', variant: 'destructive' });
    return;
  }

  const startDate = new Date(start);
  const endDate = new Date(end);
  const earliest = minimumAllowedStart();

  if (isBefore(startDate, earliest)) {
    toast({
      title: 'Start time too early',
      description: `You can start up to ${SLOT_LOOKBACK_MINUTES} minutes before now.`,
      variant: 'destructive',
    });
    return;
  }

  if (!isBefore(new Date(), endDate)) {
    toast({
      title: 'End time in the past',
      description: 'End time must be after the current time.',
      variant: 'destructive',
    });
    return;
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

    if (event.status === 'booked'
      || event.status === 'panel_booked'
      || event.status === 'completed'
      || event.status === 'overdue'
      || event.status === 'postpone_request'
      || event.hasPendingPostponeRequest
      || event.isProposedTime) {
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
    const isOverdue = event.status === 'overdue' || event.isOverdue;
    const isPostponeRequest = !isOverdue && (
      event.status === 'postpone_request'
      || event.hasPendingPostponeRequest
      || event.isProposedTime
    );
    const colors = isOverdue
      ? STATUS_COLORS.overdue
      : (isPostponeRequest
        ? STATUS_COLORS.postpone_request
        : (STATUS_COLORS[event.status] || STATUS_COLORS.available));
    const isGoogleExternal = event.status === 'google_external';
    const isPanelBooked = !isPostponeRequest && !isOverdue && (
      event.status === 'panel_booked' || Boolean(event.panelId)
    );
    const isBookedLike = event.status === 'booked'
      || event.status === 'panel_booked'
      || event.status === 'completed'
      || event.status === 'overdue'
      || isPostponeRequest;
    return {
      className: isGoogleExternal
        ? 'google-external-event'
        : (event.status === 'completed'
          ? 'booked-event completed-event'
          : (isOverdue
            ? 'booked-event overdue-event'
            : (isPostponeRequest
              ? 'booked-event postpone-request-event'
              : (isPanelBooked
                ? 'booked-event panel-booked-event'
                : (event.status === 'booked' ? 'booked-event' : 'available-event'))))),
      style: {
        background:   colors.bg,
        borderRadius: '5px',
        opacity:      isGoogleExternal ? 1 : (isBookedLike ? 0.88 : 0.96),
        color:        isGoogleExternal ? '#ffffff' : 'white',
        borderLeft:   `${isPanelBooked || isPostponeRequest || isOverdue ? 4 : 3}px solid ${colors.border}`,
        borderTop:    'none', borderRight: 'none', borderBottom: 'none',
        padding:      '4px 8px',
        fontSize:     '12px',
        fontWeight:   isGoogleExternal ? '600' : '500',
        boxShadow:    isGoogleExternal
          ? '0 2px 6px rgba(0, 0, 0, 0.2)'
          : (isOverdue
            ? `0 2px 10px ${STATUS_COLORS.overdue.solid}55, 0 0 0 1px ${STATUS_COLORS.overdue.border}66`
            : (isPostponeRequest
              ? `0 2px 10px ${POSTPONE_REQUEST_PALETTE.solid}55, 0 0 0 1px ${POSTPONE_REQUEST_PALETTE.border}66`
              : (isPanelBooked
                ? `0 2px 10px ${PANEL_PALETTE.solid}50, 0 0 0 1px #c4b5fd66`
                : `0 2px 6px ${colors.solid}40`))),
        cursor:       isGoogleExternal ? 'not-allowed' : 'pointer',
        overflow:     'hidden',
        backgroundImage: isGoogleExternal
          ? 'repeating-linear-gradient(135deg, rgba(0,0,0,0.1) 0, rgba(0,0,0,0.1) 6px, transparent 6px, transparent 12px)'
          : (isPostponeRequest
            ? 'repeating-linear-gradient(135deg, rgba(255,255,255,0.12) 0, rgba(255,255,255,0.12) 5px, transparent 5px, transparent 10px)'
            : undefined),
      },
    };
  };

  /**
   * Grey-out / block interactions for:
   *   - Any time slot on a past day
   *   - Same-day slots within the minimum lead-time buffer
   */
  const slotPropGetter = (date) => {
    const earliest = minimumAllowedStart();
    if (isPastDay(date)) {
      return {
        className: 'past-time-slot',
        style: { backgroundColor: 'rgba(0,0,0,0.03)', cursor: 'not-allowed', pointerEvents: 'none' },
      };
    }
    if (isBefore(date, earliest)) {
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
        <PageHeader
          title="My Availability"
          description="Manage your interview availability · slots sync to Google Calendar when connected"
        />

        

        {/* Calendar + Sidebar */}
        <div className="flex flex-col lg:flex-row gap-3 ">

          {/* Calendar */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
            className="flex-1">
            <Card className="shadow-xl border-t-4">
              <CardContent className="p-1">
                <div className="interviewer-calendar-legend" aria-label="Calendar color legend">
                  {CALENDAR_LEGEND_ITEMS.map((item) => (
                    <span key={item.key} className="interviewer-calendar-legend-chip">
                      <span
                        className="interviewer-calendar-legend-swatch"
                        style={{ background: item.swatch }}
                        aria-hidden="true"
                      />
                      {item.label}
                    </span>
                  ))}
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key="calendar"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="availability-calendar-container relative"
                    style={{ width: '100%', height: '75vh' }}
                  >
                      <div
                        className={`h-full transition-[filter] duration-200 ${loading || isCalendarSyncing ? 'pointer-events-none select-none blur-[2px] opacity-60' : ''}`}
                      >
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
                          selectable={!loading && !isCalendarSyncing}
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
                                loading={loading}
                                showUpcomingSlots={showUpcomingSlots}
                                onToggleUpcomingSlots={() => setShowUpcomingSlots((value) => !value)}
                                calendarConnected={calendarStatus.connected}
                                onSyncCalendar={() => syncGoogleCalendarAvailability({ showToast: true })}
                                syncingCalendar={isCalendarSyncing}
                              />
                            ),
                            event: BookedCalendarEvent,
                          }}
                          tooltipAccessor={(event) => {
                            const timeRange = `${format(event.start, calendarFormats.timeGutterFormat)} – ${format(event.end, calendarFormats.timeGutterFormat)}`;
                            if (event.status === 'google_external') {
                              const calLine = event.calendarName ? `\nCalendar: ${event.calendarName}` : '';
                              return `📅 Google Calendar (read-only)\n${event.title}${calLine}\n${timeRange}`;
                            }
                            const meetLine = event.meetingLink ? `\n📹 ${event.meetingLink}` : '';
                            const syncLine = event.status === 'available'
                              ? (event.googleCalendarSynced ? '\n📅 Synced to Google Calendar' : '\n⚠ Not synced to Google Calendar')
                              : '';
                            if (event.status === 'postpone_request' || event.hasPendingPostponeRequest || event.isProposedTime) {
                              const byLine = event.pendingPostponeRequestedByName
                                ? `\nRequested by: ${event.pendingPostponeRequestedByName}`
                                : '';
                              const proposedLine = event.isProposedTime
                                ? '\nProposed alternative time (pending HR approval)'
                                : (event.pendingPostponePreferredStart && event.pendingPostponePreferredEnd
                                  ? '\nIncludes a proposed alternative time'
                                  : '\nNo alternative time proposed yet');
                              return `⏳ ${POSTPONE_PROPOSAL_LABEL}${event.candidateName ? ': ' + event.candidateName : ''}${byLine}${proposedLine}\n${timeRange}${meetLine}`;
                            }
                            if (event.status === 'overdue' || event.isOverdue) {
                              return `⚠ Overdue interview${event.candidateName ? ': ' + event.candidateName : ''}\n${timeRange}${meetLine}\nPast interview not completed`;
                            }
                            if (event.status === 'panel_booked' || event.panelId) {
                              return `👥 Panel Interview${event.candidateName ? ': ' + event.candidateName : ''}\n${timeRange}${meetLine}`;
                            }
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
                      </div>
                      <LoadingOverlay
                        show={loading || isCalendarSyncing}
                        label={
                          syncingCalendar
                            ? 'Syncing with Google Calendar…'
                            : loadingGoogleEvents
                              ? 'Loading Google Calendar events…'
                              : 'Loading calendar…'
                        }
                      />
                    </motion.div>
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
        getSlotEndError={getSlotEndError}
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
        getSlotEndError={getSlotEndError}
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
