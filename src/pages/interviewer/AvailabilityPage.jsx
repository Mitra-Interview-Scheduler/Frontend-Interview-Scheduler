// src/pages/interviewer/AvailabilityPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// FIXED VERSION — same CSS engine as HR calendar:
//   • plain height container (no flex fighting RBC layout)
//   • no custom toolbar (let RBC measure correctly)
//   • gradient event colors for available / booked / blocked
//   • events stay inside 7am–7pm bounds, positioned correctly
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './AvailabilityCalendar.css';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Clock, Trash2, Calendar as CalendarIcon, AlertCircle, User } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { availabilityAPI } from '@/services/availabilityAPI';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { 'en-US': enUS },
});

// Status → colour mapping (gradient pairs)
const STATUS_COLORS = {
  available: {
    bg:     'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
    border: '#312e81',
    solid:  '#6366f1',
    label:  'Available',
  },
  booked: {
    bg:     'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: '#065f46',
    solid:  '#10b981',
    label:  'Booked',
  },
  blocked: {
    bg:     'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    border: '#92400e',
    solid:  '#f59e0b',
    label:  'Blocked',
  },
};

const AvailabilityPage = () => {
  const [events, setEvents]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [startTime, setStartTime]     = useState('09:00');
  const [endTime, setEndTime]         = useState('10:00');
  const [description, setDescription] = useState('');
  const [stats, setStats]             = useState({ availableSlots: 0, bookedSlots: 0 });

  useEffect(() => {
    loadAvailability();
    loadStats();
  }, []);

  const loadAvailability = async () => {
    try {
      setLoading(true);
      const data = await availabilityAPI.getMyAvailability();
      setEvents(data.map(slot => ({
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
      })));
    } catch (error) {
      toast({
        title: 'Error loading availability',
        description: error.response?.data?.message || 'Failed to load your availability',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await availabilityAPI.getAvailabilityStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleSelectSlot = ({ start }) => {
    const now = new Date();
    if (start < now) {
      toast({
        title: 'Cannot select past time',
        description: 'Please select a future date and time',
        variant: 'destructive',
      });
      return;
    }

    let startDate = new Date(start);
    const isMonthClick = startDate.getHours() === 0 && startDate.getMinutes() === 0;
    if (isMonthClick) startDate.setHours(9, 0, 0, 0);
    if (startDate < now) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      startDate = tomorrow;
    }

    const end = new Date(startDate.getTime() + 60 * 60 * 1000);
    setSelectedDate(startDate);
    setStartTime(format(startDate, 'HH:mm'));
    setEndTime(format(end, 'HH:mm'));

    toast({
      title: 'Date selected',
      description: `${format(startDate, 'MMM dd, yyyy')} • ${format(startDate, 'HH:mm')} – ${format(end, 'HH:mm')}`,
    });
  };

  const handleEventClick = (event) => {
    if (event.status === 'booked') {
      toast({
        title: '🔒 Interview Scheduled',
        description: event.candidateName
          ? `Candidate: ${event.candidateName} • ${format(event.start, 'HH:mm')} – ${format(event.end, 'HH:mm')}`
          : `${format(event.start, 'HH:mm')} – ${format(event.end, 'HH:mm')}`,
      });
    }
  };

  const handleStartTimeChange = (newStart) => {
    setStartTime(newStart);
    const [sh, sm] = newStart.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    if ((eh * 60 + em) - (sh * 60 + sm) < 60) {
      const newEndMins = sh * 60 + sm + 60;
      if (Math.floor(newEndMins / 60) < 19) {
        setEndTime(
          `${String(Math.floor(newEndMins / 60)).padStart(2, '0')}:${String(newEndMins % 60).padStart(2, '0')}`
        );
      }
    }
  };

  const handleEndTimeChange = (newEnd) => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = newEnd.split(':').map(Number);
    if ((eh * 60 + em) - (sh * 60 + sm) >= 60) {
      setEndTime(newEnd);
    } else {
      toast({
        title: 'Invalid time range',
        description: 'End time must be at least 1 hour after start time',
        variant: 'destructive',
      });
    }
  };

  const handleAddSlot = async () => {
    if (!selectedDate) {
      toast({ title: 'No date selected', description: 'Click a date on the calendar first', variant: 'destructive' });
      return;
    }
    const base = new Date(selectedDate);
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), sh, sm, 0, 0);
    const end   = new Date(base.getFullYear(), base.getMonth(), base.getDate(), eh, em, 0, 0);
    const now   = new Date();

    if (start < now) {
      toast({ title: 'Cannot add past time slot', description: 'Choose a future date and time.', variant: 'destructive' });
      return;
    }
    if (end <= start) {
      toast({ title: 'Invalid time range', description: 'End time must be after start time.', variant: 'destructive' });
      return;
    }

    try {
      const newSlot = await availabilityAPI.createAvailabilitySlot({
        startDateTime: start.toISOString(),
        endDateTime:   end.toISOString(),
        description:   description || null,
      });
      setEvents(prev => [...prev, {
        id:          newSlot.id,
        title:       newSlot.description || 'Available',
        start:       new Date(newSlot.startDateTime),
        end:         new Date(newSlot.endDateTime),
        status:      newSlot.status.toLowerCase(),
        description: newSlot.description,
      }]);
      setSelectedDate(null);
      setStartTime('09:00');
      setEndTime('10:00');
      setDescription('');
      await loadStats();
      toast({
        title: '✓ Time slot added',
        description: `${format(start, 'MMM dd, yyyy')} • ${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`,
      });
    } catch (error) {
      toast({
        title: 'Failed to add slot',
        description: error.response?.data?.message || 'This time slot may conflict with existing availability',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSlot = async (eventId) => {
    try {
      await availabilityAPI.deleteAvailabilitySlot(eventId);
      setEvents(prev => prev.filter(e => e.id !== eventId));
      await loadStats();
      toast({ title: '✓ Time slot deleted' });
    } catch (error) {
      toast({
        title: 'Failed to delete slot',
        description: error.response?.data?.message || 'Cannot delete booked slots',
        variant: 'destructive',
      });
    }
  };

  // ── Event styling — gradients, left border accent, no position overrides ──
  const eventStyleGetter = (event) => {
    const colors = STATUS_COLORS[event.status] || STATUS_COLORS.available;
    return {
      style: {
        background:    colors.bg,
        borderRadius:  '5px',
        opacity:       event.status === 'booked' ? 0.88 : 0.96,
        color:         'white',
        borderLeft:    `3px solid ${colors.border}`,
        borderTop:     'none',
        borderRight:   'none',
        borderBottom:  'none',
        padding:       '4px 8px',
        fontSize:      '12px',
        fontWeight:    '500',
        boxShadow:     `0 2px 6px ${colors.solid}40`,
        cursor:        event.status === 'booked' ? 'default' : 'pointer',
        overflow:      'hidden',
      },
    };
  };

  // Dim past slots — no pointer events
  const slotPropGetter = (date) => {
    if (date < new Date()) {
      return {
        className: 'past-time-slot',
        style: { backgroundColor: 'rgba(0,0,0,0.02)', cursor: 'not-allowed', pointerEvents: 'none' },
      };
    }
    return {};
  };

  // Dim past days in month view
  const dayPropGetter = (date) => {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const check = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (check < today) {
      return { className: 'past-day', style: { backgroundColor: 'rgba(0,0,0,0.02)', cursor: 'not-allowed' } };
    }
    return {};
  };

  const timeSlots = [];
  for (let h = 7; h < 19; h++) timeSlots.push(`${String(h).padStart(2, '0')}:00`);

  const upcomingEvents = events
    .filter(e => new Date(e.start) >= new Date())
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .slice(0, 5);

  return (
    <Layout>
      <div className="space-y-6 pb-8">

        {/* ── Header ──────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">My Availability</h1>
            <p className="text-muted-foreground text-lg">Manage your interview availability calendar</p>
          </div>
          <Button
            className="gap-2 px-6 py-3 text-base font-semibold rounded-2xl shadow-md
              hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
            onClick={() => {
              setSelectedDate(new Date());
              setStartTime('09:00');
              setEndTime('10:00');
              setDescription('');
            }}
          >
            <Plus className="w-5 h-5" /> Add Time Slot
          </Button>
        </motion.div>

        {/* ── Stats ───────────────────────────────────────────────── */}
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

        {/* ── Calendar + Sidebar ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Calendar — 3/4 width */}
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
                      Click a date to add availability. Emerald = already booked for an interview.
                    </CardDescription>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-5 mt-3 flex-wrap">
                  {Object.entries(STATUS_COLORS).map(([key, { solid, label }]) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-md shadow-sm"
                        style={{ background: `linear-gradient(135deg, ${solid}, ${solid}cc)` }} />
                      <span className="text-sm font-medium text-muted-foreground">{label}</span>
                    </div>
                  ))}
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
                      className="availability-calendar-container"
                      style={{ height: '700px' }}>
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
                          return `${event.title}\n${format(event.start, 'HH:mm')} – ${format(event.end, 'HH:mm')}`;
                        }}
                        formats={{
                          timeGutterFormat: 'HH:mm',
                          eventTimeRangeFormat: ({ start, end }) =>
                            `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`,
                          agendaTimeRangeFormat: ({ start, end }) =>
                            `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`,
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Sidebar ─────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
            className="space-y-6">

            {/* Add slot card */}
            <Card className="shadow-lg border-t-4 border-t-indigo-500 hover:shadow-xl transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-500" /> Add Availability Slot
                </CardTitle>
                <CardDescription>Select time range when you're available</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 py-2">
                  <AnimatePresence>
                    {selectedDate && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-4 bg-gradient-to-r from-indigo-50 to-indigo-100/50 rounded-lg border-2 border-indigo-200">
                        <p className="text-sm font-semibold text-indigo-700 flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4" />
                          {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Description (Optional)</Label>
                    <Input
                      placeholder="e.g., Technical Interview, Code Review"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="border-2 focus:border-indigo-400 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Start Time</Label>
                      <Select value={startTime} onValueChange={handleStartTimeChange}>
                        <SelectTrigger className="border-2"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {timeSlots.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">End Time</Label>
                      <Select value={endTime} onValueChange={handleEndTimeChange}>
                        <SelectTrigger className="border-2"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {timeSlots.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
              <div className="flex justify-end gap-2 px-6 pb-6">
                <Button variant="outline" className="border-2"
                  onClick={() => { setSelectedDate(null); setStartTime('09:00'); setEndTime('10:00'); setDescription(''); }}>
                  Clear
                </Button>
                <Button onClick={handleAddSlot}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all">
                  Add Slot
                </Button>
              </div>
            </Card>

            {/* Legend card */}
            <Card className="shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Status Legend</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(STATUS_COLORS).map(([key, { bg, solid, label }]) => (
                  <div key={key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="w-5 h-5 rounded-md shadow-sm"
                      style={{ background: bg }} />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Upcoming slots */}
            <Card className="shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-500" /> Upcoming Slots
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {upcomingEvents.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground font-medium">No upcoming slots</p>
                    </div>
                  ) : upcomingEvents.map((event, index) => {
                    const colors = STATUS_COLORS[event.status] || STATUS_COLORS.available;
                    return (
                      <motion.div key={event.id}
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group flex items-start justify-between p-3 rounded-lg border-2 hover:border-indigo-200 hover:bg-accent/50 transition-all">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-2.5 h-2.5 rounded-full flex-none"
                              style={{ backgroundColor: colors.solid }} />
                            <span className="text-sm font-semibold">
                              {format(event.start, 'MMM dd, yyyy')}
                            </span>
                          </div>
                          {event.status === 'booked' && event.candidateName && (
                            <div className="flex items-center gap-1 mb-1">
                              <User className="w-3 h-3 text-emerald-600" />
                              <p className="text-xs font-medium text-emerald-700">{event.candidateName}</p>
                            </div>
                          )}
                          {event.description &&
                            !event.description.startsWith('Interview:') &&
                            !event.description.startsWith('Panel Interview:') && (
                              <p className="text-sm font-medium mb-1 text-foreground">{event.description}</p>
                            )}
                          <p className="text-xs text-muted-foreground font-medium">
                            {format(event.start, 'HH:mm')} – {format(event.end, 'HH:mm')}
                          </p>
                          <Badge
                            className="mt-2 text-xs capitalize"
                            variant="outline"
                            style={{
                              borderColor: colors.solid + '40',
                              color: colors.solid,
                              backgroundColor: colors.solid + '10',
                            }}
                          >
                            {event.status}
                          </Badge>
                        </div>
                        {event.status === 'available' && (
                          <Button variant="ghost" size="sm"
                            onClick={() => handleDeleteSlot(event.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default AvailabilityPage;