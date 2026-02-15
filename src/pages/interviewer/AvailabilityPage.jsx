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
import { Plus, Clock, Trash2, Calendar as CalendarIcon, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
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

const AvailabilityPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [description, setDescription] = useState('');
  const [stats, setStats] = useState({ availableSlots: 0, bookedSlots: 0 });
  const [currentView, setCurrentView] = useState('week');

  useEffect(() => {
    loadAvailability();
    loadStats();
  }, []);

  const loadAvailability = async () => {
    try {
      setLoading(true);
      const data = await availabilityAPI.getMyAvailability();
      
      const formattedEvents = data.map(slot => ({
        id: slot.id,
        title: slot.description || (slot.status === 'BOOKED' ? 'Interview Scheduled' : 'Available'),
        start: new Date(slot.startDateTime),
        end: new Date(slot.endDateTime),
        status: slot.status.toLowerCase(),
        description: slot.description,
        interviewScheduleId: slot.interviewScheduleId
      }));
      
      setEvents(formattedEvents);
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
    
    // Check if selected date/time is in the past
    if (start < now) {
      toast({
        title: 'Cannot select past time',
        description: 'Please select a future date and time for availability',
        variant: 'destructive',
      });
      return;
    }

    setSelectedDate(start);

    if (start instanceof Date) {
      const isMonthViewClick = start.getHours() === 0 && start.getMinutes() === 0;
      
      let startDate = new Date(start);
      if (isMonthViewClick) {
        startDate.setHours(9, 0, 0, 0);
      }
      
      // Double check the adjusted time isn't in the past
      if (startDate < now) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        startDate = tomorrow;
      }
      
      const end = new Date(startDate.getTime() + 60 * 60 * 1000);
      setStartTime(format(startDate, 'HH:mm'));
      setEndTime(format(end, 'HH:mm'));

      toast({
        title: 'Time range selected',
        description: `${format(startDate, 'MMM dd, yyyy')} • ${format(startDate, 'HH:mm')} - ${format(end, 'HH:mm')}`,
      });
    }
  };

  const handleStartTimeChange = (newStartTime) => {
    setStartTime(newStartTime);
    
    const [startHour, startMin] = newStartTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    if (endMinutes - startMinutes < 60) {
      const newEndHour = Math.floor((startMinutes + 60) / 60);
      const newEndMin = (startMinutes + 60) % 60;
      
      if (newEndHour < 19) {
        setEndTime(`${newEndHour.toString().padStart(2, '0')}:${newEndMin.toString().padStart(2, '0')}`);
      }
    }
  };

  const handleEndTimeChange = (newEndTime) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = newEndTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    if (endMinutes - startMinutes >= 60) {
      setEndTime(newEndTime);
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
      toast({
        title: 'No date selected',
        description: 'Please select a date on the calendar first',
        variant: 'destructive',
      });
      return;
    }

    const baseDate = new Date(selectedDate);
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), startHour, startMin, 0, 0);
    const end = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), endHour, endMin, 0, 0);

    // Validate that the slot is not in the past
    const now = new Date();
    if (start < now) {
      toast({
        title: 'Cannot add past time slot',
        description: 'The selected time is in the past. Please choose a future date and time.',
        variant: 'destructive',
      });
      return;
    }

    // Validate that end time is after start time
    if (end <= start) {
      toast({
        title: 'Invalid time range',
        description: 'End time must be after start time',
        variant: 'destructive',
      });
      return;
    }

    try {
      const newSlot = await availabilityAPI.createAvailabilitySlot({
        startDateTime: start.toISOString(),
        endDateTime: end.toISOString(),
        description: description || null
      });

      const newEvent = {
        id: newSlot.id,
        title: newSlot.description || 'Available',
        start: new Date(newSlot.startDateTime),
        end: new Date(newSlot.endDateTime),
        status: newSlot.status.toLowerCase(),
        description: newSlot.description
      };

      setEvents([...events, newEvent]);
      setSelectedDate(null);
      setStartTime('09:00');
      setEndTime('10:00');
      setDescription('');

      await loadStats();

      toast({
        title: '✓ Time slot added',
        description: `${format(start, 'MMM dd, yyyy')} • ${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`,
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
      setEvents(events.filter(e => e.id !== eventId));
      await loadStats();
      
      toast({
        title: '✓ Time slot deleted',
        description: 'The availability slot has been removed',
      });
    } catch (error) {
      toast({
        title: 'Failed to delete slot',
        description: error.response?.data?.message || 'Cannot delete booked slots',
        variant: 'destructive',
      });
    }
  };

  const eventStyleGetter = (event) => {
    let backgroundColor = '#6366f1';
    let borderColor = '#4f46e5';
    
    if (event.status === 'booked') {
      backgroundColor = '#10b981';
      borderColor = '#059669';
    } else if (event.status === 'blocked') {
      backgroundColor = '#f59e0b';
      borderColor = '#d97706';
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.95,
        color: 'white',
        border: `2px solid ${borderColor}`,
        display: 'block',
        padding: '6px 10px',
        fontSize: '13px',
        fontWeight: '500',
        boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
      },
    };
  };

  const slotPropGetter = (date) => {
    const now = new Date();
    const isPast = date < now;
    
    if (isPast) {
      return {
        className: 'past-time-slot',
        style: {
          backgroundColor: 'rgba(0, 0, 0, 0.02)',
          cursor: 'not-allowed',
          pointerEvents: 'none',
        }
      };
    }
    
    return {};
  };

  const dayPropGetter = (date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const isPast = checkDate < today;
    
    if (isPast) {
      return {
        className: 'past-day',
        style: {
          backgroundColor: 'rgba(0, 0, 0, 0.02)',
          cursor: 'not-allowed',
        }
      };
    }
    
    return {};
  };

  const timeSlots = [];
  for (let hour = 7; hour < 19; hour++) {
    const time = `${hour.toString().padStart(2, '0')}:00`;
    timeSlots.push(time);
  }

  const upcomingEvents = events
    .filter(e => new Date(e.start) >= new Date())
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .slice(0, 5);

  return (
    <Layout>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">My Availability</h1>
            <p className="text-muted-foreground text-lg">
              Manage your interview availability calendar
            </p>
          </div>
         <Button
            className="
              gap-2
              px-6 py-3
              text-base font-semibold
              rounded-2xl
              shadow-md hover:shadow-xl
              transition-all duration-200
              hover:scale-105
              active:scale-95
            "
            onClick={() => {
              const today = new Date();
              setSelectedDate(today);
              setStartTime('09:00');
              setEndTime('10:00');
              setDescription('');
            }}
          >
            <Plus className="w-5 h-5" />
            Add Time Slot
          </Button>

        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="shadow-lg border-primary/20 hover:shadow-xl transition-shadow overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
              <CardContent className="pt-6 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Available Slots</p>
                    <p className="text-4xl font-bold text-primary mt-1">{stats.availableSlots}</p>
                  </div>
                  <div className="p-4 bg-primary/10 rounded-xl">
                    <CalendarIcon className="w-7 h-7 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="shadow-lg border-success/20 hover:shadow-xl transition-shadow overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-success/5 rounded-full -mr-16 -mt-16" />
              <CardContent className="pt-6 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Booked Slots</p>
                    <p className="text-4xl font-bold text-success mt-1">{stats.bookedSlots}</p>
                  </div>
                  <div className="p-4 bg-success/10 rounded-xl">
                    <Clock className="w-7 h-7 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="shadow-lg border-secondary/20 hover:shadow-xl transition-shadow overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full -mr-16 -mt-16" />
              <CardContent className="pt-6 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Hours</p>
                    <p className="text-4xl font-bold text-secondary mt-1">
                      {Math.round((stats.availableSlots + stats.bookedSlots) * 1.5)}
                    </p>
                  </div>
                  <div className="p-4 bg-secondary/10 rounded-xl">
                    <AlertCircle className="w-7 h-7 text-secondary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Calendar Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-3"
          >
            <Card className="shadow-xl border-t-4 border-t-primary/50">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <CalendarIcon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">Availability Calendar</CardTitle>
                      <CardDescription className="mt-1">
                        Click on a date to add availability slots. Green slots are already booked for interviews.
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-[700px] flex items-center justify-center"
                    >
                      <div className="text-center">
                        <div className="relative w-16 h-16 mx-auto mb-6">
                          <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                          <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin"></div>
                        </div>
                        <p className="text-muted-foreground text-lg font-medium">Loading calendar...</p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="calendar"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="availability-calendar-container bg-gradient-to-br from-background to-muted/20 rounded-xl p-6 border-2 shadow-inner"
                      style={{ height: '700px', display: 'flex', flexDirection: 'column' }}
                    >
                      <Calendar
                        localizer={localizer}
                        events={events}
                        startAccessor="start"
                        endAccessor="end"
                        onSelectSlot={handleSelectSlot}
                        onView={(view) => setCurrentView(view)}
                        selectable
                        eventPropGetter={eventStyleGetter}
                        slotPropGetter={slotPropGetter}
                        dayPropGetter={dayPropGetter}
                        style={{ height: '100%', flex: 1 }}
                        views={['month', 'week', 'day']}
                        defaultView="week"
                        step={60}
                        timeslots={1}
                        min={new Date(1970, 0, 1, 7, 0)}
                        max={new Date(1970, 0, 1, 19, 0)}
                        scrollToTime={new Date(1970, 0, 1, 8, 0)}
                        popup
                        showMultiDayTimes
                        formats={{
                          timeGutterFormat: 'HH:mm',
                          eventTimeRangeFormat: ({ start, end }) => 
                            `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`,
                          agendaTimeRangeFormat: ({ start, end }) => 
                            `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`,
                        }}
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
            className="space-y-6"
          >
            {/* Add Slot Card */}
            <Card className="shadow-lg border-t-4 border-t-primary hover:shadow-xl transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary" />
                  Add Availability Slot
                </CardTitle>
                <CardDescription>
                  Select time range when you're available
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 py-2">
                  <AnimatePresence>
                    {selectedDate && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border-2 border-primary/20"
                      >
                        <p className="text-sm font-semibold text-primary flex items-center gap-2">
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
                      className="border-2 focus:border-primary transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Start Time</Label>
                      <Select value={startTime} onValueChange={handleStartTimeChange}>
                        <SelectTrigger className="border-2">
                          <SelectValue placeholder="Start" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">End Time</Label>
                      <Select value={endTime} onValueChange={handleEndTimeChange}>
                        <SelectTrigger className="border-2">
                          <SelectValue placeholder="End" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
              <div className="flex justify-end gap-2 px-6 pb-6">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedDate(null);
                    setStartTime('09:00');
                    setEndTime('10:00');
                    setDescription('');
                  }}
                  className="border-2"
                >
                  Clear
                </Button>
                <Button 
                  onClick={handleAddSlot} 
                  className="shadow-md hover:shadow-lg transition-all"
                >
                  Add Slot
                </Button>
              </div>
            </Card>

            {/* Legend Card */}
            <Card className="shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Status Legend</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="w-5 h-5 rounded-md shadow-sm" style={{ backgroundColor: '#6366f1' }}></div>
                  <span className="text-sm font-medium">Available Slots</span>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="w-5 h-5 rounded-md shadow-sm" style={{ backgroundColor: '#10b981' }}></div>
                  <span className="text-sm font-medium">Booked Slots</span>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="w-5 h-5 rounded-md shadow-sm" style={{ backgroundColor: '#f59e0b' }}></div>
                  <span className="text-sm font-medium">Blocked Slots</span>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Slots Card */}
            <Card className="shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Upcoming Slots
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {upcomingEvents.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
                        <Clock className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground font-medium">
                        No upcoming slots
                      </p>
                    </div>
                  ) : (
                    upcomingEvents.map((event, index) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group flex items-start justify-between p-3 rounded-lg border-2 hover:border-primary/50 hover:bg-accent/50 transition-all"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-semibold">
                              {format(event.start, 'MMM dd, yyyy')}
                            </span>
                          </div>
                          {event.description && (
                            <p className="text-sm font-medium mb-2 text-foreground">{event.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground font-medium">
                            {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                          </p>
                          <Badge
                            className={`mt-2 text-xs ${
                              event.status === 'available'
                                ? 'bg-primary/10 text-primary border-primary/20'
                                : event.status === 'booked'
                                ? 'bg-success/10 text-success border-success/20'
                                : 'bg-warning/10 text-warning border-warning/20'
                            }`}
                            variant="outline"
                          >
                            {event.status}
                          </Badge>
                        </div>
                        {event.status === 'available' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSlot(event.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </motion.div>
                    ))
                  )}
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