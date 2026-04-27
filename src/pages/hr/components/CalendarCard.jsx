// src/pages/hr/components/CalendarCard.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon } from 'lucide-react';
import { CALENDAR_MIN_HOUR, CALENDAR_MAX_HOUR } from './../utils/availabilityUtils';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../AvailabilityCalendar.css';

const localizer = dateFnsLocalizer({
  format, parse, startOfWeek, getDay, locales: { 'en-US': enUS },
});

const CalendarCard = ({
  loading,
  events,
  calendarDate,
  onNavigate,
  onSelectEvent,
  eventPropGetter,
  dayPropGetter,
  slotPropGetter,
  CalendarEventComponent,
  panelMode,
  calendarLockStart,
  tooltipAccessor,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5" /> Availability Calendar
          {panelMode && <Badge className="ml-2 bg-sky-100 text-sky-800 border-sky-300">Panel Mode</Badge>}
        </CardTitle>
        <CardDescription>
          {panelMode
            ? 'Click AVAILABLE slots to build a panel — selected slots show a ✓ badge. Overlap window is calculated automatically.'
            : 'Each color = a different interviewer. Click AVAILABLE to schedule · Click BOOKED (green) to cancel & restore.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="h-[720px] flex items-center justify-center">
              <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-6">
                  <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
                  <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin" />
                </div>
                <p className="text-muted-foreground text-lg font-medium">Loading availability…</p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="availability-calendar-container hr-calendar"
              style={{ height: '720px' }}>
              <Calendar
                localizer={localizer}
                events={events}
                date={calendarDate}
                onNavigate={onNavigate}
                startAccessor="start"
                endAccessor="end"
                scrollToTime={calendarLockStart ? calendarLockStart : new Date(1970, 0, 1, CALENDAR_MIN_HOUR, 0)}
                onSelectEvent={onSelectEvent}
                eventPropGetter={eventPropGetter}
                dayPropGetter={dayPropGetter}
                slotPropGetter={slotPropGetter}
                components={{ event: CalendarEventComponent }}
                style={{ height: '100%' }}
                views={['month', 'week', 'day']}
                defaultView="week"
                step={60}
                timeslots={1}
                min={new Date(1970, 0, 1, CALENDAR_MIN_HOUR, 0)}
                max={new Date(1970, 0, 1, CALENDAR_MAX_HOUR, 0)}
                tooltipAccessor={tooltipAccessor}
                popup
                showMultiDayTimes
                formats={{
                  timeGutterFormat: 'HH:mm',
                  eventTimeRangeFormat: ({ start, end }) =>
                    `${format(start, 'HH:mm')}–${format(end, 'HH:mm')}`,
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default CalendarCard;
